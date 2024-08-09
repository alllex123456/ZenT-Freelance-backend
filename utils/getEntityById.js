const HttpError = require('../models/http-error');

exports.getEntityById = async (identifier, Model, next, populateProperty) => {
  let entity;

  if (populateProperty) {
    try {
      entity = await Model.findById(identifier).populate(populateProperty);
    } catch (error) {
      return next(
        new HttpError(
          `A survenit o problemă la interogarea bazei de date (${entity}). Vă rugăm să reîncercați.`,
          500
        )
      );
    }
  } else {
    try {
      entity = await Model.findById(identifier);
    } catch (error) {
      return next(
        new HttpError(
          `A survenit o problemă la interogarea bazei de date (${entity}). Vă rugăm să reîncercați.`,
          500
        )
      );
    }
  }

  return entity;
};
