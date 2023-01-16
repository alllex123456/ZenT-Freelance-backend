const express = require('express');
const {
  getAppSettings,
  convertCurrency,
} = require('../controllers/application-controllers');
const router = express.Router();
const authGuard = require('../middleware/auth-guard');

router.get('/app-settings', getAppSettings);

router.use(authGuard);
router.post('/convert-currency', convertCurrency);

module.exports = router;
