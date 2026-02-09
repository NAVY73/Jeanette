const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../utils/jsonStore');

function nowIso() {
  return new Date().toISOString();
}

function nextId(items) {
  const max = items.reduce((m, x) => Math.max(m, Number(x.id || 0)), 0);
  return max + 1;
}

router.get('/', (req, res) => {
  const docs = readJson('vesselDocuments.json', []);
  res.json(docs);
});

/**
 * Add/replace a document record (metadata only).
 * For prototype: we store file metadata but not actual file upload yet.
 *
 * Required fields (minimum):
 * - type: "EWoF" | "INSURANCE" | "SHORE_POWER_LEAD_TEST"
 * - issueDate: "YYYY-MM-DD"
 * - expiryDate: "YYYY-MM-DD"
 */
router.post('/', (req, res) => {
  const docs = readJson('vesselDocuments.json', []);

  const body = req.body || {};
  if (!body.type) {
    return res.status(400).json({ error: 'type is required (EWoF, INSURANCE, SHORE_POWER_LEAD_TEST)' });
  }
  if (!body.issueDate || !body.expiryDate) {
    return res.status(400).json({ error: 'issueDate and expiryDate are required (YYYY-MM-DD)' });
  }

  const doc = {
    id: nextId(docs),
    vesselId: body.vesselId || 1,
    type: body.type,
    issuer: body.issuer || '',
    policyNumber: body.policyNumber || '',
    coverageAmountNZD: body.coverageAmountNZD || null,
    issueDate: body.issueDate,
    expiryDate: body.expiryDate,
    file: body.file || null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  docs.push(doc);
  writeJson('vesselDocuments.json', docs);
  res.status(201).json(doc);
});

router.delete('/:id', (req, res) => {
  const docs = readJson('vesselDocuments.json', []);
  const id = Number(req.params.id);

  const idx = docs.findIndex(d => Number(d.id) === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const removed = docs.splice(idx, 1)[0];
  writeJson('vesselDocuments.json', docs);
  res.json({ deleted: true, removed });
});

module.exports = router;
