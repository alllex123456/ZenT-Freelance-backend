const mongoose = require('mongoose');
const HttpError = require('../models/http-error');

const App = require('../models/application');

exports.getAppSettings = async (req, res, next) => {
  let appSettings;

  try {
    appSettings = await App.find({});
  } catch (error) {
    return next(
      new HttpError(
        req.t('database.connection_failed'),
        500
      )
    );
  }

  res.json({ message: appSettings[0] });
};
