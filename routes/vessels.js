const express = require('express');
const path = require('path');
const router = express.Router();

// Load vessels data from JSON file
const vessels = require(path.join(__dirname, '..', 'data', 'vessels.json'));

// GET /vessels – list all vessels
router.get('/', (req, res) => {
  res.json({
    message: 'BoatiesMate – Vessels list (from JSON data)',
    vessels
  });
});

// GET /vessels/:id – get a single vessel by id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const vessel = vessels.find(v => v.id === id);

  if (!vessel) {
    return res.status(404).json({ error: 'Vessel not found' });
  }

  res.json({
    message: 'BoatiesMate – Vessel detail',
    vessel
  });
});

// GET /vessels/owner/:ownerId – all vessels for a given owner
router.get('/owner/:ownerId', (req, res) => {
  const ownerId = parseInt(req.params.ownerId, 10);
  const ownerVessels = vessels.filter(v => v.ownerId === ownerId);

  if (ownerVessels.length === 0) {
    return res.status(404).json({
      error: 'No vessels found for this owner'
    });
  }

  res.json({
    message: 'BoatiesMate – Vessels for owner',
    ownerId,
    vessels: ownerVessels
  });
});

module.exports = router;
