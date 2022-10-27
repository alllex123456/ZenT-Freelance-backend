const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    clientId: { type: mongoose.Types.ObjectId, required: true, ref: 'Client' },
    cashed: { type: Boolean, required: true },
    reversed: { type: Boolean, required: false },
    cashedAmount: { type: Number, required: false },
    dateCashed: { type: Date, required: false },
    series: { type: String, required: false },
    number: { type: Number, required: true },
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
    totalInvoice: { type: Number, required: true },
    invoiceRemainder: { type: Number, required: true },
    clientBalance: { type: Number, required: true },
    issuedDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
