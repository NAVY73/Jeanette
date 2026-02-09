const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../utils/jsonStore');

function nowIso() {
  return new Date().toISOString();
}

router.get('/', (req, res) => {
  const profile = readJson('ownerProfile.json', null);
  res.json(profile);
});

router.put('/', (req, res) => {
  const existing = readJson('ownerProfile.json', null) || { id: 1 };

  const updated = {
    ...existing,
    ...req.body,
    id: existing.id || 1,
    createdAt: existing.createdAt || nowIso(),
    updatedAt: nowIso()
  };

  writeJson('ownerProfile.json', updated);
  res.json(updated);
});

module.exports = router;
