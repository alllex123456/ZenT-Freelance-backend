const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const statementSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    clientId: { type: mongoose.Types.ObjectId, required: true, ref: 'Client' },
    invoiceId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Invoice',
    },
    orders: [
      {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Order',
      },
    ],
    clientBalance: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Statement', statementSchema);
