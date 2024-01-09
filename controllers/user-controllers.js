const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const User = require('../models/user');
const Client = require('../models/client');
const { signupEmail, resetPasswordLink } = require('../services/mailer/user');
const { generateXMLInvoice } = require('../utils/generateXMLInvoice');

exports.checkInvoiceStatus = async (req, res, next) => {
  const { id } = req.params;

  // Construct the URL with the provided val1 parameter
  const apiUrl = ` https://api.anaf.ro/prod/FCTEL/rest/stareMesaj?id_incarcare=${id}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.efacturaToken}`, // Include the Authorization token in the headers
      },
    });

    // Check if the response is successful
    if (response.ok) {
      const xmlData = await response.text(); // Get the XML response text
      xml2js.parseString(xmlData, (err, result) => {
        // Parse XML to JSON
        if (err) {
          console.error('Error parsing XML:', err);
          res.status(500).json({ error: 'Error parsing XML response' });
        } else {
          res.json(result); // Send the parsed JSON response
        }
      });
    } else {
      // Handle the error if the response is not successful
      console.error('Failed to fetch message status:', response.statusText);
      throw new Error(`Failed to fetch message status: ${response.statusText}`);
    }
  } catch (error) {
    // Handle any errors that occur during the fetch operation
    console.error('Error fetching message status:', error);
    throw error; // Throw the error if needed
  }
};

exports.uploadXMLInvoice = async (req, res, next) => {
  const userId = req.body.userId._id;

  if (userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  let user;

  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  const cif = req.body.userId.cnp || req.body.userId.taxNumber;

  const apiUrl = `https://api.anaf.ro/prod/ FCTEL/rest/upload?standard=UBL&cif=${cif}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${user.efacturaToken}`, // Include the Authorization token in the headers
      },
      body: generateXMLInvoice(req.body),
    });

    // Check if the response is successful
    if (response.ok) {
      const xmlData = await response.text(); // Get the XML response text
      xml2js.parseString(xmlData, (err, result) => {
        // Parse XML to JSON
        if (err) {
          console.error('Error parsing XML:', err);
          res.status(500).json({ error: 'Error parsing XML response' });
        } else {
          res.json(result); // Send the parsed JSON response
        }
      });
    } else {
      // Handle the error if the response is not successful
      console.error('Failed to fetch message status:', response.statusText);
      throw new Error(`Failed to fetch message status: ${response.statusText}`);
    }
  } catch (error) {
    // Handle any errors that occur during the fetch operation
    console.error('Error fetching message status:', error);
    throw error; // Throw the error if needed
  }
};

exports.saveAccessToken = async (req, res, next) => {
  const { userId, token } = req.userData;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.check_failed'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 404));
  }

  user[eFacturaToken] = token;

  try {
    await user.save();
  } catch (error) {
    return next(new HttpError(req.t('errors.user.update_failed'), 500));
  }

  res.json({
    confirmation: req.t('success.user.updated'),
  });
};

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
  if (req.body.email !== 'demo@user.zent') {
    return next(new HttpError('Registrations are closed!', 500));
  }

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
    invoicePrefix: '',
    invoiceStartNumber: 1,
    invoiceDefaultDue: 5,
    invoiceLogo: '',
    clients: [],
    orders: [],
    addedItems: [],
    invoices: [],
    receipts: [],
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

  signupEmail(user, req);

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
    token = jwt.sign({ user }, process.env.JWT_KEY, {
      expiresIn: Math.floor(Date.now() / 1000) + 60 * 60 * 168,
    });
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
    user[key] = value;
  }

  if (req.body.VATpayer === true) {
    await Client.updateMany({ userId }, { $set: { decimalPoints: 2 } });
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

  if (currentPassword && newPassword) {
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

  resetPasswordLink(user, token, req);

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
