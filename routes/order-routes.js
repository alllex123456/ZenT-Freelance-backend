const express = require('express');
const router = express.Router();

const authGuard = require('../middleware/auth-guard');
const {
  getOrders,
  getQueueList,
  addOrder,
  completeOrder,
  modifyOrder,
  deleteOrder,
  getOrder,
  getClientCompletedOrders,
  cleanUpOrders,
} = require('../controllers/order-controllers');

router.use(authGuard);

router.get('/', getOrders);
router.get('/get-pending', getQueueList);
router.get('/get-completed/:clientId', getClientCompletedOrders);
router.get('/:orderId', getOrder);

router.post('/add-order', addOrder);
router.post('/complete-order', completeOrder);

router.patch('/modify-order', modifyOrder);

router.delete('/delete-order', deleteOrder);

module.exports = router;
