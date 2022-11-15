const mongoose = require('mongoose');

const Order = require('../models/order');
const User = require('../models/user');
const Client = require('../models/client');
const Invoice = require('../models/invoice');

const HttpError = require('../models/http-error');
const AddedItem = require('../models/added-item');

const { localISOTime } = require('../utils/ISO-offset');

const calculatedTotal = (unit, count, rate) => {
  let total;
  if (unit === '2000cw/s') {
    total = (count / 2000) * rate;
  }
  if (unit === 'word') {
    total = count * rate;
  }
  if (unit === '300w') {
    total = (count / 300) * rate;
  }
  if (unit === '1800cw/os') {
    total = (count / 1800) * rate;
  }
  return total.toFixed(2);
};

exports.getOrders = async (req, res, next) => {
  const orderIds = JSON.parse(req.headers.payload);

  let orders;
  let addedItems;
  try {
    orders = await Order.find({
      _id: { $in: orderIds },
    });
    addedItems = await AddedItem.find({
      _id: { $in: orderIds },
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  res.json({
    message: orders
      .concat(addedItems)
      .map((order) => order.toObject({ getters: true })),
  });
};

exports.getClientCompletedOrders = async (req, res, next) => {
  const { clientId } = req.params;

  let client;
  try {
    client = await Client.findById(clientId).populate({
      path: 'orders',
      match: { status: 'completed' },
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  res.json({
    message: client,
  });
};

exports.getQueueList = async (req, res, next) => {
  const { userId } = req.userData;

  let orders;
  try {
    orders = await Order.find({ userId, status: 'queue' }).populate('clientId');
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  res.json({
    message: orders
      .sort((a, b) => a.deadline - b.deadline)
      .map((order) => order.toObject({ getters: true })),
  });
};

exports.getOrder = async (req, res, next) => {
  const { orderId } = req.params;

  let order;
  try {
    order = await Order.findById(orderId).populate('clientId');
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  if (order.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  res.json({ message: order.toObject({ getters: true }) });
};

exports.addOrder = async (req, res, next) => {
  const {
    service,
    clientId,
    ref,
    receivedDate,
    deadline,
    rate,
    unit,
    currency,
    count,
    notes,
  } = req.body;

  const newOrder = new Order({
    userId: req.userData.userId,
    clientId,
    service,
    receivedDate: localISOTime(new Date(receivedDate)),
    deadline: localISOTime(new Date(receivedDate)),
    rate,
    unit,
    currency,
    count,
    notes,
    status: req.body.addToStatement ? 'completed' : 'queue',
    reference: ref || '-',
    total: calculatedTotal(unit, count, rate),
  });

  let user, client;
  try {
    user = await User.findById(req.userData.userId);
    client = await Client.findById(clientId);
  } catch (error) {}

  if (!user || !client) {
    return next(new HttpError(req.t('errors.user.no_user_client'), 500));
  }

  user.orders.push(newOrder);
  client.orders.push(newOrder);

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await newOrder.save({ session });
    await user.save({ session });
    await client.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.save_failed'), 500));
  }

  res.json({
    confirmation: req.t('success.orders.added'),
  });
};

exports.completeOrder = async (req, res, next) => {
  const { orderId } = req.body;

  let order;
  try {
    order = await Order.findById(orderId);
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  if (order.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.orders.no_authorization'), 401));
  }

  order.status = 'completed';
  order.reference = req.body.reference;
  order.rate = req.body.rate;
  order.count = req.body.count;
  order.notes = req.body.notes;
  order.total = calculatedTotal(order.unit, req.body.count, req.body.rate);
  order.deliveredDate = req.body.deliveredDate;

  try {
    await order.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.complete_failed'), 500));
  }

  res.json({ message: req.t('success.orders.completed') });
};

exports.modifyOrder = async (req, res, next) => {
  const { orderId } = req.body;

  let order;
  try {
    order = await Order.findById(orderId);
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  if (order.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.orders.no_authorization'), 401));
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (value) {
      order[key] = value;
    }
  }

  order.total = calculatedTotal(order.unit, req.body.count, req.body.rate);

  try {
    await order.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.modify_failed'), 500));
  }

  res.json({ message: req.t('success.orders.modified') });
};

exports.deleteOrder = async (req, res, next) => {
  const { orderId } = req.body;

  let order;
  try {
    order = await Order.findById(orderId).populate('userId clientId');
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  if (order.userId.id.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await order.remove({ session });
    order.userId.orders.pull(order);
    order.clientId.orders.pull(order);
    await order.userId.save({ session });
    await order.clientId.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.delete_failed'), 500));
  }

  res.json({ message: req.t('success.orders.deleted') });
};

exports.cleanUpOrders = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId).populate('orders invoices');
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  user.orders = user.orders.filter(
    (order) =>
      order.status === 'queue' || order.deliveredDate > Date.now() - 31536000000
  );
  user.invoices = user.invoices.filter(
    (invoice) => invoice.updatedAt > Date.now() - 31536000000
  );

  const clients = await Client.find({ userId }).populate('orders invoices');

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await user.save({ session });

    clients.forEach(async (client) => {
      client.orders = client.orders.filter(
        (order) =>
          order.status === 'queue' ||
          order.deliveredDate > Date.now() - 31536000000
      );
      client.invoices = client.invoices.filter(
        (invoice) => invoice.updatedAt > Date.now() - 31536000000
      );
      await client.save({ session });
    });

    await Invoice.deleteMany(
      {
        userId,
        updatedAt: { $lte: Date.now() - 31536000000 },
      },
      { session }
    );

    await Order.deleteMany(
      {
        userId,
        deliveredDate: { $lte: Date.now() - 31536000000 },
      },
      { session }
    );
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('database.connection_failed'), 500));
  }

  next();
};
