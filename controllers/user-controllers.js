const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const User = require('../models/user');

SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey =
  process.env.SENDINBLUE_KEY;

exports.getUserData = async (req, res, next) => {
  const { userId } = req.userData;

  let user;

  try {
    user = await User.findById(userId, '-password');
  } catch (error) {
    return next(new HttpError(reg.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  res.json({ message: user.toObject({ getters: true }) });
};

exports.signup = async (req, res, next) => {
  const { email, password, language, preferredCurrency, name } = req.body;

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
    invoiceSeries = '{serie}',
    invoiceNumber = '{numar}',
    dueDate = '{data scadenta}',
    totalInvoice = '{total}'
  ) => {
    return language === 'RO'
      ? `Stimate client, vi s-a emis factura seria ${invoiceSeries} numărul ${invoiceNumber}, în valoare totală de ${totalInvoice} și scadentă la ${dueDate}. Factura, împreună cu situația lucrărilor facturate, se regăsesc atașate acestui mesaj. Vă mulțumesc!`
      : `Dear Client, please find attached your invoice series ${invoiceSeries} no. ${invoiceNumber}, in total amount of ${totalInvoice} and due by ${dueDate}. The detailed work statement is also attached to this message. Thank you!`;
  };

  const user = new User({
    subscription: 'free',
    email,
    password: hashedPassword,
    alias: name,
    language,
    preferredCurrency,
    theme: 'default',
    invoiceSeries: '',
    invoiceStartNumber: 1,
    invoiceDefaultDue: 5,
    invoiceTemplate: invoiceTemplate(),
    clients: [],
    orders: [],
    invoices: [],
    notes: [],
  });

  try {
    await user.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.registration_failed'), 500));
  }

  let token;
  try {
    token = jwt.sign({ user }, 'zent-freelance-key', { expiresIn: '24h' });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.token_gen_failed'), 500));
  }

  await new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
    subject:
      language === 'RO'
        ? 'Confirmarea înregistrării în sistemul ZenT-Freelance'
        : 'Confirmation of your ZenT-Freelance account',
    sender: { email: 'alextanase454@gmail.com', name: 'ZenT-Freelance' },
    replyTo: { email: 'alextanase454@gmail.com', name: 'ZenT-Freelance' },
    to: [{ name: `${user.email}`, email: `${user.email}` }],
    htmlContent:
      language === 'RO'
        ? `<html><body><h4>Prin acest mesaj vi se confirmă înregistrarea ca utilizator în sistemul ZenT-Freelance.</h4><p>CONDIȚII DE UTILIZARE</p><ul><li>Acest program este în variantă BETA și poate prezenta probleme de fiabilitate până la ieșirea din faza de testare.</li><li>La fel ca în cazul oricărui software, funcționarea neîntreruptă și fără erori nu este garantată.</li><li>Cu toate acestea, au fost implementate toate măsurile pentru a împiedica pierderea de date.</li><li>Vă rugăm să raportați orice probleme de funcționare către această adresă de email.</li></ul></body></html>`
        : `<html><body><h4>This is to confirm your account registration on ZenT-Freelance.</h4><p>USER TERMS</p><ul><li>This software is in BETA version and may have reliability issues until testing is finished.</li><li>As in any other software, uninterrupted and error-free operation is not guaranteed.</li><li>Nonetheless, all measures have been taken to prevent data loss.</li><li>Please report any issues to this email.</li></ul></body></html>`,
  });

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
    token = jwt.sign({ user }, 'zent-freelance-key', { expiresIn: '24h' });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.token_gen_failed'), 500));
  }

  res.json({ user: { ...user._doc, password: '' }, token });
};

exports.updateUser = async (req, res, next) => {
  const { userId } = req.userData;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.check_failed'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }

  if (req.file) {
    fs.unlink('uploads/avatars/' + user.avatar, (err) => console.log(err));
    user.avatar = req.file.filename;
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (value) {
      user[key] = value;
    }
  }

  try {
    await user.save();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.user.update_failed'), 500));
  }

  res.json({
    confirmation: req.t('success.user.updated'),
    message: req.file,
  });
};

exports.getRecoverPassword = async (req, res, next) => {
  const { email } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(req.t('errors.user.validation'), 500));
  }

  let user;
  try {
    user = await User.find({ email });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 401));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  let token;
  try {
    token = jwt.sign({ email }, 'zent-freelance-key', { expiresIn: '1h' });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.token_gen_failed'), 500));
  }

  try {
    await new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      subject:
        user.language === 'RO'
          ? 'Resetare parolă ZenT-Freelance'
          : 'ZenT-Freelance password reset',
      sender: { email: 'alextanase454@gmail.com', name: 'ZenT-Freelance' },
      replyTo: { email: 'alextanase454@gmail.com', name: 'ZenT-Freelance' },
      to: [{ name: `${email}`, email: `${email}` }],
      htmlContent:
        user.language === 'RO'
          ? `<html><body><h4>Mergeți la următorul link pentru resetarea parolei în ZenT-Freelance:</h4><a href="http://localhost:3000/reset-password?email=${email}&token=${token}">RESETARE</a><p>Link-ul pentru resetarea parolei este valabil 1 oră.</p></body></html>`
          : `<html><body><h4>Please go to the following link to reset your ZenT-Freelance password:</h4><a href="http://localhost:3000/reset-password?email=${email}&token=${token}">RESET</a><p>the password reset link is valid for 1 hour.</p></body></html>`,
    });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.reset_link_failed'), 500));
  }

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
