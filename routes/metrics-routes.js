const express = require('express');
const router = express.Router();

const { getMetrics } = require('../controllers/metrics-controllers');
const authGuard = require('../middleware/auth-guard');

router.use(authGuard);
router.get('/', getMetrics);

module.exports = router;
