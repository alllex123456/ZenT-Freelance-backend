const express = require('express');
const {
  getAppSettings,
  convertCurrency,
  getEntityInfo,
  replaceUserIds,
} = require('../controllers/application-controllers');
const router = express.Router();
const authGuard = require('../middleware/auth-guard');

router.get('/app-settings', getAppSettings);

router.use(authGuard);
router.get('/get-entity-info/:taxNumber', getEntityInfo);
router.post('/convert-currency', convertCurrency);
router.post('/replace-userids', replaceUserIds);

module.exports = router;
