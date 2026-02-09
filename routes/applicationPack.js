const express = require('express');
const router = express.Router();
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
    return { state: 'missing', issues: [{ code: 'NO_EXPIRY_DATE', message: 'Document expiryDate is missing/invalid.' }] };
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
      return { state: 'invalid', issues: [{ code: 'INSURANCE_MIN_COVER', message: `Insurance cover must be at least ${rule.minCoverageNZD}.` }] };
    }
  }

  return { state: 'valid', issues };
}

/**
 * GET /api/application-pack?bookingId=123
 * (Temporary safe endpoint so we do not touch routes/booking.js yet.)
 */
router.get('/', (req, res) => {
  const bookingId = Number(req.query.bookingId);
  if (!bookingId) return res.status(400).json({ error: 'bookingId query param is required' });

  // We do NOT assume your bookings storage format in Phase 1 files.
  // Instead, we read bookings from your existing booking persistence file if it exists.
  // If your booking route stores elsewhere, we will connect it in the next step.
  const bookings = readJson('bookings.json', []);
  const booking = bookings.find(b => Number(b.id) === bookingId);

  if (!booking) return res.status(404).json({ error: `Booking ${bookingId} not found in data/bookings.json` });

  const owner = readJson('ownerProfile.json', null);
  const vessel = readJson('vesselProfile.json', null);
  const docs = readJson('vesselDocuments.json', []);
  const requirementsAll = readJson('marinaRequirements.json', []);
  const marinaId = Number(booking.marinaId || booking.marinaID || booking.marina || 0);

  const requirements = requirementsAll.find(r => Number(r.marinaId) === marinaId) || null;

  const todayUtc = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  ));

  const evaluatedDocuments = [];
  const blockingIssues = [];
  const warnings = [];

  if (requirements && requirements.requiredDocuments) {
    for (const rule of requirements.requiredDocuments) {
      // appliesWhen (e.g. only when hasShorePower = true)
      if (rule.appliesWhen && typeof rule.appliesWhen.hasShorePower === 'boolean') {
        if (!vessel || Boolean(vessel.hasShorePower) !== Boolean(rule.appliesWhen.hasShorePower)) {
          continue; // rule does not apply
        }
      }

      const found = docs
        .filter(d => d && d.type === rule.type)
        .sort((a, b) => String(b.expiryDate).localeCompare(String(a.expiryDate)))[0];

      if (!found) {
        if (rule.required) {
          blockingIssues.push({ code: 'MISSING_DOCUMENT', type: rule.type, message: `${rule.type} is required but missing.` });
        }
        evaluatedDocuments.push({ type: rule.type, document: null, compliance: { state: 'missing', issues: [] } });
        continue;
      }

      const compliance = computeDocCompliance(found, rule, todayUtc);
      evaluatedDocuments.push({ type: rule.type, document: found, compliance });

      if (rule.required && (compliance.state === 'missing' || compliance.state === 'expired' || compliance.state === 'invalid')) {
        blockingIssues.push({ code: 'NON_COMPLIANT', type: rule.type, message: `${rule.type} is not compliant (${compliance.state}).` });
      }
      if (compliance.state === 'expiring_soon') {
        warnings.push({ code: 'EXPIRING_SOON', type: rule.type, message: compliance.issues[0]?.message || `${rule.type} expiring soon.` });
      }
    }
  }

  const pack = {
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

  res.json(pack);
});

module.exports = router;
