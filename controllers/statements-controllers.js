const HttpError = require('../models/http-error');
const Order = require('../models/order');
const User = require('../models/user');
const Client = require('../models/client');
const { StatementPDF } = require('../services/pdf-statement');

exports.getAllStatements = async (req, res, next) => {
  const { userId } = req.userData;

  let clients;
  try {
    clients = await Client.find({ userId })
      .populate('orders')
      .populate({
        path: 'invoices',
        populate: {
          path: 'addedItems orders payments receipts',
        },
      });
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  const clientStatement = clients
    .filter((client) => !client.archived)
    .map((client) => ({
      ...client.toObject({ getters: true }),
      orders: client.orders
        .filter((order) => order.status === 'completed')
        .map((order) => order.toObject({ getters: true })),
    }));

  res.json({
    message: clientStatement,
  });
};

exports.getClientOrders = async (req, res, next) => {
  const { clientId } = req.params;

  let client;
  try {
    client = await Client.findById(clientId)
      .populate('orders')
      .populate({
        path: 'invoices',
        populate: {
          path: 'addedItems orders',
        },
      });
  } catch (error) {
    return next(new HttpError(req.t('errors.client.not_found'), 500));
  }

  if (client.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  client = {
    ...client._doc,
    orders: client._doc.orders.map((order) => ({
      ...order._doc,
      clientId: {
        ...client._doc,
      },
    })),
  };

  res.json({
    message: client,
  });
};

exports.generateStatement = async (req, res, next) => {
  const { clientId } = req.params;
  const { userId } = req.userData;
  const invoiceId = req.headers.invoiceid;
  const listedOrders = JSON.parse(req.headers.listedorders);

  let client;
  try {
    client = await Client.findById(clientId).populate('orders');
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (client.userId.toString() !== userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  if (!client) {
    return next(new HttpError(req.t('errors.client.no_client'), 500));
  }

  if (invoiceId) {
    let invoiceOrders;
    try {
      invoiceOrders = await Order.find({ invoiceId });
    } catch (error) {
      return next(new HttpError(req.t('errors.order.not_found'), 500));
    }
    StatementPDF(res, client, user, req.headers.payload, req, invoiceOrders);
  } else if (req.headers.listedorders) {
    let selectedOrders;
    try {
      selectedOrders = await Order.find({
        _id: { $in: listedOrders },
      });
    } catch (error) {
      return next(new HttpError(req.t('errors.order.not_found'), 500));
    }
    StatementPDF(res, client, user, req.headers.payload, req, selectedOrders);
  } else {
    StatementPDF(res, client, user, req.headers.payload, req);
  }
};

exports.sendStatement = async (req, res, next) => {
  const { userId } = req.userData;
  const { clientId, orders: orderIds, email, date } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let client;
  try {
    client = await Client.findById(clientId).populate('orders');
  } catch (error) {
    return next(new HttpError(req.t('errors.client.not_found'), 500));
  }

  if (client.userId.toString() !== userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }
  if (!client) {
    return next(new HttpError(req.t('errors.client.no_client'), 404));
  }

  let orders;
  try {
    orders = await Order.find({ _id: { $in: orderIds } });
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  try {
    StatementPDF(res, client, user, date, req, orders, email);
  } catch (error) {
    return next(new HttpError(req.t('errors.statement.send_failed'), 500));
  }

  res.json({
    message: req.t('success.statement.sent'),
  });
};

exports.modifyStatementOrder = async (req, res, next) => {
  const { orderId } = req.body;

  let order;
  try {
    order = await Order.findById(orderId);
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  if (order.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (value) {
      order[key] = value;
    }
  }

  try {
    await order.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  res.json({ message: order.toObject({ getters: true }) });
};

exports.deleteStatementOrder = async (req, res, next) => {
  const { orderId } = req.body;

  let order;
  try {
    order = await Order.findById(orderId).populate('userId');
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.not_found'), 500));
  }

  if (order.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await order.remove({ session });
    order.userId.orders.pull(order);
    await order.userId.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.orders.delete_failed'), 500));
  }

  res.json({ message: order.toObject({ getters: true }) });
};
