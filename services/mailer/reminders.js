const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');

AWS.config.update({ region: 'eu-west-3' });

let transporter = nodemailer.createTransport({
  SES: new AWS.SES(),
});

exports.invoiceOutstandingMail = (user, recipient, req, invoice, type) => {
  return;
  if (!recipient.email || !user.email) return;

  if (!req) {
    const translationObject = require(`../../locales/${recipient.language}/translation.json`);
    req = {
      t: (args) => {
        const argsArray = args.split('.');
        const argsCount = argsArray.length;

        if (argsCount === 1) {
          return translationObject[`${args}`];
        }
        if (argsCount === 2) {
          return translationObject[`${argsArray[0]}`][`${argsArray[1]}`];
        }
        if (argsCount === 3) {
          return translationObject[`${argsArray[0]}`][`${argsArray[1]}`][
            `${argsArray[2]}`
          ];
        }
      },
    };
  }

  const messageBody = {
    ro: `<html><body>
  <p>Stimate Client,</p>
  <p>Vă reamintim că factura dvs. <strong>${invoice.series}/${
      invoice.number
    }</strong> emisă în data de <strong>${new Date(
      invoice.issuedDate
    ).toLocaleDateString(
      recipient.language
    )}</strong> și în valoare de <strong>${invoice.totalInvoice?.toLocaleString(
      recipient.language,
      {
        style: 'currency',
        currency: recipient.currency,
        maximumFractionDigits: recipient.decimalPoints,
      }
    )}</strong> ${
      type === 'duetomorrow'
        ? 'este scadentă mâine'
        : type === 'twodaysoutstanding'
        ? 'a depășit termenul de plată cu două zile'
        : type === 'fourdaysoutstanding'
        ? 'a depășit termenul de plată cu 4 zile'
        : 'a depășit termenul de plată cu 6 zile'
    }. Documentul se regăsește atașat acestui mesaj.</p>
  <p>Vă mulțumim pentru colaborare!</p>
  </body></html>`,
    en: `<html><body>
  <p>Dear Client,</p>
  <p>This is a kind remainder that your invoice <strong>${invoice.series}/${
      invoice.number
    }</strong> issued <strong>${new Date(invoice.issuedDate).toLocaleDateString(
      recipient.language
    )}</strong> in amount of <strong>${invoice.totalInvoice?.toLocaleString(
      recipient.languate,
      {
        style: 'currency',
        currency: recipient.currency,
        maximumFractionDigits: recipient.decimalPoints,
      }
    )}</strong> ${
      type === 'duetomorrow'
        ? 'is due tomorrow'
        : type === 'twodaysoutstanding'
        ? 'is past due by 2 days'
        : type === 'fourdaysoutstanding'
        ? 'is past due by 4 days'
        : 'is past due by 6 days'
    }. You can find the document attached to this message.</p>
  <p>Thank you for choosing to work with us!</p>
  </body></html>`,
  };

  transporter.sendMail({
    from: `${user.name} <admin@zent-freelance.com>`,
    to: `<${recipient.email}>`,
    cc: `<${user.email}>`,
    subject:
      user.language === 'ro'
        ? `${
            type === 'duetomorrow'
              ? 'Factura dvs. este scadentă mâine'
              : type === 'twodaysoutstanding'
              ? 'Factura dvs. a depășit termenul de plată cu două zile'
              : type === 'fourdaysoutstanding'
              ? 'Factura dvs. a depășit termenul de plată cu 4 zile'
              : 'Factura dvs. a depășit termenul de plată cu 6 zile'
          }`
        : `${
            type === 'duetomorrow'
              ? 'Your invoice is due tomorrow'
              : type === 'twodaysoutstanding'
              ? 'Your invoice is past due by 2 days'
              : type === 'fourdaysoutstanding'
              ? 'Your invoice is past due by 4 days'
              : 'Your invoice is past due by 6 days'
          }`,
    attachments: {
      filename: `${req.t('invoice.title')}[${recipient.name}].pdf`,
      path: `./uploads/invoices/${req.t('invoice.title')}[${user._id}][${
        recipient.name
      }]${type}.pdf`,
    },

    html: messageBody[`${recipient.language}`],
  });
};
