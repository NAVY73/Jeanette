const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../utils/jsonStore');

function nowIso() {
  return new Date().toISOString();
}

function nextId(items) {
  return (items || []).reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
}

router.get('/', (req, res) => {
  const profile = readJson('ownerProfile.json', null);
  res.json(profile);
});

router.put('/', (req, res) => {
  const existing = readJson('ownerProfile.json', null) || {};
  const owners = readJson('owners.json', []);

  const email = String((req.body && req.body.email) || existing.email || '').trim().toLowerCase();
  const fullName = String((req.body && req.body.fullName) || existing.fullName || '').trim();
  const phone = String((req.body && req.body.phone) || existing.phone || '').trim();

  let registryOwner = null;
  if (email) {
    registryOwner = owners.find(o => String(o.email || '').trim().toLowerCase() === email) || null;
  }

  if (!registryOwner) {
    registryOwner = {
      id: nextId(owners),
      fullName,
      email: email || undefined,
      phone,
      createdAt: nowIso()
    };
    owners.push(registryOwner);
  } else {
    registryOwner.fullName = fullName || registryOwner.fullName;
    registryOwner.email = email || registryOwner.email;
    registryOwner.phone = phone || registryOwner.phone;
  }

  writeJson('owners.json', owners);

  const updated = {
    ...existing,
    ...req.body,
    id: registryOwner.id,
    createdAt: existing.createdAt || registryOwner.createdAt || nowIso(),
    updatedAt: nowIso()
  };

  writeJson('ownerProfile.json', updated);
  res.json(updated);
});

module.exports = router;
