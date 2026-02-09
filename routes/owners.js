const express = require('express');
const router = express.Router();

const owners = require('../data/owners.json');

// GET /api/owners – list all owners
router.get('/', (req, res) => {
  res.json({
    message: 'BoatiesMate – Owners list',
    owners
  });
});

// GET /api/owners/:id – get a single owner by id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const owner = owners.find(o => o.id === id);

  if (!owner) {
    return res.status(404).json({ error: 'Owner not found' });
  }

  res.json({
    message: 'BoatiesMate – Owner detail',
    owner
  });
});

module.exports = router;
