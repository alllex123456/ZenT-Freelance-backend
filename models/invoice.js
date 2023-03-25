const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    clientId: { type: mongoose.Types.ObjectId, required: true, ref: 'Client' },
    userData: { type: Object, required: true },
    clientData: { type: Object, required: true },
    cashed: { type: Boolean, required: true },
    reversed: { type: Boolean, required: false },
    payment: {
      cashedAmount: { type: Number, required: false },
      dateCashed: { type: Date, required: false },
      receipt: { type: String, required: false },
    },
    series: { type: String, required: true },
    number: { type: Number, required: true },
    detailedOrders: { type: Boolean, required: true },
    orders: [
      {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Order',
      },
    ],
    addedItems: [
      {
        type: mongoose.Types.ObjectId,
        required: false,
        ref: 'AddedItem',
      },
    ],
    issuedDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    notes: { type: String, required: false },
    reversing: { type: Boolean, required: false },
    reversedInvoice: {
      type: mongoose.Types.ObjectId,
      required: false,
      ref: 'Invoice',
    },
    bankAccounts: { type: Array, required: true },
    previousClientBalance: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
