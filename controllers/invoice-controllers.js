const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Invoice = require('../models/invoice');
const Client = require('../models/client');
const User = require('../models/user');
const Order = require('../models/order');
const AddedItem = require('../models/added-item');

const { sendInvoiceScript } = require('../utils/sendInvoiceScript');
const { StatementPDF } = require('../services/pdf-statement');
const { InvoicePDF } = require('../services/pdf-invoice');

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
      'clientId'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  res.json({ message: user, invoicesOnly: invoices });
};

exports.getClientInvoices = async (req, res, next) => {
  const { clientId } = req.params;

  let client;
  try {
    client = await Client.findById(clientId).populate('invoices');
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  if (client.userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  res.json({ message: client });
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
    orders,
    dueDate,
    issuedDate,
    totalInvoice,
    invoiceRemainder,
    clientBalance,
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

  if (req.body.reverse) {
    let reversedInvoice;
    try {
      reversedInvoice = await Invoice.findById(req.body.reversedInvoice);
    } catch (error) {
      return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
    }
    reversedInvoice.totalInvoice = -reversedInvoice.totalInvoice;
    reversedInvoice.reversed = true;

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
  }

  const newInvoice = new Invoice({
    userId,
    clientId,
    series: user.invoiceSeries,
    number: user.invoiceStartNumber,
    orders: orders.filter((order) => !order.addedItem),
    dueDate,
    issuedDate,
    totalInvoice,
    invoiceRemainder: req.body.reverse ? 0 : invoiceRemainder,
    clientBalance,
    cashed: false,
  });

  const addedItems = orders.filter((order) => order.addedItem);

  let newAddedItem;
  addedItems.forEach(async (item) => {
    newAddedItem = new AddedItem({
      userId,
      clientId,
      invoiceId: newInvoice._id,
      reference: item.reference,
      discount: item.discount,
      count: item.count,
      rate: item.rate,
      unit: item.unit,
      total: item.total,
    });

    try {
      await newAddedItem.save();
    } catch (error) {
      console.log(error);
    }
  });
  newInvoice.addedItems.push(newAddedItem);

  user.invoices.push(newInvoice);
  client.invoices.push(newInvoice);
  if (!req.body.reverse) client.remainder = +invoiceRemainder;
  if (req.body.reverse && req.body.totalInvoice < 0)
    client.remainder += totalInvoice;
  user.invoiceStartNumber += 1;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await user.save({ session });
    await client.save({ session });
    await newInvoice.save({ session });
    if (!req.body.reverse) {
      await Order.updateMany(
        {
          _id: { $in: req.body.orders.filter((order) => !order.addedItem) },
        },
        { $set: { status: 'invoiced', invoiceId: newInvoice._id } }
      );
    }
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.issue_fail'), 401));
  }

  if (req.body.reverse) {
    const reversedOrders = orders.filter((order) => !order.addedItem);
    const addedItems = orders.filter((order) => order.addedItem);

    InvoicePDF(
      req,
      res,
      {
        clientId: client,
        userId: user,
        orders: reversedOrders,
        addedItems,
        dueDate: newInvoice.dueDate,
        invoiceRemainder: newInvoice.invoiceRemainder,
      },
      +totalInvoice
    );
  } else {
    let pdfOrders;
    let addedItems;
    try {
      pdfOrders = await Order.find({
        _id: { $in: req.body.orders.filter((order) => !order.addedItem) },
      });
      addedItems = await AddedItem.find({
        _id: { $in: req.body.addedItems?.filter((item) => item.addedItem) },
      });
    } catch (error) {
      return next(new HttpError(req.t('errors.PDF.gen_failed'), 500));
    }
    InvoicePDF(
      req,
      res,
      {
        clientId: client,
        userId: user,
        orders: pdfOrders,
        addedItems,
        dueDate: newInvoice.dueDate,
        invoiceRemainder: newInvoice.invoiceRemainder,
      },
      +totalInvoice
    );
  }

  res.json({
    message: req.body.reverse
      ? req.t('success.invoicing.reversed_issued')
      : req.t('success.invoicing.issued'),
    invoiceId: newInvoice._id,
  });
};

exports.generateInvoice = async (req, res, next) => {
  const { invoiceId } = req.params;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate(
      'orders addedItems clientId userId'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  if (req.userData.userId !== invoice.userId.id) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  try {
    InvoicePDF(req, res, invoice, invoice.totalInvoice);
  } catch (error) {
    return next(new HttpError(req.t('errors.PDF.gen_failed'), 500));
  }
};

exports.sendInvoice = async (req, res, next) => {
  const { userId } = req.userData;
  const { invoiceId, clientId, email, message } = req.body;

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
    invoice = await Invoice.findById(invoiceId).populate('orders');
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  if (client.userId.toString() !== req.userData.userId) {
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

  const body = {
    message,
    series: invoice.series,
    number: invoice.number,
    totalInvoice: invoice.totalInvoice,
    dueDate: invoice.dueDate,
  };

  message.replace('{series}', invoice.series);
  message.replace('{number}', invoice.number);
  message.replace('{total}', invoice.totalInvoice);
  message.replace('{date}', invoice.dueDate);

  try {
    StatementPDF(res, client, user, req.body.date, req, invoice.orders);
  } catch (error) {
    console.log('failed to generate statement');
    console.log(error);
    return;
  }

  try {
    sendInvoiceScript(user, client, body, email, req);
  } catch (error) {
    console.log(error);
    console.log('failed to send invoice');
    return next(new HttpError(req.t('errors.invoicing.send_failed'), 500));
  }

  res.json({
    message: req.t('success.invoicing.sent'),
  });
};

exports.modifyInvoice = async (req, res, next) => {
  const { invoiceOrders, ordersEdited, ordersDeleted } = req.body;
  const deletedIds = ordersDeleted.map((order) => order.id);

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  let client;
  try {
    client = await Client.findById(req.body.clientId);
  } catch (error) {
    return next(new HttpError(req.t('errors.clients.not_found'), 500));
  }

  let invoice;
  try {
    invoice = await Invoice.findById(req.body.invoiceId);
  } catch (error) {
    return next(new HttpError(req.t('errors.invoice.not_found'), 500));
  }

  client.remainder += req.body.remainder;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await User.updateOne(
      { _id: req.userData.userId },
      {
        $pullAll: { orders: deletedIds, addedItems: deletedIds },
      },
      { session }
    );

    await Client.updateOne(
      { _id: req.body.clientId },
      {
        $pullAll: { orders: deletedIds, addedItems: deletedIds },
      },
      { session }
    );

    await Invoice.updateOne(
      { _id: req.body.invoiceId },
      {
        $set: {
          dueDate: req.body.dueDate,
          issuedDate: req.body.issuedDate,
          totalInvoice: req.body.totalInvoice,
          invoiceRemainder: req.body.remainder,
        },
        $pullAll: { orders: deletedIds, addedItems: deletedIds },
      },
      { session }
    );

    for (const order of invoiceOrders) {
      if (order.addedItem || order.discount) {
        const newAddedItem = new AddedItem({
          userId: client.id,
          clientId: client.id,
          invoiceId: req.body.invoiceId,
          addedItem: order.addedItem,
          reference: order.reference,
          discount: order.discount,
          count: order.count,
          rate: order.rate,
          unit: order.unit,
          total: order.total,
        });
        await newAddedItem.save({ session });
        user.addedItems.push(newAddedItem);
        client.addedItems.push(newAddedItem);
        invoice.addedItems.push(newAddedItem);
      }
    }

    for (const order of ordersEdited) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            reference: order.reference,
            count: order.count,
            rate: order.rate,
            total: order.total,
          },
        },
        { session }
      );
    }

    await Order.deleteMany({ _id: { $in: deletedIds } }, { session });
    await AddedItem.deleteMany({ _id: { $in: deletedIds } }, { session });

    await client.save({ session });
    await user.save({ session });
    await invoice.save({ session });

    session.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.invoicing.update_failed'), 401));
  }

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
  invoice.clientId.remainder -= invoice.remainder;

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
    invoice = await Invoice.findById(req.body.invoiceId).populate('clientId');
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  invoice.cashedAmount = req.body.cashedAmount;
  invoice.dateCashed = req.body.dateCashed;
  invoice.remainder = invoice.totalInvoice - req.body.cashedAmount;
  invoice.receipt = req.body.receipt;
  invoice.clientId.remainder += invoice.remainder;

  if (invoice.remainder <= 0) {
    invoice.cashed = true;
  }

  if (invoice.remainder > 1) {
    invoice.totalInvoice = invoice.remainder;
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await invoice.save({ session });
    await invoice.clientId.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.invoicing.not_found'), 500));
  }

  res.json({ message: req.t('success.invoicing.cashed') });
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
  invoice.clientId.remainder -= invoice.remainder;

  const newInvoice = new Invoice({
    userId: invoice.userId.id,
    clientId: invoice.clientId.id,
    series: invoice.userId.invoiceSeries,
    number: invoice.userId.invoiceStartNumber,
    orders: [],
    dueDate: req.body.dueDate,
    issuedDate: req.body.issuedDate,
    totalInvoice: req.body.totalInvoice,
    remainder: req.body.remainder,
    cashed: false,
  });

  invoice.userId.invoices.push(newInvoice);
  invoice.clientId.invoices.push(newInvoice);
  invoice.clientId.remainder += req.body.remainder;
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
