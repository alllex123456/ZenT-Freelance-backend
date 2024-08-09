const express = require('express');

const router = express.Router();
const authGuard = require('../middleware/auth-guard');
const {
  getTransactions,
  addTransaction,
  editTransaction,
  deleteTransaction,
} = require('../controllers/transaction-controllers');
const {
  getInventory,
  addInventoryItems,
  editInventoryItems,
  deleteInventoryItems,
} = require('../controllers/inventory-controllers');

router.use(authGuard);

router.get('/get-transactions', getTransactions);
router.get('/get-inventory', getInventory);
router.post('/add-transaction', addTransaction);
router.post('/add-payables', addInventoryItems);
router.post('/add-assets', addInventoryItems);
router.post('/add-taxes', addInventoryItems);
router.patch('/edit-transaction', editTransaction);
router.patch('/edit-inventory-item', editInventoryItems);
router.delete('/delete-transaction', deleteTransaction);
router.delete('/delete-inventory-item', deleteInventoryItems);

module.exports = router;
