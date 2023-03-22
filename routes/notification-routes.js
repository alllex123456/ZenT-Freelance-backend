const express = require('express');
const router = express.Router();

const {
  getAllNotifications,
  addNotification,
  editNotification,
  deleteNotification,
  markRead,
} = require('../controllers/notification-controllers');

const authGuard = require('../middleware/auth-guard');

router.use(authGuard);

router.get('/', getAllNotifications);

router.post('/add-notification', addNotification);

router.post('/mark-read', markRead);

router.patch('/edit-notification/:notificationId', editNotification);

router.delete('/delete-notification/:notificationId', deleteNotification);

module.exports = router;
