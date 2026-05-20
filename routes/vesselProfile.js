const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../utils/jsonStore');

function nowIso() {
  return new Date().toISOString();
}

function cleanPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nextId(items) {
  return (items || []).reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
}

router.get('/', (req, res) => {
  const vessel = readJson('vesselProfile.json', null);
  res.json(vessel);
});

router.put('/', (req, res) => {
  const existing = readJson('vesselProfile.json', null) || {};
  const vessels = readJson('vessels.json', []);

  const ownerId =
    cleanPositiveNumber(req.body && req.body.ownerId) ||
    cleanPositiveNumber(existing && existing.ownerId);

  if (!ownerId) {
    return res.status(400).json({
      error: 'ownerId is required before saving vessel profile'
    });
  }

  const name = String(
    (req.body && req.body.name) ||
    existing.name ||
    ''
  ).trim();

  const registration = String(
    (req.body && (req.body.registration || req.body.registrationNumber)) ||
    existing.registration ||
    existing.registrationNumber ||
    ''
  ).trim();

  let registryVessel = vessels.find(v =>
    Number(v.ownerId) === Number(ownerId) &&
    registration &&
    String(v.registration || v.registrationNumber || '')
      .trim()
      .toLowerCase() === registration.toLowerCase()
  ) || null;

  if (!registryVessel) {
    registryVessel = {
      id: nextId(vessels),
      ownerId,
      name,
      type: (req.body && req.body.type) || existing.type || 'unknown',
      lengthM:
        (req.body && req.body.lengthOverallM) ??
        existing.lengthOverallM ??
        existing.lengthM ??
        null,
      beamM:
        (req.body && req.body.beamM) ??
        existing.beamM ??
        null,
      draftM:
        (req.body && req.body.draftM) ??
        existing.draftM ??
        null,
      registration,
      hasShorePower: Boolean(
        (req.body && req.body.hasShorePower) ??
        existing.hasShorePower
      ),
      createdAt: nowIso()
    };

    vessels.push(registryVessel);
  } else {
    registryVessel.ownerId = ownerId;
    registryVessel.name = name || registryVessel.name;
    registryVessel.type =
      (req.body && req.body.type) || registryVessel.type;

    registryVessel.lengthM =
      (req.body && req.body.lengthOverallM) ??
      registryVessel.lengthM;

    registryVessel.beamM =
      (req.body && req.body.beamM) ??
      registryVessel.beamM;

    registryVessel.draftM =
      (req.body && req.body.draftM) ??
      registryVessel.draftM;

    registryVessel.registration =
      registration || registryVessel.registration;

    registryVessel.hasShorePower = Boolean(
      (req.body && req.body.hasShorePower) ??
      registryVessel.hasShorePower
    );
  }

  writeJson('vessels.json', vessels);

  const updated = {
    ...existing,
    ...req.body,
    id: registryVessel.id,
    ownerId,
    createdAt:
      existing.createdAt ||
      registryVessel.createdAt ||
      nowIso(),
    updatedAt: nowIso()
  };

  writeJson('vesselProfile.json', updated);
  res.json(updated);
});

module.exports = router;
