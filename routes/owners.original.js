const express = require('express');
const path = require('path');
const router = express.Router();

// Load owners data from JSON file
let owners = require(path.join(__dirname, '..', 'data', 'owners.json'));

// GET /owners – list all owners
router.get('/', (req, res) => {
  res.json({
    message: 'BoatiesMate – Owners list (from JSON data)',
    owners
  });
});

// GET /owners/:id – get a single owner by id
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

// POST /owners – create a new owner (in-memory only for now)
router.post('/', (req, res) => {
  const { firstName, lastName, email, phone, homePort } = req.body;

  // Simple validation
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      error: 'firstName, lastName and email are required'
    });
  }

  // Create a new id (one higher than current max)
  const newId = owners.length > 0 ? Math.max(...owners.map(o => o.id)) + 1 : 1;

  const newOwner = {
    id: newId,
    firstName,
    lastName,
    email,
    phone: phone || '',
    homePort: homePort || ''
  };

  // Add to in-memory list (this will reset if the server restarts – that is OK for now)
  owners.push(newOwner);

  res.status(201).json({
    message: 'BoatiesMate – Owner created (in memory only for now)',
    owner: newOwner
  });
});

module.exports = router;
