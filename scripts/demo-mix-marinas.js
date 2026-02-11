/**
 * BoatiesMate — Demo Marina Mix Script
 * Goal: Ensure BOTH marinas have a mix of swing moorings + berths.
 *
 * Changes:
 * - Moves a small number of moorings between marinaId=1 and marinaId=2
 * - Updates bookings' marinaId to match the moved mooring's new marinaId
 * - Updates BOTH: data/bookings.json and data/demo-baseline/bookings.json
 *
 * Safety:
 * - Writes .bak-YYYYMMDD-HHMMSS backups before modifying
 */

const fs = require("fs");
const path = require("path");

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function writeJsonPretty(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function backupFile(p) {
  const stamp = nowStamp();
  const bak = p + `.bak-${stamp}`;
  fs.copyFileSync(p, bak);
  return bak;
}

/**
 * Try to infer whether a mooring record is a "berth" or "swing".
 * We do this defensively because prototypes often change field names.
 */
function inferMooringKind(m) {
  const candidates = [
    m.type,
    m.mooringType,
    m.kind,
    m.category,
    m.berthType,
    m.mooring_kind,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());

  const blob = candidates.join(" | ");

  // Berth-ish keywords
  if (/(berth|pontoon|finger|pile|slip)/i.test(blob)) return "berth";

  // Swing/mooring-ish keywords
  if (/(swing|moor|buoy)/i.test(blob)) return "swing";

  // Fallback: if there's a boolean or enum-like hint
  if (m.isBerth === true) return "berth";
  if (m.isSwing === true) return "swing";

  return "unknown";
}

function asInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function summarize(moorings) {
  const byMarina = {};
  for (const m of moorings) {
    const marinaId = asInt(m.marinaId);
    if (!marinaId) continue;
    const kind = inferMooringKind(m);
    byMarina[marinaId] ||= { berth: 0, swing: 0, unknown: 0, total: 0 };
    byMarina[marinaId][kind] = (byMarina[marinaId][kind] || 0) + 1;
    byMarina[marinaId].total += 1;
  }
  return byMarina;
}

function pickSome(moorings, marinaId, kind, count) {
  const list = moorings.filter(
    (m) => asInt(m.marinaId) === marinaId && inferMooringKind(m) === kind
  );

  // Prefer "not currently used in any booking" if we can (safer)
  // We won't filter here yet; the booking update logic can handle either.
  return list.slice(0, count);
}

function main() {
  const root = path.resolve(__dirname, "..");

  const mooringsPath = path.join(root, "data", "moorings.json");
  const bookingsPath = path.join(root, "data", "bookings.json");
  const baselineBookingsPath = path.join(root, "data", "demo-baseline", "bookings.json");

  if (!fs.existsSync(mooringsPath)) throw new Error("Missing file: " + mooringsPath);
  if (!fs.existsSync(bookingsPath)) throw new Error("Missing file: " + bookingsPath);
  if (!fs.existsSync(baselineBookingsPath)) throw new Error("Missing file: " + baselineBookingsPath);

  const moorings = readJson(mooringsPath);
  const bookings = readJson(bookingsPath);
  const baselineBookings = readJson(baselineBookingsPath);

  // We assume 2 marinas in demo: marinaId 1 and 2
  const A = 1;
  const B = 2;

  console.log("---- BEFORE ----");
  console.log(JSON.stringify(summarize(moorings), null, 2));

  // Choose how many to swap each way
  // Aim: each marina ends up with at least a couple of each type.
  const SWAP_COUNT = 2;

  const fromA_berths = pickSome(moorings, A, "berth", SWAP_COUNT);
  const fromA_swings = pickSome(moorings, A, "swing", SWAP_COUNT);
  const fromB_berths = pickSome(moorings, B, "berth", SWAP_COUNT);
  const fromB_swings = pickSome(moorings, B, "swing", SWAP_COUNT);

  // If one marina has too few of a kind, we still proceed with what's available.
  const moveAtoB = [...fromA_berths, ...fromA_swings].slice(0, SWAP_COUNT);
  const moveBtoA = [...fromB_berths, ...fromB_swings].slice(0, SWAP_COUNT);

  if (moveAtoB.length === 0 && moveBtoA.length === 0) {
    console.log("No eligible moorings found to swap. Nothing changed.");
    process.exit(0);
  }

  // Create a map of mooringId -> new marinaId for moved moorings
  const moved = new Map();

  for (const m of moveAtoB) moved.set(asInt(m.id), B);
  for (const m of moveBtoA) moved.set(asInt(m.id), A);

  // Apply marina changes on moorings
  for (const m of moorings) {
    const id = asInt(m.id);
    if (!id) continue;
    const newMarinaId = moved.get(id);
    if (newMarinaId) m.marinaId = newMarinaId;
  }

  // Helper to update bookings arrays
  function updateBookingsMarinaId(bookingList, label) {
    let updated = 0;

    for (const b of bookingList) {
      const mooringId = asInt(b.mooringId);
      if (!mooringId) continue;

      const newMarinaId = moved.get(mooringId);
      if (!newMarinaId) continue;

      // Only update if the booking has marinaId and it differs OR if it exists at all.
      const old = asInt(b.marinaId);
      b.marinaId = newMarinaId;
      if (old !== newMarinaId) updated += 1;
    }

    console.log(`${label}: updated marinaId on ${updated} booking(s) tied to moved moorings.`);
  }

  updateBookingsMarinaId(bookings, "data/bookings.json");
  updateBookingsMarinaId(baselineBookings, "data/demo-baseline/bookings.json");

  console.log("---- AFTER ----");
  console.log(JSON.stringify(summarize(moorings), null, 2));

  // Back up then write files
  console.log("---- BACKUPS ----");
  console.log("moorings backup:", backupFile(mooringsPath));
  console.log("bookings backup:", backupFile(bookingsPath));
  console.log("baseline bookings backup:", backupFile(baselineBookingsPath));

  writeJsonPretty(mooringsPath, moorings);
  writeJsonPretty(bookingsPath, bookings);
  writeJsonPretty(baselineBookingsPath, baselineBookings);

  console.log("DONE: Marina mix applied and bookings updated.");
}

main();
