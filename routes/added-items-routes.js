const express = require('express');
const {
  modifyAddedItem,
  addAddedItem,
  deleteAddedItem,
} = require('../controllers/added-items-controllers');

const router = express.Router();
const authGuard = require('../middleware/auth-guard');

router.use(authGuard);
router.post('/add-item', addAddedItem);
router.patch('/modify-item', modifyAddedItem);
router.delete('/delete-item', deleteAddedItem);

module.exports = router;
