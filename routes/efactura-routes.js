const express = require('express');
const authGuard = require('../middleware/auth-guard');
const router = express.Router();
const {
  checkEfacturaMessages,
  generateEfacturaXML,
  uploadXMLInvoice,
  checkEfacturaStatus,
  XMLtoPDF,
  downloadXMLInvoice,
} = require('../controllers/efactura-controllers');

router.use(authGuard);
router.get('/generate-xml', generateEfacturaXML);
router.get('/check-efactura', checkEfacturaStatus);
router.get('/download-efactura', downloadXMLInvoice);
router.get('/efactura-messages', checkEfacturaMessages);
router.get('/xml-to-pdf', XMLtoPDF);
router.post('/upload-efactura', uploadXMLInvoice);

module.exports = router;
