const express = require('express');
const router = express.Router();

const users = require('../data/users.json');
const { createSessionForUser, requireAuth } = require('../lib/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'User is not active' });
  }

  const token = createSessionForUser(user);

  res.json({
    message: 'Login successful (prototype)',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      marinaId: user.marinaId ?? null
    }
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    message: 'Authenticated (prototype)',
    user: req.user
  });
});

module.exports = router;
