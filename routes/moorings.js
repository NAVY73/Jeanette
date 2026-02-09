const express = require('express');
const router = express.Router();

const moorings = require('../data/moorings.json');
const marinas = require('../data/marinas.json');
const bookings = require('../data/bookings.json');

// Helpers
function parseDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

// GET /api/moorings – list moorings (optionally filtered by marinaId)
router.get('/', (req, res) => {
  const { marinaId } = req.query;

  let results = moorings;

  if (marinaId != null && marinaId !== '') {
    results = results.filter(
      m => String(m.marinaId) === String(marinaId)
    );
  }

  res.json({
    message: 'BoatiesMate – Moorings list',
    moorings: results
  });
});


// IMPORTANT: this must be above '/:id' so it doesn't get shadowed
// GET /api/moorings/:id/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:id/availability', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { start, end } = req.query;

  const mooring = moorings.find(m => m.id === id);
  if (!mooring) {
    return res.status(404).json({ error: 'Mooring not found' });
  }

  if (!start || !end) {
    return res.status(400).json({
      error: 'Query params start and end are required (YYYY-MM-DD)'
    });
  }

  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'start and end must be valid dates in YYYY-MM-DD format'
    });
  }

  if (endDate < startDate) {
    return res.status(400).json({ error: 'end cannot be before start' });
  }

  const conflicts = bookings.filter(b => {
    if (b.mooringId !== id) return false;
    if (!['pending', 'approved'].includes(b.status)) return false;

    const bStart = parseDate(b.startDate);
    const bEnd = parseDate(b.endDate);

    // If data is malformed, be conservative and treat as conflicting
    if (!bStart || !bEnd) return true;

    return rangesOverlap(startDate, endDate, bStart, bEnd);
  });

  res.json({
    message: 'BoatiesMate – Mooring availability',
    mooringId: id,
    requested: { start, end },
    available: conflicts.length === 0,
    conflicts: conflicts.map(b => ({
      id: b.id,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status
    }))
  });
});

// GET /api/moorings/:id – get a single mooring by id (with marina lookup)
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const mooring = moorings.find(m => m.id === id);

  if (!mooring) {
    return res.status(404).json({ error: 'Mooring not found' });
  }

  const marina = mooring.marinaId
    ? marinas.find(m => m.id === mooring.marinaId)
    : null;

  res.json({
    message: 'BoatiesMate – Mooring detail',
    mooring,
    marina: marina || null
  });
});

module.exports = router;
