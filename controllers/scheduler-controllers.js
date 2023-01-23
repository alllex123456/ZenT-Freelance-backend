const { InvoicePDF } = require('../services/pdf-invoice');
const User = require('../models/user');
const cron = require('node-cron');
const { isTomorrow } = require('date-fns');
const { invoiceOutstandingMail } = require('../services/mailer/reminders');

const invoiceOutstanding = (users) => {
  if (!users || users.length === 0) return;

  users.forEach((user) => {
    if (!user.invoices || user.invoices.length === 0) return;

    // offset local user time
    const date = new Date().toLocaleString('en-US', user.timeZone);
    const tzoffset = new Date(date).getTimezoneOffset() * 60000;
    const userLocalTime = new Date(new Date(date) - tzoffset);

    user.invoices.forEach((invoice) => {
      if (isTomorrow(new Date(invoice.dueDate))) {
        InvoicePDF(null, null, invoice, invoice.totalInvoice, 'duetomorrow');
        invoiceOutstandingMail(
          user,
          invoice.clientId,
          null,
          invoice,
          'duetomorrow'
        );
      }
      if (
        userLocalTime - invoice.dueDate > 172800000 &&
        userLocalTime - invoice.dueDate < 259200000
      ) {
        InvoicePDF(
          null,
          null,
          invoice,
          invoice.totalInvoice,
          'twodaysoutstanding'
        );
        invoiceOutstandingMail(
          user,
          invoice.clientId,
          null,
          invoice,
          'twodaysoutstanding'
        );
      }
      if (
        userLocalTime - invoice.dueDate > 345600000 &&
        userLocalTime - invoice.dueDate < 432000000
      ) {
        InvoicePDF(
          null,
          null,
          invoice,
          invoice.totalInvoice,
          'fourdaysoutstanding'
        );
        invoiceOutstandingMail(
          user,
          invoice.clientId,
          null,
          invoice,
          'fourdaysoutstanding'
        );
      }
      if (
        userLocalTime - invoice.dueDate > 518400000 &&
        userLocalTime - invoice.dueDate < 604800000
      ) {
        InvoicePDF(
          null,
          null,
          invoice,
          invoice.totalInvoice,
          'sixdaysoutstanding'
        );
        invoiceOutstandingMail(
          user,
          invoice.clientId,
          null,
          invoice,
          'sixdaysoutstanding'
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
        path: 'clientId userId orders',
      },
    });
  } catch (error) {}
  callbackFn(users);
};

module.exports = () => {
  cron.schedule(
    `00 07 * * *`,
    () => {
      getUsers(invoiceOutstanding);
    },
    {
      scheduled: true,
      timezone: 'Europe/Bucharest',
    }
  );
};
