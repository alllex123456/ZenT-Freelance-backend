const express = require('express');
const { getAppSettings } = require('../controllers/application-controllers');
const router = express.Router();

router.get('/app-settings', getAppSettings);

module.exports = router;
