const express = require('express');

const authGuard = require('../middleware/auth-guard');
const {
  getAllStatements,
  getClientOrders,
  modifyStatementOrder,
  deleteStatementOrder,
  generateStatement,
  sendStatement,
} = require('../controllers/statements-controllers');

const router = express.Router();

router.use(authGuard);
router.get('/', getAllStatements);
router.get('/client/:clientId', getClientOrders);
router.get('/pdf/:clientId', generateStatement);

router.post('/send-statement', sendStatement);

router.patch('/modify-order', modifyStatementOrder);
router.delete('/delete-order', deleteStatementOrder);

module.exports = router;
