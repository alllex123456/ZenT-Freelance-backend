const express = require('express');
const authGuard = require('../middleware/auth-guard');
const router = express.Router();
const {
  checkEfacturaMessages,
  generateEfacturaXML,
  uploadXMLInvoice,
} = require('../controllers/efactura-controllers');

router.use(authGuard);
router.get('/generate-xml', generateEfacturaXML);
router.post('/upload-efactura', uploadXMLInvoice);
router.post('/efactura-messages', checkEfacturaMessages);

module.exports = router;
