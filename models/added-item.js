const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const addedItemSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    clientId: { type: mongoose.Types.ObjectId, required: true, ref: 'Client' },
    invoiceId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Invoice',
    },
    addedItem: { type: Boolean, required: false },
    discount: { type: Boolean, required: false },
    reference: { type: String, required: false },
    count: { type: Number, required: true },
    rate: { type: Number, required: true },
    unit: { type: String, required: true },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AddedItem', addedItemSchema);
