const User = require('../models/user');

exports.checkEfacturaMessages = async (req, res, next) => {
  const userId = req.body.user;

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
  const cif = user.cnp || user.taxNumber;

  const apiUrl = `https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura?zile=30&cif=${cif}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.efacturaToken}`,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    // Handle any errors that occur during the fetch operation
    console.error('Error fetching message status:', error);
    throw error; // Throw the error if needed
  }
};
