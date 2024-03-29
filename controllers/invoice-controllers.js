const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Invoice = require('../models/invoice');
const Client = require('../models/client');
const User = require('../models/user');
const Order = require('../models/order');
const AddedItem = require('../models/added-item');
const Receipt = require('../models/receipt');
const Transaction = require('../models/transaction');

const { InvoicePDF } = require('../services/pdf-invoice');
const { ReceiptPDF } = require('../services/pdf-receipt');

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

  res.json({
    message: user,
    invoicesOnly: invoices,
  });
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
      'userId clientId orders addedItems payments receipts reversedInvoice'
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
    prefix,
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

  if (req.body.reversing) {
    let reversedInvoice;
    try {
      reversedInvoice = await Invoice.findById(req.body.reversedInvoice);
    } catch (error) {
      return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
    }

    reversedInvoice.reversing = true;
    reversedInvoice.cashed = true;

    await reversedInvoice.save();

    const orderIds = orders.filter((order) => !order.addedItem);
    let reversedOrders;
    try {
      reversedOrders = await Order.find({ _id: { $in: orderIds } });
    } catch (error) {
      return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
    }
    reversedOrders.forEach(async (order) => {
      order.count = -order.count;
      order.total = -order.total;
      await order.save();
    });

    const addedItemIds = orders.filter((order) => !order.addedItem);
    let addedItems;
    try {
      addedItems = await Order.find({ _id: { $in: addedItemIds } });
    } catch (error) {
      return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
    }
    addedItems.forEach(async (item) => {
      item.count = -item.count;
      item.total = -item.total;
      await item.save();
    });
  }

  const newInvoice = new Invoice({
    userId,
    userData: {
      _id: user._doc._id,
      avatar: user._doc.avatar,
      VATpayer: user._doc.VATpayer,
      VATrate: user._doc.VATrate,
      name: user._doc.name,
      registeredOffice: user._doc.registeredOffice,
      registrationNumber: user._doc.registrationNumber,
      taxNumber: user._doc.taxNumber,
      email: user._doc.email,
      phone: user._doc.phone,
      invoiceLogo: user._doc.invoiceLogo,
      country: user._doc.country,
      county: user._doc.county,
      streetAddress: user._doc.streetAddress,
      city: user._doc.city,
    },
    clientData: {
      _id: client._doc._id,
      avatar: client._doc.avatar,
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
      country: client._doc.country,
      county: client._doc.county,
      streetAddress: client._doc.streetAddress,
      city: client._doc.city,
    },
    clientId,
    prefix,
    number,
    orders: orders.filter((order) => !order.addedItem),
    dueDate,
    issuedDate,
    cashed: req.body.reversing ? true : false,
    notes,
    reversedInvoice: req.body.reversedInvoice,
    previousClientBalance: req.body.previousClientBalance,
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
      'orders addedItems reversedInvoice'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  if (req.userData.userId !== invoice.userId.toString()) {
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
  const { invoiceId, clientId, email, includeStatement } = req.body;

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

  try {
    InvoicePDF(req, res, invoice, email, includeStatement);
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

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    if (invoice.clientId.archived) {
      await Order.deleteMany({ _id: { $in: invoice.orders } }, { session });
      await User.updateOne(
        { _id: invoice.userId },
        {
          $pullAll: {
            orders: invoice.orders,
            addedItems: invoice.addedItems,
          },
          $pull: { invoices: invoice._id },
          invoiceStartNumber: invoice.userId.invoiceStartNumber - 1,
        },
        { session }
      );
    } else {
      if (removeOrders === 'true') {
        await User.updateOne(
          { _id: invoice.userId },
          {
            $pullAll: {
              orders: invoice.orders,
              addedItems: invoice.addedItems,
            },
            $pull: { invoices: invoice._id },
            invoiceStartNumber: invoice.userId.invoiceStartNumber - 1,
          },
          { session }
        );
        await Client.updateOne(
          { _id: invoice.clientId },
          {
            $pullAll: {
              orders: invoice.orders,
              addedItems: invoice.addedItems,
            },
            $pull: { invoices: invoice._id },
          },
          { session }
        );
        await Order.deleteMany({ _id: { $in: invoice.orders } }, { session });
      } else {
        await Order.updateMany(
          { _id: { $in: invoice.orders } },
          { $set: { status: 'completed' } },
          { session }
        );
        await User.updateOne(
          { _id: invoice.userId },
          {
            $pullAll: { addedItems: invoice.addedItems },
            invoiceStartNumber: invoice.userId.invoiceStartNumber - 1,
          },
          { session }
        );
        await Client.updateOne(
          { _id: invoice.clientId },
          {
            $pullAll: { addedItems: invoice.addedItems },
          },
          { session }
        );
      }
    }

    await AddedItem.deleteMany(
      { _id: { $in: invoice.addedItems } },
      { session }
    );

    await invoice.remove({ session });

    session.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.invoicing.cancel_failed'), 500));
  }

  res.json({
    message: req.t('success.invoicing.canceled'),
    invoice,
  });
};

exports.cashInvoice = async (req, res, next) => {
  let invoice;
  try {
    invoice = await Invoice.findById(req.body.invoiceId).populate(
      'userId clientId orders addedItems payments receipts'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  const invoicedItems = invoice.detailedOrders
    ? invoice.orders.concat(invoice.addedItems)
    : invoice.addedItems;
  const totalInvoice = Number(
    (
      invoicedItems.reduce(
        (acc, item) =>
          (acc += item.total + (item.total * invoice.userData.VATrate) / 100),
        0
      ) + invoice.previousClientBalance
    ).toFixed(invoice.clientData.decimalPoints)
  );

  if (!req.body.cashReceipt) {
    invoice.payments.push({
      cashedAmount: req.body.cashedAmount,
      dateCashed: req.body.dateCashed,
      prefix: req.body.prefix,
    });

    const totalPaid = Number(
      invoice.payments
        .concat(invoice.receipts)
        .reduce((acc, payment) => (acc += payment.cashedAmount), 0)
        .toFixed(invoice.clientData.decimalPoints)
    );

    if (totalPaid < totalInvoice) {
      invoice.cashed = false;
    } else {
      invoice.cashed = true;
    }

    const newTransaction = new Transaction({
      userId: invoice.userId._id,
      type: 'receipt',
      method: 'bank',
      date: req.body.dateCashed,
      amount: req.body.cashedAmount,
      currency: invoice.clientData.currency,
      document: req.body.prefix || req.t('transaction.po'),
      description: `${req.t('transaction.consideration')} ${invoice.prefix}/${
        invoice.number
      } ${req.t('transaction.issuedOn')} ${new Date(
        invoice.issuedDate
      ).toLocaleDateString(invoice.userId.language)}`,
    });

    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      await invoice.save({ session });
      await newTransaction.save({ session });

      session.commitTransaction();
    } catch (error) {
      return next(new HttpError(req.t('errors.invoicing.update_failed'), 500));
    }
  }

  if (req.body.cashReceipt) {
    const newReceipt = new Receipt({
      userId: invoice.userId._id,
      clientId: invoice.clientId._id,
      invoiceId: invoice._id,
      prefix: req.body.receiptPrefix,
      number: req.body.receiptStartNumber,
      cashedAmount: req.body.cashedAmount,
      dateCashed: req.body.dateCashed,
    });

    const newTransaction = new Transaction({
      userId: invoice.userId._id,
      type: 'receipt',
      method: 'cash',
      date: req.body.dateCashed,
      amount: req.body.cashedAmount,
      currency: invoice.clientData.currency,
      document: `${req.t('transaction.receipt')} ${req.body.receiptPrefix}/${
        req.body.receiptStartNumber
      }`,
      description: `${req.t('transaction.consideration')} ${invoice.prefix}/${
        invoice.number
      } ${req.t('transaction.issuedOn')} ${new Date(
        invoice.issuedDate
      ).toLocaleDateString(invoice.userId.language)}`,
    });

    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      invoice.userId.receipts.push(newReceipt);
      invoice.userId.receiptStartNumber++;
      invoice.clientId.receipts.push(newReceipt);
      invoice.receipts.push(newReceipt);

      const totalPaid = invoice.payments
        .concat(invoice.receipts)
        .reduce((acc, payment) => (acc += payment.cashedAmount), 0);

      if (totalPaid < totalInvoice) {
        invoice.cashed = false;
      } else {
        invoice.cashed = true;
      }

      await newReceipt.save({ session });
      await newTransaction.save();
      await invoice.save({ session });
      await invoice.userId.save({ session });
      await invoice.clientId.save({ session });

      session.commitTransaction();
    } catch (error) {
      return next(new HttpError(req.t('errors.invoicing.update_failed'), 500));
    }
  }

  res.json({
    confirmation: req.t('success.invoicing.cashed'),
    invoice: invoice.toObject({ getters: true }),
  });
};

exports.modifyPayment = async (req, res, next) => {
  let invoice;
  try {
    invoice = await Invoice.findById(req.body.invoiceId).populate(
      'userId clientId orders addedItems payments receipts'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  req.body.inputs.forEach(async (input) => {
    if (input.number) {
      let receipt;
      try {
        receipt = await Receipt.findById(input._id);
      } catch (error) {}

      for (const [key, value] of Object.entries(input)) {
        if (value) {
          receipt[key] = value;
        }
      }

      const changedReceiptIndex = invoice.receipts.findIndex(
        (receipt) => receipt._id.toString() === input._id
      );

      for (const [key, value] of Object.entries(input)) {
        if (value) {
          invoice.receipts[changedReceiptIndex][key] = value;
        }
      }

      try {
        await receipt.save();
      } catch (error) {
        return next(
          new HttpError(req.t('errors.invoicing.update_failed'), 500)
        );
      }
    }
  });

  req.body.inputs.forEach(async (input) => {
    if (!input.number) {
      const changedIndex = invoice.payments.findIndex(
        (receipt) => receipt._id.toString() === input._id
      );
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          invoice.payments[changedIndex][key] = value;
        }
      }
    }
  });

  const invoicedItems = invoice.detailedOrders
    ? invoice.orders.concat(invoice.addedItems)
    : invoice.addedItems;
  const totalInvoice =
    invoicedItems.reduce(
      (acc, item) =>
        (acc += item.total + (item.total * invoice.userData.VATrate) / 100),
      0
    ) + invoice.previousClientBalance;
  const totalPaid = invoice.payments
    .concat(invoice.receipts)
    .reduce((acc, payment) => (acc += payment.cashedAmount), 0);

  if (totalPaid < totalInvoice) {
    invoice.cashed = false;
  } else {
    invoice.cashed = true;
  }

  try {
    await invoice.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.update_failed'), 500));
  }

  res.json({
    confirmation: req.t('success.invoicing.modified'),
    invoice: invoice.toObject({ getters: true }),
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
    prefix: invoice.userId.invoicePrefix,
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

exports.downloadReceipt = async (req, res, next) => {
  let receipt;
  try {
    receipt = await Receipt.findById(req.params.receiptId)
      .populate('userId clientId')
      .populate({
        path: 'invoiceId',
        populate: {
          path: 'orders addedItems clientData',
        },
      });
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 404));
  }

  ReceiptPDF(res, receipt);
};
