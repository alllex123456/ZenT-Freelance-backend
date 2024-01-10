const express = require('express');
const authGuard = require('../middleware/auth-guard');
const router = express.Router();
const {
  checkEfacturaMessages,
  generateEfacturaXML,
  uploadXMLInvoice,
  checkEfacturaStatus,
  XMLtoPDF,
} = require('../controllers/efactura-controllers');

router.use(authGuard);
router.get('/generate-xml', generateEfacturaXML);
router.get('/check-efactura', checkEfacturaStatus);
router.get('/xml-to-pdf', XMLtoPDF);
router.post('/upload-efactura', uploadXMLInvoice);
router.post('/efactura-messages', checkEfacturaMessages);

module.exports = router;
