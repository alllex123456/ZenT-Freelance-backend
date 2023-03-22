const mongoose = require('mongoose');
const HttpError = require('../models/http-error');
const fetch = require('node-fetch');

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
