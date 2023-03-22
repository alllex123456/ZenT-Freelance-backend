exports.computeUnits = (count, itemUnit) => {
  let unit;
  if (itemUnit === '2000cw/s') {
    unit = count / 2000;
  }
  if (itemUnit === 'word') {
    unit = count;
  }
  if (itemUnit === '300w') {
    unit = count / 300;
  }
  if (itemUnit === '1800cw/os') {
    unit = count / 1800;
  }
  return unit;
};
