const express = require('express');
const router = express.Router();
const { readJson } = require('../utils/jsonStore');

/**
 * GET /api/marinas/:marinaId/requirements
 */
router.get('/:marinaId/requirements', (req, res) => {
  const marinaId = Number(req.params.marinaId);
  const rules = readJson('marinaRequirements.json', []);

  const match = rules.find(r => Number(r.marinaId) === marinaId);
  if (!match) {
    return res.status(404).json({ error: `No requirements configured for marinaId ${marinaId}` });
  }

  res.json(match);
});

module.exports = router;
