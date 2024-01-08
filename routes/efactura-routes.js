const express = require('express');
const authGuard = require('../middleware/auth-guard');
const router = express.Router();
const {
  checkEfacturaMessages,
} = require('../controllers/efactura-controllers');

router.use(authGuard);
router.post('/efactura-messages', checkEfacturaMessages);

module.exports = router;
