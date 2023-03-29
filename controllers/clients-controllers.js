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
    user = await User.findById(userId).populate('clients');
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
    client = await Client.findById(clientId).populate({
      path: 'invoices',
      populate: {
        path: 'orders addedItems payments receipts',
      },
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  if (client.userId.toString() !== req.userData.userId) {
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
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let userClients;
  try {
    userClients = await Client.find();
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  userClients.forEach((client) => {
    if (client.taxNumber === req.body.taxNumber) {
      return next(
        new HttpError(req.t('errors.clients.already_registered'), 401)
      );
    }
  });

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

  if (client.userId.id.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await Order.deleteMany({ _id: { $in: client.orders } }, { session });
    await client.remove({ session });
    client.userId.clients.pull(client);
    await client.userId.save({ session });
    session.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.clients.delete_failed'), 500));
  }

  res.json({ confirmation: req.t('success.clients.deleted') });
};
