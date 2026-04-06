const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const VESSELS_PATH = path.join(__dirname, "..", "data", "vessels.json");

function readVessels() {
  try {
    if (!fs.existsSync(VESSELS_PATH)) return [];
    const raw = fs.readFileSync(VESSELS_PATH, "utf8");
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function writeVessels(vessels) {
  fs.mkdirSync(path.dirname(VESSELS_PATH), { recursive: true });
  fs.writeFileSync(VESSELS_PATH, JSON.stringify(vessels, null, 2));
}

function nextId(items) {
  const maxId = items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
  return maxId + 1;
}

// GET /api/vessels – list all vessels
router.get("/", (req, res) => {
  const vessels = readVessels();
  res.json({
    message: "BoatiesMate – Vessels list (from JSON data)",
    vessels
  });
});

// IMPORTANT: define /owner route BEFORE /:id (otherwise /owner/... gets eaten by /:id)
router.get("/owner/:ownerId", (req, res) => {
  const ownerId = Number(req.params.ownerId);
  const vessels = readVessels();
  const ownerVessels = vessels.filter(v => Number(v.ownerId) === ownerId);

  if (ownerVessels.length === 0) {
    return res.status(404).json({ error: "No vessels found for this owner" });
  }

  res.json({
    message: "BoatiesMate – Vessels for owner",
    ownerId,
    vessels: ownerVessels
  });
});

// GET /api/vessels/:id – get a single vessel by id
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const vessels = readVessels();
  const vessel = vessels.find(v => Number(v.id) === id);

  if (!vessel) return res.status(404).json({ error: "Vessel not found" });

  res.json({
    message: "BoatiesMate – Vessel detail",
    vessel
  });
});

// POST /api/vessels – create vessel (Phase 14 onboarding)
router.post("/", (req, res) => {
  const {
    ownerId,
    name,
    type,
    lengthM,
    beamM,
    draftM,
    registration,
    hasShorePower
  } = req.body || {};

  const cleanOwnerId = Number(ownerId);
  const cleanName = String(name || "").trim();
  const cleanType = String(type || "").trim();
  const cleanReg = String(registration || "").trim();

  const cleanHasShorePower = (typeof hasShorePower === "boolean") ? hasShorePower : (String(hasShorePower).toLowerCase() === "true");

  // Allow numeric fields to be optional, but if present they must parse
  const cleanLength = (lengthM === "" || lengthM === null || lengthM === undefined) ? null : Number(lengthM);
  const cleanBeam = (beamM === "" || beamM === null || beamM === undefined) ? null : Number(beamM);
  const cleanDraft = (draftM === "" || draftM === null || draftM === undefined) ? null : Number(draftM);

  if (!cleanOwnerId || !cleanName) {
    return res.status(400).json({ error: "ownerId and name are required" });
  }
  if ((cleanLength !== null && Number.isNaN(cleanLength)) ||
      (cleanBeam !== null && Number.isNaN(cleanBeam)) ||
      (cleanDraft !== null && Number.isNaN(cleanDraft))) {
    return res.status(400).json({ error: "lengthM/beamM/draftM must be numbers if provided" });
  }

  const vessels = readVessels();

  const vessel = {
    id: nextId(vessels),
    ownerId: cleanOwnerId,
    name: cleanName,
    type: cleanType || "unknown",
    lengthM: cleanLength,
    beamM: cleanBeam,
    draftM: cleanDraft,
    registration: cleanReg,
    hasShorePower: !!cleanHasShorePower,
    createdAt: new Date().toISOString()
  };

  vessels.push(vessel);
  writeVessels(vessels);

  res.status(201).json({
    message: "BoatiesMate – Vessel created",
    vessel
  });
});

module.exports = router;
