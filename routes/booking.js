console.log('*** RUNNING routes/booking.js (INBOX SHOULD WORK) ***');
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../lib/auth');
const {
  checkSuitability,
  findApprovedConflicts,
  findAlternatives,
} = require('../rules/availability');

// Load data from JSON files (for now)
const bookings = require('../data/bookings.json');
const owners   = require('../data/owners.json');
const vessels  = require('../data/vessels.json');
const marinas  = require('../data/marinas.json');
const moorings = require('../data/moorings.json');

const fs = require('fs');
const path = require('path');

const BOOKINGS_PATH = path.join(__dirname, '..', 'data', 'bookings.json');

function saveBookingsToDisk() {
  try {
    fs.writeFileSync(BOOKINGS_PATH, JSON.stringify(bookings, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist bookings:', err);
  }
}

// ===============================
// Phase 2: Compliance Gate Helpers
// ===============================

function parseDateYmd(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getTodayUtcMidnight() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function computeDocCompliance(doc, rule, todayUtc) {
  const issues = [];
  const expiry = parseDateYmd(doc.expiryDate);

  if (!expiry) {
    return {
      state: 'missing',
      issues: [{ code: 'NO_EXPIRY_DATE', message: 'Document expiryDate is missing/invalid.' }]
    };
  }

  const graceDays = Number(rule.expiryGraceDays || 0);
  const expSoonDays = Number(rule.expiringSoonDays || 30);

  const expiryWithGrace = new Date(expiry.getTime() + graceDays * 24 * 60 * 60 * 1000);
  if (expiryWithGrace < todayUtc) {
    return { state: 'expired', issues: [{ code: 'EXPIRED', message: 'Document is expired.' }] };
  }

  const daysLeft = daysBetween(todayUtc, expiry);
  if (daysLeft >= 0 && daysLeft <= expSoonDays) {
    issues.push({ code: 'EXPIRING_SOON', message: `Document expires in ${daysLeft} day(s).` });
    return { state: 'expiring_soon', issues };
  }

  if (rule.type === 'INSURANCE' && rule.minCoverageNZD) {
    const amount = Number(doc.coverageAmountNZD || 0);
    if (amount < Number(rule.minCoverageNZD)) {
      return {
        state: 'invalid',
        issues: [{
          code: 'INSURANCE_MIN_COVER',
          message: `Insurance cover must be at least ${rule.minCoverageNZD}.`
        }]
      };
    }
  }

  return { state: 'valid', issues };
}

function evaluateComplianceForBooking({ marinaId, vessel }) {
  const requirementsAll = readJson('marinaRequirements.json', []);
  const docs = readJson('vesselDocuments.json', []);
  const requirements = requirementsAll.find(r => Number(r.marinaId) === Number(marinaId)) || null;

  const todayUtc = getTodayUtcMidnight();
  const blockingIssues = [];
  const warnings = [];
  const evaluatedDocuments = [];

  if (!requirements || !Array.isArray(requirements.requiredDocuments)) {
    // If a marina has no config, we treat it as "no compliance rules" in prototype.
    return {
      eligibleToBook: true,
      blockingIssues: [],
      warnings: [],
      requirements: null,
      evaluatedDocuments: []
    };
  }

  for (const rule of requirements.requiredDocuments) {
    // Conditional rule (e.g. shore power test only if vessel has shore power)
    if (rule.appliesWhen && typeof rule.appliesWhen.hasShorePower === 'boolean') {
      const vHas = Boolean(vessel && vessel.hasShorePower);
      if (vHas !== Boolean(rule.appliesWhen.hasShorePower)) {
        continue;
      }
    }

    const found = docs
      .filter(d => d && d.type === rule.type)
      .sort((a, b) => String(b.expiryDate).localeCompare(String(a.expiryDate)))[0];

    if (!found) {
      if (rule.required) {
        blockingIssues.push({
          code: 'MISSING_DOCUMENT',
          type: rule.type,
          message: `${rule.type} is required but missing.`
        });
      }
      evaluatedDocuments.push({ type: rule.type, document: null, compliance: { state: 'missing', issues: [] } });
      continue;
    }

    const compliance = computeDocCompliance(found, rule, todayUtc);
    evaluatedDocuments.push({ type: rule.type, document: found, compliance });

    if (rule.required && (compliance.state === 'missing' || compliance.state === 'expired' || compliance.state === 'invalid')) {
      blockingIssues.push({
        code: 'NON_COMPLIANT',
        type: rule.type,
        message: `${rule.type} is not compliant (${compliance.state}).`
      });
    }

    if (compliance.state === 'expiring_soon') {
      warnings.push({
        code: 'EXPIRING_SOON',
        type: rule.type,
        message: compliance.issues[0]?.message || `${rule.type} expiring soon.`
      });
    }
  }

  return {
    eligibleToBook: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    requirements,
    evaluatedDocuments
  };
}


// ===============================
// Phase 2: Booking Application Pack
// GET /api/bookings/:id/application-pack
// ===============================
const { readJson } = require('../utils/jsonStore');

function parseDateYmd(ymd) {
  // ymd: "YYYY-MM-DD"
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function computeDocCompliance(doc, rule, todayUtc) {
  const issues = [];
  const expiry = parseDateYmd(doc.expiryDate);

  if (!expiry) {
    return {
      state: 'missing',
      issues: [{ code: 'NO_EXPIRY_DATE', message: 'Document expiryDate is missing/invalid.' }]
    };
  }

  const graceDays = Number(rule.expiryGraceDays || 0);
  const expSoonDays = Number(rule.expiringSoonDays || 30);

  // expired if expiry + grace < today
  const expiryWithGrace = new Date(expiry.getTime() + graceDays * 24 * 60 * 60 * 1000);
  if (expiryWithGrace < todayUtc) {
    return { state: 'expired', issues: [{ code: 'EXPIRED', message: 'Document is expired.' }] };
  }

  const daysLeft = daysBetween(todayUtc, expiry);
  if (daysLeft >= 0 && daysLeft <= expSoonDays) {
    issues.push({ code: 'EXPIRING_SOON', message: `Document expires in ${daysLeft} day(s).` });
    return { state: 'expiring_soon', issues };
  }

  // Insurance minimum coverage
  if (rule.type === 'INSURANCE' && rule.minCoverageNZD) {
    const amount = Number(doc.coverageAmountNZD || 0);
    if (amount < Number(rule.minCoverageNZD)) {
      return {
        state: 'invalid',
        issues: [{
          code: 'INSURANCE_MIN_COVER',
          message: `Insurance cover must be at least ${rule.minCoverageNZD}.`
        }]
      };
    }
  }

  return { state: 'valid', issues };
}

function getTodayUtcMidnight() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Booking Application Pack
 * - booking: from data/bookings.json
 * - owner: from data/ownerProfile.json (single owner profile MVP)
 * - vessel: from data/vesselProfile.json (single vessel profile MVP)
 * - documents: from data/vesselDocuments.json
 * - marinaRequirements: from data/marinaRequirements.json (by booking.marinaId)
 */
function buildApplicationPack(booking) {
  const owner = readJson('ownerProfile.json', null);
  const vessel = readJson('vesselProfile.json', null);
  const docs = readJson('vesselDocuments.json', []);
  const requirementsAll = readJson('marinaRequirements.json', []);

  const marinaId = Number(booking.marinaId || 0);
  const requirements = requirementsAll.find(r => Number(r.marinaId) === marinaId) || null;

  const todayUtc = getTodayUtcMidnight();

  const evaluatedDocuments = [];
  const blockingIssues = [];
  const warnings = [];

  if (requirements && Array.isArray(requirements.requiredDocuments)) {
    for (const rule of requirements.requiredDocuments) {
      // appliesWhen (e.g. only when hasShorePower = true)
      if (rule.appliesWhen && typeof rule.appliesWhen.hasShorePower === 'boolean') {
        const vHas = Boolean(vessel && vessel.hasShorePower);
        if (vHas !== Boolean(rule.appliesWhen.hasShorePower)) {
          continue; // rule does not apply
        }
      }

      const found = docs
        .filter(d => d && d.type === rule.type)
        .sort((a, b) => String(b.expiryDate).localeCompare(String(a.expiryDate)))[0];

      if (!found) {
        if (rule.required) {
          blockingIssues.push({
            code: 'MISSING_DOCUMENT',
            type: rule.type,
            message: `${rule.type} is required but missing.`
          });
        }
        evaluatedDocuments.push({ type: rule.type, document: null, compliance: { state: 'missing', issues: [] } });
        continue;
      }

      const compliance = computeDocCompliance(found, rule, todayUtc);
      evaluatedDocuments.push({ type: rule.type, document: found, compliance });

      if (rule.required && (compliance.state === 'missing' || compliance.state === 'expired' || compliance.state === 'invalid')) {
        blockingIssues.push({
          code: 'NON_COMPLIANT',
          type: rule.type,
          message: `${rule.type} is not compliant (${compliance.state}).`
        });
      }

      if (compliance.state === 'expiring_soon') {
        warnings.push({
          code: 'EXPIRING_SOON',
          type: rule.type,
          message: compliance.issues[0]?.message || `${rule.type} expiring soon.`
        });
      }
    }
  }

  return {
    booking,
    owner,
    vessel,
    marinaRequirements: requirements,
    documents: evaluatedDocuments,
    complianceSummary: {
      eligibleToBook: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      computedAt: new Date().toISOString()
    }
  };
}

// IMPORTANT: this route must appear BEFORE router.get('/:id') if that exists in your file
// (because '/:id' would otherwise catch '/:id/application-pack').
// ===============================
// Phase 5: Decision Intelligence (for Application Pack)
// ===============================
function computeDecisionIntelForBooking(booking, allBookings) {
  // Use the same data sets already loaded at top of file: vessels, moorings
  const vessel = vessels.find(v => Number(v.id) === Number(booking.vesselId));
  const mooring = moorings.find(m => Number(m.id) === Number(booking.mooringId));

  if (!vessel) {
    return { status: "UNKNOWN", reasons: ["Booking has invalid vesselId (cannot evaluate)."] };
  }
  if (!mooring) {
    return { status: "UNKNOWN", reasons: ["Booking has invalid mooringId (cannot evaluate)."] };
  }

  const start = parseDate(booking.startDate);
  const end = parseDate(booking.endDate);
  if (!start || !end) {
    return { status: "UNKNOWN", reasons: ["Booking has invalid startDate/endDate (cannot evaluate)."] };
  }

  // 1) Structural suitability (hard constraint)
  const suitability = checkSuitability({ vessel, mooring });
  if (!suitability.passed) {
    const reasons = Array.isArray(suitability.reasons) ? suitability.reasons : ["Not suitable."];
    return {
      status: "STRUCTURALLY_UNSUITABLE",
      reasons
    };
  }

  // 2) Temporary availability (approved overlaps)
  const conflicts = findApprovedConflicts({
    bookings: allBookings,
    mooringId: booking.mooringId,
    startDate: start,
    endDate: end,
    excludeBookingId: booking.id,
  });

  if (conflicts.length > 0) {
    const ids = conflicts.map(b => b.id).join(", ");
    const reasons = [
      `Overlaps approved booking(s): ${ids}`,
      ...conflicts.map(b => `Conflict booking ${b.id}: ${b.startDate} to ${b.endDate}`)
    ];

    return {
      status: "TEMP_UNAVAILABLE",
      reasons
    };
  }

  // If we pass suitability + approved-conflicts, we are approvable.
  return {
    status: "APPROVABLE",
    reasons: ["Suitable and no approved booking conflicts for requested dates."]
  };
}

// IMPORTANT: this route must appear BEFORE router.get('/:id') if that exists in your file
router.get('/:id/application-pack', requireAuth, requireRole(['marina_operator', 'admin']), (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);

    // Use disk-backed bookings (readJson) so Application Pack reflects persisted data
    const allBookings = readJson('bookings.json', []);
    const booking = allBookings.find(b => Number(b.id) === bookingId);

    if (!booking) {
      return res.status(404).json({ error: `Booking ${bookingId} not found` });
    }

    const pack = buildApplicationPack(booking);

    // Attach Phase 5 Decision Intelligence
    pack.decisionIntel = computeDecisionIntelForBooking(booking, allBookings);

    return res.json(pack);
  } catch (err) {
    next(err);
  }
});

// Helper: parse a date string safely
function parseDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// Helper: check if two date ranges overlap (inclusive)
function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

// GET /api/bookings – list all bookings
router.get('/', (req, res) => {
  res.json({
    message: 'BoatiesMate – Bookings list (from JSON data)',
    bookings
  });
});

// Inbox with filters + sorting
router.get('/inbox', requireAuth, requireRole('marina_operator'), (req, res) => {
  const { status = 'pending', from, to, mooringId, ownerId, vesselId, sort = 'startDate', dir = 'asc', limit = '50' } = req.query;

  // enforce marina scope
  const operatorMarinaId = req.user?.marinaId;
  if (!operatorMarinaId) {
    return res.status(403).json({ error: 'Operator is not scoped to a marina' });
  }

  // validate status
  const allowedStatuses = new Set(['pending', 'approved', 'declined', 'all']);
  if (!allowedStatuses.has(String(status))) {
    return res.status(400).json({ error: "Invalid status. Use pending, approved, declined, or all." });
  }

  // date parsing helpers (YYYY-MM-DD)
  const parseYMD = (s) => {
    if (!s) return null;
    // Treat as UTC midnight to avoid local timezone drift
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const fromDate = parseYMD(from);
  const toDate = parseYMD(to);
  if ((from && !fromDate) || (to && !toDate)) {
    return res.status(400).json({ error: "Invalid date. Use YYYY-MM-DD for from/to." });
  }

  // limit
  let lim = parseInt(limit, 10);
  if (Number.isNaN(lim) || lim <= 0) lim = 50;
  if (lim > 200) lim = 200;

  // sort + dir
  const sortKey = String(sort) === 'created' ? 'createdAt' : 'startDate';
  const direction = String(dir).toLowerCase() === 'desc' ? 'desc' : 'asc';

  // IMPORTANT: ensure we're using the same in-memory store you already have
  // Use existing in-memory JSON store
// NOTE: this shadows the top-level `bookings` const intentionally to keep the route self-contained.

  // filter
  let results = bookings.filter((b) => {
    // marina scope
    if (String(b.marinaId) !== String(operatorMarinaId)) return false;

    // status
    if (status !== 'all' && String(b.status) !== String(status)) return false;

    // id filters
    if (mooringId && String(b.mooringId) !== String(mooringId)) return false;
    if (ownerId && String(b.ownerId) !== String(ownerId)) return false;
    if (vesselId && String(b.vesselId) !== String(vesselId)) return false;

    // date range filter (based on booking startDate)
    if (fromDate || toDate) {
      const bStart = new Date(b.startDate);
      if (Number.isNaN(bStart.getTime())) return false;

      if (fromDate && bStart < fromDate) return false;

      // toDate is inclusive; compare to end-of-day
      if (toDate) {
        const endOfTo = new Date(toDate);
        endOfTo.setUTCHours(23, 59, 59, 999);
        if (bStart > endOfTo) return false;
      }
    }

    return true;
  });

  // sort
  results.sort((a, b) => {
    const av = a?.[sortKey];
    const bv = b?.[sortKey];

    const ad = new Date(av);
    const bd = new Date(bv);

    // Fallback if invalid dates
    const aVal = Number.isNaN(ad.getTime()) ? 0 : ad.getTime();
    const bVal = Number.isNaN(bd.getTime()) ? 0 : bd.getTime();

    if (aVal === bVal) return 0;
    const cmp = aVal < bVal ? -1 : 1;
    return direction === 'desc' ? -cmp : cmp;
  });

  // limit
  results = results.slice(0, lim);

  return res.json({
    count: results.length,
    results,
    meta: {
      status,
      from: from || null,
      to: to || null,
      mooringId: mooringId || null,
      ownerId: ownerId || null,
      vesselId: vesselId || null,
      sort: sortKey === 'createdAt' ? 'created' : 'startDate',
      dir: direction,
      limit: lim,
      marinaId: operatorMarinaId
    }
  });
});

// GET /api/bookings/:id – get a single booking by id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  res.json({
    message: 'BoatiesMate – Booking detail',
    booking
  });
});

// POST /api/bookings – create a new booking (in-memory only for now)
router.post('/', (req, res) => {
  const { ownerId, vesselId, mooringId, startDate, endDate, notes } = req.body;

  if (!ownerId || !vesselId || !mooringId || !startDate || !endDate) {
    return res.status(400).json({
      error: 'ownerId, vesselId, mooringId, startDate and endDate are required'
    });
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return res.status(400).json({
      error: 'startDate and endDate must be valid dates in YYYY-MM-DD format'
    });
  }

  if (end < start) {
    return res.status(400).json({ error: 'endDate cannot be before startDate' });
  }

  const owner = owners.find(o => o.id === ownerId);
  const vessel = vessels.find(v => v.id === vesselId);
  const mooring = moorings.find(m => m.id === mooringId);

  if (!owner) return res.status(400).json({ error: 'Invalid ownerId' });
  if (!vessel) return res.status(400).json({ error: 'Invalid vesselId' });
  if (!mooring) return res.status(400).json({ error: 'Invalid mooringId' });
  // ===============================
  // Phase 2: Compliance Gate (blocks booking creation if non-compliant)
  // ===============================

  // Determine marinaId for this booking (prefer the mooring's marinaId if present)
  const marinaIdForCompliance = Number(mooring.marinaId || req.body.marinaId || 0);

  const compliance = evaluateComplianceForBooking({ marinaId: marinaIdForCompliance, vessel });
  

  if (!compliance.eligibleToBook) {
    return res.status(400).json({
      error: 'COMPLIANCE_NOT_ELIGIBLE',
      message: 'Booking cannot be created because required compliance documents are missing, expired, or invalid.',
      blockingIssues: compliance.blockingIssues,
      warnings: compliance.warnings
    });
  }

  // Suitability (MVP): LOA must fit within mooring maxLoaMeters (if configured)
  const suitability = checkSuitability({ vessel, mooring });
  if (!suitability.passed) {
    const alternatives = (mooring.marinaId != null)
      ? findAlternatives({
          moorings,
          bookings,
          vessel,
          marinaId: mooring.marinaId,
          startDate: start,
          endDate: end,
          preferredMooringType: mooring.type,
          limit: 10,
        })
      : [];

    return res.status(422).json({
      error: 'Booking is not suitable for the selected mooring',
      reasons: suitability.reasons,
      alternatives,
    });
  }

  const marinaId = mooring.marinaId ?? null;

  // Validate marina reference (if present)
  if (marinaId !== null) {
    const marina = marinas.find(m => m.id === marinaId);
    if (!marina) return res.status(400).json({ error: 'Mooring references an unknown marina' });
  }

  // Conflict check (current behaviour): prevent overlap with pending OR approved
  const conflictingBookings = bookings.filter(b => {
    if (b.mooringId !== mooringId) return false;
    if (!['approved'].includes(b.status)) return false;

    const existingStart = parseDate(b.startDate);
    const existingEnd = parseDate(b.endDate);

    // If an existing booking has invalid dates, treat it as conflicting (safe default)
    if (!existingStart || !existingEnd) return true;

    return rangesOverlap(start, end, existingStart, existingEnd);
  });

  if (conflictingBookings.length > 0) {
    return res.status(409).json({
      error: 'Requested dates are not available for this mooring',
      mooringId,
      requested: { startDate, endDate },
      conflictsWith: conflictingBookings.map(b => ({
        id: b.id,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status
      })),
      alternatives: (marinaId != null)
      ? findAlternatives({
          moorings,
          bookings,
          vessel,
          marinaId,
          startDate: start,
          endDate: end,
          preferredMooringType: mooring.type,
          excludeMooringId: mooringId,
          blockStatuses: ['pending', 'approved'],
          limit: 10,
        })
      : [],
    
    });
  }

  const newId = bookings.length > 0 ? Math.max(...bookings.map(b => b.id)) + 1 : 1;

  const newBooking = {
    id: newId,
    ownerId,
    vesselId,
    mooringId,
    marinaId,
    startDate,
    endDate,
    status: 'pending',
    notes: notes || '',
  };

  bookings.push(newBooking);
  saveBookingsToDisk();

  return res.status(201).json({
    message: 'BoatiesMate – Booking created',
    booking: newBooking
  });

});

// POST /api/bookings/:id/approve – marina-scoped
router.post(
  '/:id/approve',
  requireAuth,
  requireRole(['marina_operator', 'admin']),
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    const booking = bookings.find(b => b.id === id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // Prevent double-processing
    if (booking.status === 'approved') {
      return res.status(409).json({ error: 'Booking is already approved' });
    }
    if (booking.status === 'declined') {
      return res.status(409).json({ error: 'Booking is declined and cannot be approved' });
    }
    
    if (req.user.role === 'marina_operator') {
      if (booking.marinaId == null) {
        return res.status(403).json({ error: 'Forbidden: private bookings cannot be approved by marina operators' });
      }
      if (Number(booking.marinaId) !== Number(req.user.marinaId)) {
        return res.status(403).json({ error: 'Forbidden: booking is not for your marina' });
      }
    }
    

    const { reason } = req.body || {};
        // Hard gate: suitability + approved-conflicts must pass at approval time
        const vessel = vessels.find(v => v.id === booking.vesselId);
        const mooring = moorings.find(m => m.id === booking.mooringId);
    
        if (!vessel) return res.status(400).json({ error: 'Booking has invalid vesselId' });
        if (!mooring) return res.status(400).json({ error: 'Booking has invalid mooringId' });
    
        const start = parseDate(booking.startDate);
        const end = parseDate(booking.endDate);
        if (!start || !end) return res.status(400).json({ error: 'Booking has invalid startDate/endDate' });
    
        const suitability = checkSuitability({ vessel, mooring });
        if (!suitability.passed) {
          const alternatives = (booking.marinaId != null)
            ? findAlternatives({
                moorings,
                bookings,
                vessel,
                marinaId: booking.marinaId,
                startDate: start,
                endDate: end,
                preferredMooringType: mooring.type,
                limit: 10,
              })
            : [];
    
          return res.status(422).json({
            error: 'Cannot approve: mooring is not suitable for this vessel',
            reasons: suitability.reasons,
            alternatives,
          });
        }
    
        const conflicts = findApprovedConflicts({
          bookings,
          mooringId: booking.mooringId,
          startDate: start,
          endDate: end,
          excludeBookingId: booking.id,
        });
    
        if (conflicts.length > 0) {
          const alternatives = (booking.marinaId != null)
            ? findAlternatives({
                moorings,
                bookings,
                vessel,
                marinaId: booking.marinaId,
                startDate: start,
                endDate: end,
                preferredMooringType: mooring.type,
                limit: 10,
              })
            : [];
    
          return res.status(409).json({
            error: 'Cannot approve: mooring is not available for the requested dates',
            conflictsWith: conflicts.map(b => ({
              id: b.id,
              startDate: b.startDate,
              endDate: b.endDate,
              status: b.status,
            })),
            alternatives,
          });
        }
    
    // audit trail
booking.status = 'approved';
booking.approvedAt = new Date().toISOString();
booking.declinedAt = null;
booking.declineReason = "";
booking.decisionByUserId = req.user.id;
booking.decisionType = 'approved';
    res.json({
      message: 'BoatiesMate – Booking approved',
      approvedBy: req.user,
      booking
    });
  }
);

// POST /api/bookings/:id/decline – marina-scoped
router.post(
  '/:id/decline',
  requireAuth,
  requireRole(['marina_operator', 'admin']),
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    const booking = bookings.find(b => b.id === id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
// Prevent double-processing
if (booking.status === 'declined') {
  return res.status(409).json({ error: 'Booking is already declined' });
}
if (booking.status === 'approved') {
  return res.status(409).json({ error: 'Booking is approved and cannot be declined' });
}

    if (req.user.role === 'marina_operator') {
      if (booking.marinaId == null) {
        return res.status(403).json({ error: 'Forbidden: private bookings cannot be declined by marina operators' });
      }
      if (Number(booking.marinaId) !== Number(req.user.marinaId)) {
        return res.status(403).json({ error: 'Forbidden: booking is not for your marina' });
      }
    }



    const { reason } = req.body || {};

    // audit trail
    booking.status = 'declined';
    booking.declinedAt = new Date().toISOString();
    booking.approvedAt = null;
    booking.decisionByUserId = req.user.id;
    booking.decisionType = 'declined';
    // optional: keep the decline reason without decisionNotes
    if (reason && String(reason).trim()) {
      booking.declineReason = String(reason || "").trim();
    }
    
      saveBookingsToDisk();

    res.json({
      message: 'BoatiesMate – Booking declined',
      declinedBy: req.user,
      booking
    });
    }
  );

module.exports = router;
