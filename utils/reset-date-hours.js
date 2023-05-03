exports.resetDateHours = (inputDate, moment) => {
  const date = new Date(inputDate);
  const hour = moment === 'past' ? 0 : 24;
  date.setHours(hour, 0, 0, 0);
  return date;
};
