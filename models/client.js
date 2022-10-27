const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const clientSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    avatar: { type: String, required: false },
    name: { type: String, required: true },
    translationRate: { type: Number, required: false },
    proofreadingRate: { type: Number, required: false },
    posteditingRate: { type: Number, required: false },
    unit: {
      type: String,
      required: true,
    },
    currency: { type: String, required: true },
    decimalPoints: { type: Number, required: false },
    email: { type: String, required: false },
    phone: { type: String, required: false },
    registeredOffice: { type: String, required: false },
    registrationNumber: { type: String, required: false },
    taxNumber: { type: String, required: false },
    vatPayer: { type: Boolean, required: false },
    bank: { type: String, required: false },
    iban: { type: String, required: false },
    representative: { type: String, required: false },
    notes: { type: String, required: false },
    invoiceDue: { type: Number, required: false },
    orders: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Order' }],
    invoices: [
      { type: mongoose.Types.ObjectId, required: true, ref: 'Invoice' },
    ],
    remainder: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
