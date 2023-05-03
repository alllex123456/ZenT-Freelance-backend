const fs = require('fs');

const mongoose = require('mongoose');

const Client = require('../models/client');
const User = require('../models/user');
const Order = require('../models/order');

const HttpError = require('../models/http-error');

exports.getAllClients = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId).populate({
      path: 'clients',
      populate: {
        path: 'orders invoices',
      },
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  res.json({
    message: {
      clients: user.clients.map((client) => client.toObject({ getters: true })),
    },
  });
};

exports.getClient = async (req, res, next) => {
  const { clientId } = req.params;

  let client;
  try {
    client = await Client.findOne({
      _id: clientId,
    }).populate({
      path: 'invoices',
      populate: {
        path: 'orders addedItems payments receipts',
      },
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  if (client && client.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  res.json({ message: client.toObject({ getters: true }) });
};

exports.addClient = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let userClients;
  try {
    userClients = await Client.find({
      userId,
      archived: { $exists: false } || false,
      taxNumber: req.body.taxNumber,
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  if (userClients.length !== 0) {
    return next(new HttpError(req.t('errors.clients.already_registered'), 401));
  }

  const newClient = new Client({
    userId,
    orders: [],
    invoices: [],
    receipts: [],
    addedItems: [],
    balance: 0,
    invoiceDue: 5,
    translationRate: 0,
    proofreadingRate: 0,
    posteditingRate: 0,
    mobile: '',
    mailingAddress: '',
    bank: '',
    iban: '',
    representative: '',
    notes: '',
    invoiceNotes: '',
    contacts: {
      primary: { name: '', email: '', phone: '', mobile: '' },
      secondary: { name: '', email: '', phone: '', mobile: '' },
    },
    archived: false,
    ...req.body,
  });
  user.clients.push(newClient);

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await newClient.save({ session });
    await user.save({ session });
    session.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.clients.save_failed'), 500));
  }

  res.json({ confirmation: req.t('success.clients.added'), client: newClient });
};

exports.modifyClient = async (req, res, next) => {
  const { clientId } = req.body;

  let client;
  try {
    client = await Client.findById(clientId);
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  if (client.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (value) {
      client[key] = value;
    }
  }

  try {
    await client.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.modify_failed'), 500));
  }

  res.json({ confirmation: req.t('success.clients.modified') });
};

exports.deleteClient = async (req, res, next) => {
  const { clientId } = req.params;

  let client;
  try {
    client = await Client.findById(clientId).populate('userId');
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  if (client && client.userId.id.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  let pendingOrders, completedOrders;
  try {
    pendingOrders = await Order.find({
      clientId,
      status: 'queue',
    });
    completedOrders = await Order.find({
      clientId,
      status: 'completed',
    });
  } catch (error) {}

  const uninvoicedOrdersIds = pendingOrders
    .concat(completedOrders)
    .map((order) => order._id);

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await User.findByIdAndUpdate(
      req.userData.userId,
      {
        $pullAll: { orders: uninvoicedOrdersIds },
        $pull: { clients: clientId },
      },
      { session }
    );
    await Client.findByIdAndUpdate(clientId, {
      $pullAll: { orders: uninvoicedOrdersIds },
      archived: true,
    }),
      { session };
    await Order.deleteMany({ _id: { $in: uninvoicedOrdersIds } }, { session });

    session.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.clients.delete_failed'), 500));
  }

  res.json({ confirmation: req.t('success.clients.deleted') });
};
