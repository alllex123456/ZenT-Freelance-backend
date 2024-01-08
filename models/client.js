const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const clientSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    language: { type: String, required: false },
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
    mobile: { type: String, required: false },
    registeredOffice: { type: String, required: false },
    mailingAddress: { type: String, required: false },
    registrationNumber: { type: String, required: false },
    country: { type: String, required: false },
    county: { type: String, required: false },
    streetAddress: { type: String, required: false },
    city: { type: String, required: false },
    taxNumber: { type: String, required: false },
    vatPayer: { type: Boolean, required: false },
    bank: { type: String, required: false },
    iban: { type: String, required: false },
    representative: { type: String, required: false },
    contacts: {
      primary: {
        name: { type: String, required: false },
        email: { type: String, required: false },
        phone: { type: String, required: false },
        mobile: { type: String, required: false },
      },
      secondary: {
        name: { type: String, required: false },
        email: { type: String, required: false },
        phone: { type: String, required: false },
        mobile: { type: String, required: false },
      },
    },
    notes: { type: String, required: false },
    invoiceDue: { type: Number, required: false },
    invoiceNotes: { type: String, required: false },
    orders: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Order' }],
    addedItems: [
      { type: mongoose.Types.ObjectId, required: true, ref: 'AddedItem' },
    ],
    invoices: [
      { type: mongoose.Types.ObjectId, required: true, ref: 'Invoice' },
    ],
    receipts: [
      { type: mongoose.Types.ObjectId, required: true, ref: 'Receipt' },
    ],
    balance: { type: Number, required: true },
    archived: { type: Boolean, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
