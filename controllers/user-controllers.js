const fs = require('fs');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const User = require('../models/user');
const { signupEmail, resetPasswordLink } = require('../services/mailer/user');

exports.getUserData = async (req, res, next) => {
  const { userId } = req.userData;

  let user;

  try {
    user = await User.findById(userId, '-password');
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  res.json({ message: user.toObject({ getters: true }) });
};

exports.signup = async (req, res, next) => {
  const { timeZone, email, password, language, currency, name } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        req.t('errors.user.pass_email_validation') +
          errors.errors.map((error) => error.msg),
        500
      )
    );
  }

  let hasUser;
  try {
    hasUser = await User.findOne({ email });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.check_failed'), 500));
  }

  if (hasUser) {
    return next(new HttpError(req.t('errors.user.email_exists'), 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.pass_generate_fail'), 500));
  }

  const invoiceTemplate = (
    invoiceSeries = '{series}',
    invoiceNumber = '{number}',
    dueDate = '{date}',
    totalInvoice = '{total}'
  ) => {
    return {
      ro: `Stimate client, vi s-a emis factura seria ${invoiceSeries} numărul ${invoiceNumber}, în valoare totală de ${totalInvoice} și scadentă la ${dueDate}. Factura se regăsește atașată acestui mesaj. Vă mulțumim!`,
      en: `Dear Client, please find attached your invoice series ${invoiceSeries} no. ${invoiceNumber}, in total amount of ${totalInvoice} and due by ${dueDate}. Thank you!`,
    };
  };

  const statementTemplate = () => {
    return {
      ro: 'Stimate client, regăsiți în atașament evidența lucrărilor predate la zi. Vă mulțumim.',
      en: 'Dear Client, please find attached our detailed work statement up to date. Thank you.',
    };
  };

  const user = new User({
    subscription: {
      package: 'free',
      expiresAt: '',
    },
    theme: 'default',
    timeZone,
    email,
    password: hashedPassword,
    alias: name,
    language,
    currency,
    avatar: '',
    name: '',
    phone: '',
    registeredOffice: '',
    registrationNumber: '',
    taxNumber: '',
    VATpayer: false,
    VATrate: 0,
    invoiceNotes: '',
    invoiceSeries: '',
    invoiceStartNumber: 1,
    invoiceDefaultDue: 5,
    invoiceEmailMessage: invoiceTemplate(),
    statementEmailMessage: statementTemplate(),
    clients: [],
    orders: [],
    addedItems: [],
    invoices: [],
    notes: [],
    bankAccounts: [
      { bank: '', iban: '', swift: '' },
      { bank: '', iban: '', swift: '' },
      { bank: '', iban: '', swift: '' },
    ],
  });

  try {
    await user.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.registration_failed'), 500));
  }

  let token;
  try {
    token = jwt.sign({ user }, process.env.JWT_KEY, { expiresIn: '24h' });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.token_gen_failed'), 500));
  }

  signupEmail(user);

  res.json({
    user: { ...user._doc, password: '' },
    token,
  });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  let user;
  try {
    user = await User.findOne({ email });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.check_failed'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, user.password);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.pass_check_failed'), 500));
  }

  if (!isValidPassword) {
    return next(new HttpError(req.t('errors.user.wrong_pass'), 401));
  }

  let token;
  try {
    token = jwt.sign({ user }, process.env.JWT_KEY, { expiresIn: '24h' });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.token_gen_failed'), 500));
  }

  res.json({ user: { ...user._doc, password: '' }, token });
};

exports.updateUser = async (req, res, next) => {
  const { userId } = req.userData;

  if (req.body.email && req.body.email.length === 0) return;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.check_failed'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (key === 'invoiceEmailMessage') {
      user['invoiceEmailMessage'] = {
        ...user['invoiceEmailMessage'],
        [user.language]: value,
      };
    } else if (key === 'statementEmailMessage') {
      user['statementEmailMessage'] = {
        ...user['statementEmailMessage'],
        [user.language]: value,
      };
    } else {
      user[key] = value;
    }
  }

  try {
    await user.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.update_failed'), 500));
  }

  res.json({
    confirmation: req.t('success.user.updated'),
  });
};

exports.changePassword = async (req, res, next) => {
  const { userId } = req.userData;
  const { alias, currentPassword, newPassword } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 401));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  user.alias = alias;

  if (currentPassword && newPassword && currentPassword === newPassword) {
    let isValidPassword = false;
    let hashedPassword;
    try {
      isValidPassword = await bcrypt.compare(currentPassword, user.password);
    } catch (error) {
      return next(new HttpError(req.t('errors.user.pass_check_failed'), 500));
    }

    if (!isValidPassword) {
      return next(new HttpError(req.t('errors.user.wrong_pass'), 401));
    }

    try {
      hashedPassword = await bcrypt.hash(newPassword, 12);
    } catch (error) {
      return next(new HttpError(req.t('errors.user.pass_gen_failed'), 500));
    }

    user.password = hashedPassword;
  }

  try {
    await user.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.update_failed'), 500));
  }

  res.json({ confirmation: req.t('success.user.updated') });
};

exports.getRecoverPassword = async (req, res, next) => {
  const { email } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(req.t('errors.user.validation'), 500));
  }

  let user;
  try {
    user = await User.findOne({ email });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 401));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  let token;
  try {
    token = jwt.sign({ email }, process.env.JWT_KEY, { expiresIn: '1h' });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.token_gen_failed'), 500));
  }

  resetPasswordLink(user, token);

  res.json({
    message: req.t('success.user.reset_link_sent'),
  });
};

exports.postRecoverPassword = async (req, res, next) => {
  const { password } = req.body;

  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error(req.t('errors.user.invalid_link'));
    }
    const decodedToken = jwt.verify(token, 'zent-freelance-key');
    req.userData = { email: decodedToken.email };
  } catch (error) {
    return next(new HttpError(req.t('errors.user.reset_link_expired'), 401));
  }

  let user;
  try {
    user = await User.findOne({ email: req.userData.email });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 401));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.pass_gen_failed'), 500));
  }

  user.password = hashedPassword;

  try {
    await user.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.update_failed'), 500));
  }

  res.json({ message: req.t('success.user.pass_changed') });
};
