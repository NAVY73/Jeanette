// routes/decisionIntel.js
const express = require("express");
const router = express.Router();

const { requireAuth, requireRole } = require("../lib/auth");
 // adjust if your file path differs
const { evaluateDecisionIntel } = require("../services/decisionIntel");

// GET /api/bookings/:id/decision-intel
router.get(
    "/api/bookings/:id/decision-intel",
    requireAuth,
    requireRole(["marina_operator"]),
    async (req, res) => {  
  try {
    const bookingId = Number(req.params.id);
    const result = await evaluateDecisionIntel(bookingId);

    if (!result.found) {
      return res.status(404).json({ message: "Decision intel not found", ...result });
    }

    return res.json({
      message: "BoatiesMate – Decision Intelligence",
      ...result
    });
  } catch (err) {
    console.error("decision-intel error:", err);
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
});

module.exports = router;
