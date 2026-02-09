const express = require('express');
const router = express.Router();

const { asyncHandler } = require('../utils/asyncHandler');
const { badRequest, notFound } = require('../utils/ApiError');

const { checkSuitability, findAlternatives } = require('../rules/availability');

// JSON data stores
const bookings = require('../data/bookings.json');
const vessels  = require('../data/vessels.json');
const moorings = require('../data/moorings.json');
const marinas  = require('../data/marinas.json');

// Helper: parse date safely
function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/availability
// Query:
// - marinaId (required)
// - vesselId (required)
// - startDate (required, YYYY-MM-DD)
// - endDate (required, YYYY-MM-DD)
// - blockStatuses (optional, comma-separated, default "approved")
// - limit (optional, default 20, max 100)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { marinaId, vesselId, startDate, endDate, blockStatuses, limit } = req.query;

    // Field-level validation details for the UI
    const fieldErrors = [];
    if (!marinaId) fieldErrors.push({ field: 'marinaId', message: 'Marina is required.' });
    if (!vesselId) fieldErrors.push({ field: 'vesselId', message: 'Vessel is required.' });
    if (!startDate) fieldErrors.push({ field: 'startDate', message: 'Start date is required.' });
    if (!endDate) fieldErrors.push({ field: 'endDate', message: 'End date is required.' });

    if (fieldErrors.length) {
      fieldErrors.push({
        field: '_example',
        message:
          'Example: /api/availability?marinaId=2&vesselId=1&startDate=2027-03-01&endDate=2027-03-03',
      });

      throw badRequest(
        'VALIDATION_ERROR',
        'Please check the highlighted fields.',
        fieldErrors
      );
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start) {
      throw badRequest(
        'VALIDATION_ERROR',
        'Please check the highlighted fields.',
        [{ field: 'startDate', message: 'Start date must be a valid date in YYYY-MM-DD format.' }]
      );
    }
    if (!end) {
      throw badRequest(
        'VALIDATION_ERROR',
        'Please check the highlighted fields.',
        [{ field: 'endDate', message: 'End date must be a valid date in YYYY-MM-DD format.' }]
      );
    }
    if (end < start) {
      throw badRequest(
        'VALIDATION_ERROR',
        'Please check the highlighted fields.',
        [{ field: 'endDate', message: 'End date cannot be before start date.' }]
      );
    }

    const marina = marinas.find(m => Number(m.id) === Number(marinaId));
    if (!marina) {
      throw notFound('NOT_FOUND', 'Marina not found.');
    }

    const vessel = vessels.find(v => Number(v.id) === Number(vesselId));
    if (!vessel) {
      throw notFound('NOT_FOUND', 'Vessel not found.');
    }

    // Parse statuses to block (default approved-only)
    const block = (blockStatuses && String(blockStatuses).trim())
      ? String(blockStatuses).split(',').map(s => s.trim()).filter(Boolean)
      : ['approved'];

    // Limit (default 20, max 100)
    let lim = parseInt(limit, 10);
    if (Number.isNaN(lim) || lim <= 0) lim = 20;
    if (lim > 100) lim = 100;

    // Availability search engine
    const available = findAlternatives({
      moorings,
      bookings,
      vessel,
      marinaId: Number(marinaId),
      startDate: start,
      endDate: end,
      preferredMooringType: null,
      excludeMooringId: null,
      blockStatuses: block,
      limit: lim,
    });

    // Diagnostics only if nothing is available
    const marinaMoorings = moorings.filter(m => Number(m.marinaId) === Number(marinaId));
    const suitableIgnoringAvailability = marinaMoorings
      .filter(m => checkSuitability({ vessel, mooring: m }).passed)
      .map(m => ({
        mooringId: m.id,
        name: m.name,
        type: m.type || null,
        maxLengthMetres: m.maxLengthMetres ?? null,
        maxDraftMetres: m.maxDraftMetres ?? null,
      }));

    return res.json({
      marina: { id: marina.id, name: marina.name },
      vessel: {
        id: vessel.id,
        name: vessel.name,
        lengthMetres: vessel.lengthMetres,
        draftMetres: vessel.draftMetres,
        beamMetres: vessel.beamMetres,
      },
      requested: { startDate, endDate },
      blockStatuses: block,
      count: available.length,
      results: available,
      diagnostics: available.length === 0
        ? {
            mooringsInMarina: marinaMoorings.length,
            suitableIgnoringAvailabilityCount: suitableIgnoringAvailability.length,
            suitableIgnoringAvailability,
          }
        : null,
    });
  })
);

module.exports = router;
