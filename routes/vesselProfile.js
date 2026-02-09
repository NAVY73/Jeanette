const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../utils/jsonStore');

function nowIso() {
  return new Date().toISOString();
}

router.get('/', (req, res) => {
  const vessel = readJson('vesselProfile.json', null);
  res.json(vessel);
});

router.put('/', (req, res) => {
  const existing = readJson('vesselProfile.json', null) || { id: 1, ownerId: 1 };

  const updated = {
    ...existing,
    ...req.body,
    id: existing.id || 1,
    ownerId: existing.ownerId || 1,
    createdAt: existing.createdAt || nowIso(),
    updatedAt: nowIso()
  };

  writeJson('vesselProfile.json', updated);
  res.json(updated);
});

module.exports = router;
