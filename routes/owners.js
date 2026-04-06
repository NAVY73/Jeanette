const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const OWNERS_PATH = path.join(__dirname, "..", "data", "owners.json");

function readOwners() {
  try {
    if (!fs.existsSync(OWNERS_PATH)) return [];
    const raw = fs.readFileSync(OWNERS_PATH, "utf8");
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function writeOwners(owners) {
  fs.mkdirSync(path.dirname(OWNERS_PATH), { recursive: true });
  fs.writeFileSync(OWNERS_PATH, JSON.stringify(owners, null, 2));
}

function nextId(items) {
  const maxId = items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
  return maxId + 1;
}

// GET /api/owners – list all owners
router.get("/", (req, res) => {
  const owners = readOwners();
  res.json({
    message: "BoatiesMate – Owners list",
    owners
  });
});

// GET /api/owners/:id – get a single owner by id
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const owners = readOwners();
  const owner = owners.find(o => Number(o.id) === id);

  if (!owner) return res.status(404).json({ error: "Owner not found" });

  res.json({
    message: "BoatiesMate – Owner detail",
    owner
  });
});

// POST /api/owners – create owner profile (Phase 14 onboarding)
router.post("/", (req, res) => {
  const { fullName, email, phone } = req.body || {};

  const cleanName = String(fullName || "").trim();
  const cleanEmail = String(email || "").trim();
  const cleanPhone = String(phone || "").trim();

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({ error: "fullName and email are required" });
  }

  const owners = readOwners();

  // Reuse existing owner if email already exists (demo-friendly)
  const existing = owners.find(
    o => String(o.email || "").toLowerCase() === cleanEmail.toLowerCase()
  );
  if (existing) {
    return res.json({
      message: "BoatiesMate – Owner reused",
      owner: existing,
      reused: true
    });
  }

  const owner = {
    id: nextId(owners),
    fullName: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    createdAt: new Date().toISOString()
  };

  owners.push(owner);
  writeOwners(owners);

  res.status(201).json({
    message: "BoatiesMate – Owner created",
    owner
  });
});

module.exports = router;
