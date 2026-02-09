const express = require('express');
const router = express.Router();

const owners   = require('../data/owners.json');
const vessels  = require('../data/vessels.json');
const moorings = require('../data/moorings.json');
const marinas  = require('../data/marinas.json');

// Combined dataset for the booking form UI
router.get('/', (req, res) => {
  res.json({
    message: 'BoatiesMate – Booking form data bundle',
    owners,
    vessels,
    moorings,
    marinas
  });
});

module.exports = router;
