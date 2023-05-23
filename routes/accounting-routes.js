const express = require('express');

const router = express.Router();
const authGuard = require('../middleware/auth-guard');
const {
  getTransactions,
  printTransactions,
  addTransaction,
  editTransaction,
  deleteTransaction,
} = require('../controllers/accounting-controllers');

router.use(authGuard);

router.get('/get-transactions', getTransactions);
router.get('/print-transactions', printTransactions);
router.post('/add-transaction', addTransaction);
router.patch('/edit-transaction', editTransaction);
router.delete('/delete-transaction', deleteTransaction);

module.exports = router;
