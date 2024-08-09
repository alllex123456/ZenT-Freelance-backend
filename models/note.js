const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const noteSchema = new Schema({
  userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  note: { type: String, required: false },
});

module.exports = mongoose.model('Note', noteSchema);
