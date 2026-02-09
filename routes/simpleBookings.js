const express = require('express');
const router = express.Router();

// GET /api/bookings
router.get('/', (req, res) => {
  res.json({
    message: 'Simple bookings route is working',
    bookings: []
  });
});

module.exports = router;
