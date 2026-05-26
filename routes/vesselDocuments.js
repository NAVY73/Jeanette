const express = require('express');
const router = express.Router();
const multer = require('multer');
const pathLib = require('path');
const { readJson, writeJson } = require('../utils/jsonStore');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/compliance');
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({ storage });

function nowIso() {
  return new Date().toISOString();
}

function nextId(items) {
  const max = items.reduce((m, x) => Math.max(m, Number(x.id || 0)), 0);
  return max + 1;
}

router.get('/', (req, res) => {
  const docs = readJson('vesselDocuments.json', []);
  const vessel = readJson('vesselProfile.json', null);
  const vesselId = Number((req.query && req.query.vesselId) || (vessel && vessel.id) || 0);

  if (vesselId) {
    return res.json(docs.filter(d => Number(d.vesselId) === vesselId));
  }

  res.json([]);
});

/**
 * Add/replace a document record (metadata only).
 * For prototype: we store file metadata but not actual file upload yet.
 *
 * Required fields (minimum):
 * - type: "EWoF" | "INSURANCE" | "SHORE_POWER_LEAD_TEST" | "BIOFOULING_INSPECTION"
 * - issueDate: "YYYY-MM-DD"
 * - expiryDate: "YYYY-MM-DD"
 */
router.post('/', upload.single('documentFile'), (req, res) => {
  const docs = readJson('vesselDocuments.json', []);

  const body = req.body || {};
  if (!body.type) {
    return res.status(400).json({ error: 'type is required (EWoF, INSURANCE, SHORE_POWER_LEAD_TEST, BIOFOULING_INSPECTION)' });
  }
  if (!body.issueDate || !body.expiryDate) {
    return res.status(400).json({ error: 'issueDate and expiryDate are required (YYYY-MM-DD)' });
  }

  const doc = {
    id: nextId(docs),
    vesselId: Number(body.vesselId || (readJson('vesselProfile.json', null) || {}).id || 0),
    type: body.type,
    issuer: body.issuer || '',
    policyNumber: body.policyNumber || '',
    coverageAmountNZD: body.coverageAmountNZD || null,
    issueDate: body.issueDate,
    expiryDate: body.expiryDate,
    file: req.file ? {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: '/uploads/compliance/' + req.file.filename,
      uploadedAt: nowIso()
    } : (body.file || null),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  docs.push(doc);
  writeJson('vesselDocuments.json', docs);
  res.status(201).json(doc);
});

router.post('/:id/file', upload.single('documentFile'), (req, res) => {
  const docs = readJson('vesselDocuments.json', []);
  const id = Number(req.params.id);

  const doc = docs.find(d => Number(d.id) === id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'documentFile upload is required' });
  }

  doc.file = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: '/uploads/compliance/' + req.file.filename,
    uploadedAt: nowIso()
  };

  doc.updatedAt = nowIso();

  writeJson('vesselDocuments.json', docs);

  res.json({
    uploaded: true,
    documentId: id,
    file: doc.file
  });
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
