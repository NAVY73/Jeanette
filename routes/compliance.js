const express = require('express');
const router = express.Router();
const { readJson } = require('../utils/jsonStore');

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

router.get('/check', (req, res) => {
  const marinaId = Number(req.query.marinaId);
  if (!marinaId) {
    return res.status(400).json({ error: 'marinaId query param is required' });
  }

  const vessel = readJson('vesselProfile.json', null);
  const docs = readJson('vesselDocuments.json', []);
  const requirementsAll = readJson('marinaRequirements.json', []);
  const requirements = requirementsAll.find(r => Number(r.marinaId) === marinaId) || null;

  const todayUtc = getTodayUtcMidnight();

  const blockingIssues = [];
  const warnings = [];
  const evaluatedDocuments = [];

  if (!requirements || !Array.isArray(requirements.requiredDocuments)) {
    return res.json({
      marinaId,
      eligibleToBook: true,
      blockingIssues: [],
      warnings: [],
      evaluatedDocuments: []
    });
  }

  for (const rule of requirements.requiredDocuments) {
    // appliesWhen (shore power doc required only if vessel.hasShorePower === true)
    if (rule.appliesWhen && typeof rule.appliesWhen.hasShorePower === 'boolean') {
      const vHas = Boolean(vessel && vessel.hasShorePower);
      if (vHas !== Boolean(rule.appliesWhen.hasShorePower)) continue;
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

  res.json({
    marinaId,
    eligibleToBook: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    evaluatedDocuments
  });
});

module.exports = router;
