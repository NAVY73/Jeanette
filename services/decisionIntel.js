// services/decisionIntel.js
// Phase 5: Centralised rules evaluation for "can this booking be approved?" pre-checks.
//
// This implementation matches your current architecture:
// - JSON files via readJson('file.json', default)
// - No dependency on a non-existent utils/dataStore module

const path = require("path");
const fs = require("fs");

// ---- JSON helpers (mirrors the pattern used in routes/booking.js) ----
function dataPath(fileName) {
  // services/ -> project root -> data/
  return path.join(__dirname, "..", "data", fileName);
}

function readJson(fileName, defaultValue) {
  try {
    const p = dataPath(fileName);
    if (!fs.existsSync(p)) return defaultValue;
    const raw = fs.readFileSync(p, "utf8");
    if (!raw || !raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`readJson failed for ${fileName}:`, e.message);
    return defaultValue;
  }
}

// ---- Rule helpers ----
function datesOverlap(aStart, aEnd, bStart, bEnd) {
  // Treat as inclusive start, exclusive end (common booking logic)
  const aS = new Date(aStart);
  const aE = new Date(aEnd);
  const bS = new Date(bStart);
  const bE = new Date(bEnd);
  return aS < bE && bS < aE;
}

function ruleResult({ code, message, severity = "blocker", meta = {} }) {
  return { code, message, severity, meta };
}

function classifyReasons(blockingReasons) {
  if (blockingReasons.some(r => r.code === "OVERLAP_BOOKING")) return "TEMPORARY";
  if (blockingReasons.some(r => r.code === "MOORING_TOO_SHORT")) return "STRUCTURAL";
  if (blockingReasons.some(r => r.code === "DRAFT_TOO_DEEP")) return "STRUCTURAL";
  if (blockingReasons.some(r => r.code === "BOOKING_ALREADY_DECIDED")) return "TEMPORARY";
  return blockingReasons.length ? "UNKNOWN" : "NONE";
}

function toNumberOrNaN(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// Try a few likely field names without forcing schema changes
function pickNumber(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const n = toNumberOrNaN(obj[k]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return NaN;
}

// ---- Main evaluator ----
async function evaluateDecisionIntel(bookingId) {
  const bookings = readJson("bookings.json", []);
  const owners = readJson("owners.json", []);
  const vessels = readJson("vessels.json", []);
  const marinas = readJson("marinas.json", []);
  const moorings = readJson("moorings.json", []);

  const booking = bookings.find(b => Number(b.id) === Number(bookingId));
  if (!booking) {
    return { found: false, message: "Booking not found", bookingId: Number(bookingId) };
  }

  const owner = owners.find(o => Number(o.id) === Number(booking.ownerId)) || null;
  const vessel = vessels.find(v => Number(v.id) === Number(booking.vesselId)) || null;
  const marina = marinas.find(m => Number(m.id) === Number(booking.marinaId)) || null;
  const mooring = moorings.find(m => Number(m.id) === Number(booking.mooringId)) || null;

  const blockingReasons = [];
  const warnings = [];

  // Defensive checks
  if (!vessel) blockingReasons.push(ruleResult({ code: "MISSING_VESSEL", message: "Vessel record not found for this booking." }));
  if (!mooring) blockingReasons.push(ruleResult({ code: "MISSING_MOORING", message: "Mooring record not found for this booking." }));
  if (!owner) warnings.push(ruleResult({ code: "MISSING_OWNER", message: "Owner record not found for this booking.", severity: "warning" }));
  if (!marina) warnings.push(ruleResult({ code: "MISSING_MARINA", message: "Marina record not found for this booking.", severity: "warning" }));

  // If missing critical dependencies, return early
  if (blockingReasons.length) {
    return {
      found: true,
      approvable: false,
      classification: classifyReasons(blockingReasons),
      booking,
      context: { owner, vessel, marina, mooring },
      blockingReasons,
      warnings
    };
  }

  // RULE 1: Already decided
  if (booking.status === "approved" || booking.status === "declined") {
    blockingReasons.push(
      ruleResult({
        code: "BOOKING_ALREADY_DECIDED",
        message: `Booking is already ${booking.status}.`,
        meta: { status: booking.status }
      })
    );
  }

  // RULE 2: Overlapping approved bookings on the same mooring
  const overlaps = bookings.filter(b => {
    if (Number(b.id) === Number(booking.id)) return false;
    if (Number(b.mooringId) !== Number(booking.mooringId)) return false;
    if (b.status !== "approved") return false;
    return datesOverlap(booking.startDate, booking.endDate, b.startDate, b.endDate);
  });

  if (overlaps.length) {
    blockingReasons.push(
      ruleResult({
        code: "OVERLAP_BOOKING",
        message: "Mooring is not available for the requested dates (overlaps an approved booking).",
        meta: { overlapBookingIds: overlaps.map(o => o.id) }
      })
    );
  }

  // RULE 3: Vessel length vs mooring max length (tolerant schema)
  const vesselLength = pickNumber(vessel, ["lengthM", "length", "lengthMetres", "lengthMeters"]);
  const mooringMaxLength = pickNumber(mooring, ["maxLengthM", "maxLength", "maxVesselLengthM", "maxVesselLength"]);

  if (!Number.isNaN(vesselLength) && !Number.isNaN(mooringMaxLength)) {
    if (vesselLength > mooringMaxLength) {
      blockingReasons.push(
        ruleResult({
          code: "MOORING_TOO_SHORT",
          message: `Vessel length (${vesselLength}m) exceeds mooring maximum (${mooringMaxLength}m).`,
          meta: { vesselLength, mooringMaxLength }
        })
      );
    }
  } else {
    warnings.push(
      ruleResult({
        code: "LENGTH_RULE_SKIPPED",
        message: "Length suitability could not be evaluated (missing vessel length or mooring max length).",
        severity: "warning"
      })
    );
  }

  // RULE 4: Draft vs depth (tolerant schema)
  const vesselDraft = pickNumber(vessel, ["draftM", "draft", "draftMetres", "draftMeters"]);
  const mooringDepth = pickNumber(mooring, ["depthM", "depth", "minDepthM", "minDepth"]);

  if (!Number.isNaN(vesselDraft) && !Number.isNaN(mooringDepth)) {
    if (vesselDraft > mooringDepth) {
      blockingReasons.push(
        ruleResult({
          code: "DRAFT_TOO_DEEP",
          message: `Vessel draft (${vesselDraft}m) exceeds mooring depth (${mooringDepth}m).`,
          meta: { vesselDraft, mooringDepth }
        })
      );
    }
  } else {
    warnings.push(
      ruleResult({
        code: "DRAFT_RULE_SKIPPED",
        message: "Draft suitability could not be evaluated (missing vessel draft or mooring depth).",
        severity: "warning"
      })
    );
  }

  // RULE 5: Compliance will be wired to your existing application-pack compliance next step
  warnings.push(
    ruleResult({
      code: "COMPLIANCE_INTEL_PENDING",
      message: "Compliance decision intelligence will be connected in the next step (Phase 5).",
      severity: "warning"
    })
  );

  const approvable = blockingReasons.length === 0;
  const classification = approvable ? "NONE" : classifyReasons(blockingReasons);

  return {
    found: true,
    approvable,
    classification,
    booking,
    context: { owner, vessel, marina, mooring },
    blockingReasons,
    warnings
  };
}

module.exports = { evaluateDecisionIntel };
