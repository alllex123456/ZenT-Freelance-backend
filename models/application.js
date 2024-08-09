const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appSchema = new Schema({
  languages: { type: Array, required: false },
  themes: { type: ['light', 'dark'], required: false },
  currencies: { type: Array, required: false },
  units: { type: Array, required: false },
  services: ['translation', 'proofreading', 'post-editing'],
});

module.exports = mongoose.model('AppSetting', appSchema);
