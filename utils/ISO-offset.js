var tzoffset = new Date().getTimezoneOffset() * 60000;

exports.localISOTime = (time) => {
  return new Date(time - tzoffset).toISOString().slice(0, 16);
};
