const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    subscription: {
      package: { type: String, required: true },
      expiresAt: { type: Date, required: false },
    },
    theme: { type: String, required: false },
    timeZone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    alias: { type: String, required: false },
    language: { type: String, required: false },
    currency: { type: String, required: true },
    avatar: { type: String, required: false },
    name: { type: String, required: false },
    phone: { type: String, required: false },
    registeredOffice: { type: String, required: false },
    registrationNumber: { type: String, required: false },
    taxNumber: { type: String, required: false },
    VATpayer: { type: Boolean, required: false },
    VATrate: { type: Number, required: false },
    receiptPrefix: { type: String, required: false },
    receiptStartNumber: { type: Number, required: false },
    invoiceNotes: { type: String, required: false },
    invoicePrefix: { type: String, required: false },
    invoiceStartNumber: { type: Number, required: false },
    invoiceDefaultDue: { type: Number, required: false },
    invoiceLogo: { type: String, required: false },
    clients: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Client' }],
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
    notes: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Note' }],
    bankAccounts: { type: Array, required: false },
    emailAlerts: { type: Object, required: false },
    eFacturaToken: { type: String, required: false },
  },
  { timestamps: true }
);

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
