const mongoose = require('mongoose');
const HttpError = require('../models/http-error');
const fetch = require('node-fetch');

const Invoice = require('../models/invoice');
const Order = require('../models/order');
const AddedItem = require('../models/added-item');
const Client = require('../models/client');
const Receipt = require('../models/receipt');
const Transaction = require('../models/transaction');

const App = require('../models/application');

exports.getAppSettings = async (req, res, next) => {
  let appSettings;

  try {
    appSettings = await App.find({});
  } catch (error) {
    return next(new HttpError(req.t('database.connection_failed'), 500));
  }

  res.json({ message: appSettings[0] });
};

exports.convertCurrency = async (req, res, next) => {
  const { originalCurrency, targetCurrency, amount } = req.body;

  const responseData = await fetch(
    `https://api.getgeoapi.com/v2/currency/convert?api_key=${process.env.CURRENCY_CONVERTER_KEY}&from=${originalCurrency}&to=${targetCurrency}&amount=${amount}&format=json`
  );

  const convertedAmount = await responseData.json();

  res.json({ message: convertedAmount });
};

exports.getEntityInfo = async (req, res, next) => {
  const { taxNumber } = req.params;

  const responseData = await fetch(
    `https://infocui.ro/system/api/data/?key=${process.env.INFOCUI_KEY}&cui=${taxNumber}`
  );

  const entityInfo = await responseData.json();

  res.json({ message: entityInfo });
};

exports.replaceUserIds = async (req, res, next) => {
  const { newUserId, oldUserId } = req.body;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await Order.updateMany(
      {
        userId: oldUserId,
      },
      { $set: { userId: newUserId } }
    );

    await AddedItem.updateMany(
      {
        userId: oldUserId,
      },
      { $set: { userId: newUserId } }
    );

    await Invoice.updateMany(
      {
        userId: oldUserId,
      },
      { $set: { userId: newUserId } }
    );

    await Client.updateMany(
      {
        userId: oldUserId,
      },
      { $set: { userId: newUserId } }
    );

    await Receipt.updateMany(
      {
        userId: oldUserId,
      },
      { $set: { userId: newUserId } }
    );

    await Transaction.updateMany(
      {
        userId: oldUserId,
      },
      { $set: { userId: newUserId } }
    );

    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(error, 401));
  }

  res.json({ message: 'success' });
};

exports.createInvoiceReceiptTransactions = async (req, res, next) => {
  const { userId } = req.body;

  let userInvoices;
  try {
    userInvoices = Invoice.find({ userId });
  } catch (error) {
    return next(new HttpError('eroare la gasirea facturilor', 404));
  }

  (await userInvoices).forEach(async (invoice) => {
    for (const payment of invoice.payments) {
      const newTransaction = new Transaction({
        userId: invoice.userId,
        type: 'payment',
        method: 'bank',
        date: payment.dateCashed,
        amount: payment.cashedAmount,
        document: 'ordin de plată',
        description: `contravaloarea facturii ${invoice.prefix}/${
          invoice.number
        } emisă pe ${new Date(invoice.issuedDate).toLocaleDateString('ro')}`,
      });

      try {
        await newTransaction.save();
      } catch (error) {
        return next(new HttpError('eroare la crearea tranzactiilor', 401));
      }
    }
  });

  res.json({ confirmation: 'success' });
};

exports.addTransactionProperty = async (req, res, next) => {
  await Transaction.updateMany({}, { $set: { currency: 'RON' } });

  res.json({ confirmation: 'property added to all transactions' });
};
