const Notification = require('../models/notification');
const User = require('../models/user');

const HttpError = require('../models/http-error');

exports.getAllNotifications = async (req, res, next) => {
  let notifications;
  try {
    notifications = await Notification.find();
  } catch (error) {
    return next(new HttpError(req.t('errors.notifications.not_found'), 404));
  }

  res.json({ notifications });
};

exports.markRead = async (req, res, next) => {
  const { userId } = req.userData;

  try {
    await Notification.updateMany({
      $push: { read: userId },
    });
  } catch (error) {
    return next(new HttpError('Failed to mark as read', 500));
  }

  let notifications;
  try {
    notifications = await Notification.find();
  } catch (error) {
    return next(new HttpError(req.t('errors.notifications.not_found'), 404));
  }

  

  res.json({ notifications });
};

exports.addNotification = async (req, res, next) => {
  const { userId } = req.userData;
  const { icon, title, message } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  const newNotification = {
    userId,
    icon,
    title,
    message,
  };

  try {
    await newNotification.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.notifications.save_failed'), 500));
  }

  res.json({ confirmation: 'Notification saved' });
};

exports.editNotification = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let notification;
  try {
    notification = await Notification.findById(req.params.notificationId);
  } catch (error) {
    return next(new HttpError(req.t('errors.notifications.not_found'), 500));
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (value) {
      notification[key] = value;
    }
  }

  try {
    await notification.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.notifications.save_failed'), 500));
  }

  res.json({ confirmation: 'Notification saved' });
};

exports.deleteNotification = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let notification;
  try {
    notification = await Notification.findById(req.params.notificationId);
  } catch (error) {
    return next(new HttpError(req.t('errors.notifications.not_found'), 500));
  }

  try {
    await notification.remove();
  } catch (error) {
    return next(
      new HttpError(req.t('errors.notifications.delete_failed'), 500)
    );
  }

  res.json({ confirmation: 'Notification deleted' });
};
