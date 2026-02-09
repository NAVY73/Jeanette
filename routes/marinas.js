const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

function readJson(fileName) {
  const filePath = path.join(__dirname, "..", "data", fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

// GET /api/marinas
router.get("/", (req, res) => {
  try {
    const marinas = readJson("marinas.json");
    return res.json({
      message: "BoatiesMate – Marinas list",
      marinas
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to load marinas",
      details: err.message
    });
  }
});

module.exports = router;
