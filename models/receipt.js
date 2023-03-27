const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const receiptSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    clientId: { type: mongoose.Types.ObjectId, required: true, ref: 'Client' },
    invoiceId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Invoice',
    },
    prefix: { type: String, required: true },
    number: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);
