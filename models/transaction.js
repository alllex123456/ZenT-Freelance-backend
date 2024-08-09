const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const transactionSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, required: true },
    method: { type: String, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    document: { type: String, required: true },
    description: { type: String, required: true },
    deductible: {
      type: String,
      required: false,
    },
    percent: { type: Number, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
