const express = require('express');
const {
  getAppSettings,
  convertCurrency,
  getEntityInfo,
  replaceUser,
  createInvoiceReceiptTransactions,
  addTransactionProperty,
  setUserArrays,
  getEfacturaClient,
} = require('../controllers/application-controllers');
const router = express.Router();
const authGuard = require('../middleware/auth-guard');

router.get('/app-settings', getAppSettings);

router.use(authGuard);
router.get('/get-e-factura-client', getEfacturaClient);
router.post('/replace-user', replaceUser);
router.post('/set-user-arrays', setUserArrays);
router.post('/add-transaction-property', addTransactionProperty);
router.post(
  '/create-transactions-from-invoices',
  createInvoiceReceiptTransactions
);
router.get('/get-entity-info/:taxNumber', getEntityInfo);
router.post('/convert-currency', convertCurrency);

module.exports = router;
