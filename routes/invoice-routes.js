const express = require('express');
const router = express.Router();
const {
  createInvoice,
  generateInvoice,
  sendInvoice,
  getAllInvoices,
  getInvoice,
  modifyInvoice,
  deleteInvoice,
  cashInvoice,
  getClientInvoices,
} = require('../controllers/invoice-controllers');
const authGuard = require('../middleware/auth-guard');

router.use(authGuard);

router.get('/', getAllInvoices);
router.get('/client/:clientId', getClientInvoices);
router.get('/pdf/:invoiceId', generateInvoice);
router.get('/:invoiceId', getInvoice);

router.post('/send-invoice', sendInvoice);
router.post('/:clientId', createInvoice);

router.patch('/cash-invoice', cashInvoice);
router.patch('/modify-invoice', modifyInvoice);
router.delete('/delete-invoice/:invoiceId', deleteInvoice);

module.exports = router;
