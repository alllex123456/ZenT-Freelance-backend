const mongoose = require('mongoose');

const Order = require('../models/order');
const User = require('../models/user');
const Client = require('../models/client');
const Invoice = require('../models/invoice');

const HttpError = require('../models/http-error');
const AddedItem = require('../models/added-item');

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
  return total;
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

exports.getCompletedOrders = async (req, res, next) => {
  const { userId } = req.userData;

  let completedOrders;
  try {
    completedOrders = await Order.find({
      userId,
      status: 'completed',
    }).populate('clientId');
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  let invoicedOrders;
  try {
    invoicedOrders = await Order.find({
      userId,
      status: 'invoiced',
    }).populate('clientId');
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  res.json({
    message: completedOrders
      .concat(invoicedOrders)
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
    reference,
    receivedDate,
    deliveredDate,
    deadline,
    rate,
    unit,
    currency,
    count,
    notes,
  } = req.body;

  let user, client;
  try {
    user = await User.findById(req.userData.userId);
    client = await Client.findById(clientId);
  } catch (error) {}

  if (!user || !client) {
    return next(new HttpError(req.t('errors.user.no_user_client'), 500));
  }

  const newOrder = new Order({
    userId: req.userData.userId,
    clientId,
    service,
    receivedDate,
    deliveredDate: req.body.addToStatement ? deliveredDate : '',
    reference: reference || '-',
    deadline,
    rate,
    unit,
    currency,
    count,
    notes,
    status: req.body.addToStatement ? 'completed' : 'queue',
    total: calculatedTotal(unit, count, rate).toFixed(client.decimalPoints),
  });

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
    console.log(error);
    return next(new HttpError(req.t('errors.orders.save_failed'), 500));
  }

  res.json({
    confirmation: req.t('success.orders.added'),
    order: { ...newOrder._doc, clientId: client },
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

  let client;
  try {
    client = await Client.find({ _id: order.clientId });
  } catch (error) {
    return next(new HttpError(req.t('errors.client.not_found'), 500));
  }

  if (order.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.orders.no_authorization'), 401));
  }

  order.status = 'completed';
  order.reference = req.body.reference;
  order.rate = req.body.rate;
  order.count = req.body.count;
  order.notes = req.body.notes;
  order.total = calculatedTotal(
    order.unit,
    req.body.count,
    req.body.rate
  ).toFixed(client.decimalPoints);
  order.deliveredDate = req.body.deliveredDate;

  try {
    await order.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.complete_failed'), 500));
  }

  res.json({ order, confirmation: req.t('success.orders.completed') });
};

exports.modifyOrder = async (req, res, next) => {
  const { orderId } = req.body;

  let order;
  try {
    order = await Order.findById(orderId).populate();
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

  let client;
  try {
    client = await Client.findById(req.body.clientId);
  } catch (error) {}

  try {
    await order.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.modify_failed'), 500));
  }

  res.json({
    order: { ...order._doc, clientId: client._doc },
    confirmation: req.t('success.orders.modified'),
  });
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

  res.json({ order, confirmation: req.t('success.orders.deleted') });
};
