const mongoose = require('mongoose');

const HttpError = require('../models/http-error');

const User = require('../models/user');
const AddedItem = require('../models/added-item');
const Client = require('../models/client');
const Invoice = require('../models/invoice');

exports.addAddedItem = async (req, res, next) => {
  const { userId } = req.userData;
  const { clientId, invoiceId } = req.body;
  const { inputs } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }

  let client;
  try {
    client = await Client.findById(clientId);
  } catch (error) {
    return next(new HttpError(req.t('errors.client.not_found'), 404));
  }

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId);
  } catch (error) {
    return next(new HttpError(req.t('errors.invoice.not_found'), 404));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }

  const newAddedItem = new AddedItem({
    addedItem: true,
    userId,
    clientId,
    invoiceId,
    ...inputs,
  });

  // user.addedItems.push(newAddedItem);
  client.addedItems.push(newAddedItem);
  invoice.addedItems.push(newAddedItem);

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await newAddedItem.save({ session });
    await user.save({ session });
    await client.save({ session });
    await invoice.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.items.save_failed'), 500));
  }

  res.json({
    item: newAddedItem,
    confirmation: req.t('success.items.added'),
  });
};

exports.modifyAddedItem = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_user'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 500));
  }

  let addedItem;
  try {
    addedItem = await AddedItem.findById(req.body._id);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_user'), 500));
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (value) {
      addedItem[key] = value;
    }
  }

  try {
    await addedItem.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.items.modify_failed'), 500));
  }

  res.json({
    item: addedItem,
    confirmation: req.t('success.items.modified'),
  });
};

exports.deleteAddedItem = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_user'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 500));
  }

  let addedItem;
  try {
    addedItem = await AddedItem.findById(req.body.itemId).populate(
      'userId clientId invoiceId'
    );
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_user'), 500));
  }

  addedItem.userId.addedItems.pull(addedItem);
  addedItem.clientId.addedItems.pull(addedItem);
  addedItem.invoiceId.addedItems.pull(addedItem);

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await addedItem.remove({ session });
    await addedItem.userId.save({ session });
    await addedItem.clientId.save({ session });
    await addedItem.invoiceId.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.items.delete_failed'), 500));
  }

  res.json({
    item: addedItem,
    confirmation: req.t('success.items.deleted'),
  });
};
