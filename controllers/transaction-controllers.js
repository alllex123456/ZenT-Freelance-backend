const mongoose = require('mongoose');

const HttpError = require('../models/http-error');

const Transaction = require('../models/transaction');

exports.getTransactions = async (req, res, next) => {
  const { userId } = req.userData;

  let transactions;
  try {
    transactions = await Transaction.find({ userId });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 404));
  }

  res.json({
    transactions,
  });
};

exports.addTransaction = async (req, res, next) => {
  const { userId } = req.userData;

  const newTransaction = new Transaction({
    userId,
    ...req.body,
  });

  try {
    await newTransaction.save();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.user.no_authorization'), 404));
  }

  res.json({
    confirmation: req.t('success.transactions.saved'),
    transaction: newTransaction,
  });
};

exports.editTransaction = async (req, res, next) => {
  let transaction;
  try {
    transaction = await Transaction.findById(req.body._id);
  } catch (error) {
    return next(new HttpError(req.t('!!'), 404));
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (transaction[key] && value) transaction[key] = value;
  }

  try {
    await transaction.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 404));
  }

  res.json({
    confirmation: req.t('success.transactions.edited'),
    transaction,
  });
};

exports.deleteTransaction = async (req, res, next) => {
  let transaction;
  try {
    transaction = await Transaction.findById(req.body._id);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 404));
  }

  try {
    await transaction.remove();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 404));
  }

  res.json({
    confirmation: req.t('success.transactions.deleted'),
    transaction,
  });
};
