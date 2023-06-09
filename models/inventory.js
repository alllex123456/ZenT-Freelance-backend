const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const inventorySchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    year: { type: Number, required: true },
    assets: [
      {
        designation: { type: String, required: false },
        amount: { type: Number, required: false },
      },
    ],
    payables: [
      {
        designation: { type: String, required: false },
        amount: { type: Number, required: false },
      },
    ],
    taxes: [
      {
        designation: { type: String, required: false },
        amount: { type: Number, required: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inventory', inventorySchema);
