exports.computePages = (unit, count) => {
  let page;
  if (unit === '2000cw/s') {
    page = count / 2000;
  }
  if (unit === 'word') {
    page = count;
  }
  if (unit === '300w') {
    page = count / 300;
  }
  if (unit === '1800cw/os') {
    page = count / 1800;
  }
  return page;
};
