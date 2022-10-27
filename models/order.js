const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    clientId: { type: mongoose.Types.ObjectId, required: true, ref: 'Client' },
    invoiceId: {
      type: mongoose.Types.ObjectId,
      required: false,
      ref: 'Invoice',
    },
    service: { type: String, required: true },
    status: { type: String, required: true },
    rate: { type: Number, required: true },
    unit: { type: String, required: true },
    currency: { type: String, required: true },
    count: { type: Number, required: true },
    total: { type: Number, required: true },
    receivedDate: { type: Date, required: true },
    deliveredDate: { type: Date, required: false },
    deadline: { type: Date, required: true },
    reference: { type: String, required: false },
    notes: { type: String, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
