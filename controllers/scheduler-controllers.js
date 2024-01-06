const { InvoicePDF } = require('../services/pdf-invoice');
const User = require('../models/user');
const cron = require('node-cron');
const { isTomorrow, addDays } = require('date-fns');

const invoiceOutstanding = (users) => {
  if (!users || users.length === 0) return;

  users.forEach((user) => {
    if (!user.invoices || user.invoices.length === 0) return;

    // offset local user time
    const date = new Date().toLocaleString('en-US', user.timeZone);
    const tzoffset = new Date(date).getTimezoneOffset() * 60000;
    const userLocalTime = new Date(new Date(date) - tzoffset)
      .toISOString()
      .slice(0, 10);

    user.invoices.forEach((invoice) => {
      if (!invoice.clientData.email || !invoice.userData.email) return;

      if (invoice.cashed) return;

      const setDelay = (invoice, delay) => {
        return (
          new Date(userLocalTime).toISOString().slice(0, 10) ===
          addDays(new Date(invoice.dueDate.toISOString().slice(0, 10)), delay)
            .toISOString()
            .slice(0, 10)
        );
      };

      if (isTomorrow(new Date(invoice.dueDate))) {
        if (user.emailAlerts && !user.emailAlerts.beforeMaturity) return;
        InvoicePDF(
          { body: { reminder: true } },
          null,
          invoice,
          null,
          null,
          'dueTomorrow'
        );
      }
      if (setDelay(invoice, 2)) {
        if (user.emailAlerts && !user.emailAlerts.twoDays) return;
        InvoicePDF(
          { body: { reminder: true } },
          null,
          invoice,
          null,
          null,
          'twoDaysOutstanding'
        );
      }
      if (setDelay(invoice, 4)) {
        if (user.emailAlerts && !user.emailAlerts.fourDays) return;
        InvoicePDF(
          { body: { reminder: true } },
          null,
          invoice,
          null,
          null,
          'fourDaysOutstanding'
        );
      }
      if (setDelay(invoice, 7)) {
        if (user.emailAlerts && !user.emailAlerts.sixDays) return;
        InvoicePDF(
          { body: { reminder: true } },
          null,
          invoice,
          null,
          null,
          'sixDaysOutstanding'
        );
      }
    });
  });
};

const getUsers = async (callbackFn) => {
  let users;
  try {
    users = await User.find().populate({
      path: 'invoices',
      populate: {
        path: 'clientId userId orders addedItems',
      },
    });
  } catch (error) {}
  callbackFn(users);
};

// module.exports = () => {
//   cron.schedule(
//     `00 07 * * *`,
//     () => {
//       getUsers(invoiceOutstanding);
//     },
//     {
//       scheduled: true,
//       timezone: 'Europe/Bucharest',
//     }
//   );
// };
