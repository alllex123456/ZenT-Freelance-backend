const fetch = require('node-fetch');

exports.measurementUnit = (subject) =>
  subject.unit === '2000cw/s'
    ? '2000 caractere cu spatii'
    : client.unit === 'word'
    ? 'cuvant'
    : client.unit === '300w'
    ? '300 cuvinte'
    : '1800 caractere fara spatii;';

exports.shortMU = (subject) =>
  subject.unit === '2000cw/s'
    ? '2000 ccs'
    : client.unit === 'word'
    ? 'cuv.'
    : client.unit === '300w'
    ? '300 cuv.'
    : '1800 cfs;';

exports.quantity = (subject) =>
  subject.unit === '2000cw/s'
    ? 'caractere cu spatii'
    : client.unit === 'word'
    ? 'cuvinte'
    : client.unit === '300w'
    ? 'cuvinte'
    : '1800 caractere fara spatii;';

exports.fetchImage = async (src) => {
  const response = await fetch(src);
  const image = await response.buffer();

  return image;
};
