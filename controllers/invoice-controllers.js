const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Invoice = require('../models/invoice');
const Client = require('../models/client');
const User = require('../models/user');
const Order = require('../models/order');
const AddedItem = require('../models/added-item');

const { StatementPDF } = require('../services/pdf-statement');
const { InvoicePDF } = require('../services/pdf-invoice');
const { sendInvoice } = require('../services/mailer/documents');

exports.getAllInvoices = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.userData.userId).populate({
      path: 'clients',
      populate: {
        path: 'invoices',
      },
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let invoices;
  try {
    invoices = await Invoice.find({ _id: { $in: user.invoices } }).populate(
      'clientId userId orders addedItems'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  res.json({ message: user, invoicesOnly: invoices });
};

exports.getClientInvoices = async (req, res, next) => {
  const { clientId } = req.params;

  let invoices;
  try {
    invoices = await Invoice.find({ clientId }).populate('addedItems orders');
  } catch (error) {
    return next(new HttpError(req.t('errors.invoice.not_found'), 404));
  }

  let client;
  try {
    client = await Client.findById(clientId).populate('invoices');
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 404));
  }

  res.json({ message: invoices, client });
};

exports.getInvoice = async (req, res, next) => {
  const { invoiceId } = req.params;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate(
      'userId clientId orders addedItems'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  res.json({ message: invoice.toObject({ getters: true }) });
};

exports.createInvoice = async (req, res, next) => {
  const { userId } = req.userData;
  const {
    clientId,
    series,
    number,
    orders,
    dueDate,
    issuedDate,
    notes,
    detailedOrders,
  } = req.body;

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
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  if (client.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }
  if (!client) {
    return next(new HttpError(req.t('errors.clients.no_client'), 404));
  }

  // if (req.body.reverse) {
  //   let reversedInvoice;
  //   try {
  //     reversedInvoice = await Invoice.findById(req.body.reversedInvoice);
  //   } catch (error) {
  //     return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  //   }

  //   reversedInvoice.reversed = true;

  //   await reversedInvoice.save();

  //   const orderIds = orders.filter((order) => !order.addedItem);
  //   let reversedOrders;
  //   try {
  //     reversedOrders = await Order.find({ _id: { $in: orderIds } });
  //   } catch (error) {
  //     return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  //   }
  //   reversedOrders.forEach(async (order) => {
  //     order.count = -order.count;
  //     order.total = -order.total;
  //     await order.save();
  //   });

  //   const addedItemIds = orders.filter((order) => !order.addedItem);
  //   let addedItems;
  //   try {
  //     addedItems = await Order.find({ _id: { $in: addedItemIds } });
  //   } catch (error) {
  //     return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  //   }
  //   addedItems.forEach(async (item) => {
  //     item.count = -item.count;
  //     item.total = -item.total;
  //     await item.save();
  //   });
  // }

  const newInvoice = new Invoice({
    userId,
    userData: {
      _id: user._doc._id,
      VATpayer: user._doc.VATpayer,
      VATrate: user._doc.VATrate,
      name: user._doc.name,
      registeredOffice: user._doc.registeredOffice,
      registrationNumber: user._doc.registrationNumber,
      taxNumber: user._doc.taxNumber,
      email: user._doc.email,
      phone: user._doc.phone,
    },
    clientData: {
      _id: client._doc._id,
      VATpayer: client._doc.VATpayer,
      VATrate: client._doc.VATrate,
      name: client._doc.name,
      registeredOffice: client._doc.registeredOffice,
      registrationNumber: client._doc.registrationNumber,
      taxNumber: client._doc.taxNumber,
      email: client._doc.email,
      phone: client._doc.phone,
      language: client._doc.language,
      currency: client._doc.currency,
      decimalPoints: client._doc.decimalPoints,
    },
    clientId,
    series,
    number,
    orders: orders.filter((order) => !order.addedItem),
    dueDate,
    issuedDate,
    cashed: false,
    notes,
    reversing: req.body.reverse,
    reversedInvoice: req.body.reversedInvoice,
    detailedOrders,
    payment: {
      cashedAmount: 0,
      dateCashed: '',
      receipt: '',
    },
    bankAccounts: [...user._doc.bankAccounts],
  });

  const addedItems = orders.filter((order) => order.addedItem);

  user.invoices.push(newInvoice);
  client.invoices.push(newInvoice);
  user.invoiceStartNumber = number + 1;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    if (addedItems.length !== 0) {
      addedItems.forEach(async (item) => {
        const newAddedItem = new AddedItem({
          addedItem: true,
          userId,
          clientId,
          invoiceId: newInvoice._id,
          description: item.description,
          discount: item.discount,
          count: item.count,
          rate: item.rate,
          total: item.total,
        });

        newInvoice.addedItems.push(newAddedItem);
        user.addedItems.push(newAddedItem);
        client.addedItems.push(newAddedItem);

        await newAddedItem.save();
      });
    }

    await user.save({ session });
    await client.save({ session });
    await newInvoice.save({ session });

    await Order.updateMany(
      {
        _id: { $in: req.body.orders.filter((order) => !order.addedItem) },
      },
      { $set: { status: 'invoiced', invoiceId: newInvoice._id } }
    );

    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.issue_fail'), 401));
  }

  const issuedInvoice = {
    ...newInvoice._doc,
    clientId: {
      ...client._doc,
    },
  };

  res.json({
    message: req.body.reverse
      ? req.t('success.invoicing.reversed_issued')
      : req.t('success.invoicing.issued'),
    issuedInvoice,
  });
};

exports.generateInvoice = async (req, res, next) => {
  const { invoiceId } = req.params;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate(
      'orders addedItems clientId userId reversedInvoice'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  if (req.userData.userId !== invoice.userId.id) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  try {
    InvoicePDF(req, res, invoice);
  } catch (error) {
    return next(new HttpError(req.t('errors.PDF.gen_failed'), 500));
  }
};

exports.sendInvoice = async (req, res, next) => {
  const { userId } = req.userData;
  const { invoiceId, clientId, email, message, includeStatement } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let client;
  try {
    client = await Client.findById(clientId);
  } catch (error) {
    return next(new HttpError(req.t('errors.client.not_found'), 500));
  }

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate('orders addedItems');
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
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
  if (!invoice) {
    return next(new HttpError(req.t('errors.invoicing.no_invoice'), 404));
  }

  const invoiceItems = invoice.detailedOrders
    ? invoice.orders.concat(invoice.addedItems)
    : invoice.addedItems;
  const totalInvoice = invoiceItems.reduce(
    (acc, item) =>
      (acc += item.total + (item.total * invoice.userData.VATrate) / 100),
    0
  );

  const body = {
    message,
    series: invoice.series,
    number: invoice.number,
    totalInvoice,
    dueDate: invoice.dueDate,
  };

  message.replace('{series}', invoice.series);
  message.replace('{number}', invoice.number);
  message.replace('{total}', totalInvoice);
  message.replace('{date}', invoice.dueDate);

  try {
    if (includeStatement) {
      StatementPDF(res, client, user, req.body.date, req, invoice.orders);
    }
    sendInvoice(user, client, body, req, email);
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.send_failed'), 500));
  }

  res.json({
    confirmation: req.t('success.invoicing.sent'),
  });
};

exports.modifyInvoice = async (req, res, next) => {
  const { invoiceOrders } = req.body;

  try {
    await Invoice.updateOne(
      { _id: req.body.invoiceId },
      {
        $set: {
          dueDate: req.body.dueDate,
          issuedDate: req.body.issuedDate,
        },
      }
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.update_failed'), 401));
  }

  if (!invoiceOrders)
    return res.json({ confirmation: req.t('success.invoicing.modified') });

  res.json({ message: req.t('success.invoicing.modified') });
};

exports.deleteInvoice = async (req, res, next) => {
  const { invoiceId } = req.params;
  const { removeOrders } = req.query;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate('userId clientId');
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.update_failed'), 401));
  }

  if (!invoice) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 401));
  }

  if (invoice.userId.id.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  if (invoice.cashed) {
    return next(
      new HttpError(req.t('errors.invoicing.cannot_delete_cashed'), 401)
    );
  }

  invoice.userId.invoices.pull(invoice);
  invoice.clientId.invoices.pull(invoice);
  invoice.userId.invoiceStartNumber -= 1;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await invoice.remove({ session });
    await invoice.userId.save({ session });
    await invoice.clientId.save({ session });

    if (removeOrders === 'true') {
      await User.updateOne(
        { _id: invoice.userId },
        { $pullAll: { orders: invoice.orders } },
        { session }
      );
      await Client.updateOne(
        { _id: invoice.clientId },
        { $pullAll: { orders: invoice.orders } },
        { session }
      );
      await Order.deleteMany({ _id: { $in: invoice.orders } }, { session });
    }

    if (removeOrders === 'false') {
      await Order.updateMany(
        { _id: { $in: invoice.orders } },
        { $set: { status: 'completed' } },
        { session }
      );
    }

    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.cancel_failed'), 500));
  }

  res.json({ message: req.t('success.invoicing.canceled') });
};

exports.cashInvoice = async (req, res, next) => {
  let invoice;
  try {
    invoice = await Invoice.findById(req.body.invoiceId).populate(
      'clientId orders addedItems'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  invoice.payment.cashedAmount = req.body.cashedAmount;
  invoice.payment.dateCashed = req.body.dateCashed;
  invoice.payment.receipt = req.body.receipt;

  const invoicedItems = invoice.detailedOrders
    ? invoice.orders.concat(invoice.addedItems)
    : invoice.addedItems;
  const totalInvoice = invoicedItems.reduce(
    (acc, item) => (acc += item.total + (item.total * invoice.VATrate) / 100),
    0
  );

  if (req.body.cashedAmount === totalInvoice) {
    invoice.cashed = true;
  } else {
    invoice.cashed = false;
  }

  try {
    await invoice.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.update_failed'), 500));
  }

  res.json({
    confirmation: req.body.modifyPayment
      ? req.t('success.invoicing.modified')
      : req.t('success.invoicing.cashed'),
    invoice,
  });
};

exports.reverseInvoice = async (req, res, next) => {
  let invoice;
  try {
    invoice = await Invoice.findById(req.body.invoiceId).populate(
      'userId clientId'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  if (invoice.userId.id.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  invoice.reversed = true;

  const newInvoice = new Invoice({
    userId: invoice.userId.id,
    clientId: invoice.clientId.id,
    series: invoice.userId.invoiceSeries,
    number: invoice.userId.invoiceStartNumber,
    orders: [],
    dueDate: req.body.dueDate,
    issuedDate: req.body.issuedDate,
    totalInvoice: req.body.totalInvoice,
    cashed: false,
  });

  invoice.userId.invoices.push(newInvoice);
  invoice.clientId.invoices.push(newInvoice);
  invoice.userId.invoiceStartNumber += 1;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await invoice.save({ session });
    await newInvoice.save({ session });
    await invoice.userId.save({ session });
    await invoice.clientId.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.reversed_failed'), 500));
  }

  res.json({ message: req.t('success.invoicing.reversed') });
};
