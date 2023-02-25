const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true },
    read: [{ type: mongoose.Types.ObjectId, required: false }],
    icon: { type: String, required: true },
    title: { type: Object, required: true },
    message: { type: Object, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
