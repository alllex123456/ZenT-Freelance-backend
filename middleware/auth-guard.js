const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error(req.t('errors.user.no_token'));
    }

    const decodedToken = jwt.verify(token, 'zent-freelance-key');
    req.userData = { userId: decodedToken.user._id };

    next();
  } catch (error) {
    console.log(error);
    return next(new HttpError(req.t('errors.user.no_token'), 401));
  }
};
