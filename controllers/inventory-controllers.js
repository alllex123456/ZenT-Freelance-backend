const mongoose = require('mongoose');

const HttpError = require('../models/http-error');

const Inventory = require('../models/inventory');

const editItemById = (masterObject, id) => {
  for (const key in masterObject) {
    if (Array.isArray(masterObject[key])) {
      const array = masterObject[key];
      for (const obj of array) {
        if (obj.id === id) {
          return obj;
        }
      }
    }
  }
};

function deleteItemById(masterObject, id) {
  for (const key in masterObject) {
    if (Array.isArray(masterObject[key])) {
      const array = masterObject[key];
      for (let i = 0; i < array.length; i++) {
        if (array[i].id === id) {
          return { parentArray: array, objectIndex: i, object: array[i] };
        }
      }
    }
  }
}

exports.getInventory = async (req, res, next) => {
  const { userId } = req.userData;

  let inventories;
  try {
    inventories = await Inventory.find({ userId });
  } catch (error) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 404));
  }

  res.json({
    inventories,
  });
};

exports.addInventoryItems = async (req, res, next) => {
  const { userId } = req.userData;

  let inventory;
  try {
    const inventoryArray = await Inventory.find({
      userId,
      year: req.body.year,
    });
    inventory = inventoryArray[0];
  } catch (error) {}

  if (!inventory) {
    inventory = new Inventory({
      userId,
      year: req.body.year,
      assets: [],
      payables: [],
      taxes: [
        { designation: req.t('accounting.incomeTax'), amount: 0 },
        { designation: req.t('accounting.socialSecurity'), amount: 0 },
        { designation: req.t('accounting.healthInsurance'), amount: 0 },
      ],
    });
  }

  inventory[`${req.body.addWhat}`].push(req.body.inputBody);

  const addedArray = inventory[`${req.body.addWhat}`];

  try {
    await inventory.save();
  } catch (error) {}

  res.json({ confirmation: '', returnItem: addedArray[addedArray.length - 1] });
};

exports.editInventoryItems = async (req, res, next) => {
  let inventory;
  try {
    inventory = await Inventory.findById(req.body.inventoryId);
  } catch (error) {}

  const foundObject = editItemById(inventory, req.body.itemId);

  if (foundObject) {
    for (const [key, value] of Object.entries(req.body.inputBody)) {
      foundObject[key] = value;
    }
  } else {
    return next(new HttpError('item not found', 500));
  }

  await inventory.save();

  res.json({ inventory });
};

exports.deleteInventoryItems = async (req, res, next) => {
  let inventory;
  try {
    inventory = await Inventory.findById(req.body.inventoryId);
  } catch (error) {}

  const foundObjectData = deleteItemById(inventory, req.body.itemId);

  if (foundObjectData) {
    const { parentArray, objectIndex } = foundObjectData;
    parentArray.splice(objectIndex, 1);
  } else {
    return next(new HttpError('item not found', 500));
  }

  await inventory.save();

  res.json({ inventory });
};
