const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');

AWS.config.update({ region: 'eu-west-3' });

let transporter = nodemailer.createTransport({
  SES: new AWS.SES(),
});

exports.sendStatement = (user, recipient, req, setEmail) => {
  if (!recipient.email || !user.email) return;

  transporter.sendMail({
    from: `${user.name} <admin@zent-freelance.com>`,
    to: `<${setEmail || recipient.email}>`,
    subject:
      user.language === 'ro'
        ? 'Situatia lucrarilor la zi'
        : 'Updated statement of work',
    attachments: {
      filename: `${req.t('statement.title')}[${recipient.name}].pdf`,
      path: `./uploads/statements/${req.t('statement.title')}[${user._id}][${
        recipient.name
      }].pdf`,
    },
    html:
      user.language === 'ro'
        ? `<html><body> <p>Stimate client,</p> <p>Regăsiți în atașament situația lucrărilor predate la zi. </p> <p>Vă mulțumim.</p> </body></html>`
        : `<html><body> <p>Dear Client,</p> <p>Please find attached our detailed work statement up to date. </p> <p>Thank you.</p> </body></html>`,
  });
};

exports.sendInvoice = (user, recipient, body, req, setEmail) => {
  if (!recipient.email || !user.email) return;

  transporter.sendMail({
    from: `${user.name} <admin@zent-freelance.com>`,
    to: `<${setEmail || recipient.email}>`,
    cc: `${req.t('mail.cc')} <${user.email}>`,
    subject:
      user.language === 'ro'
        ? 'Factură emisă'
        : 'Your invoice is now available',
    attachments: [
      {
        filename: `${req.t('statement.title')}[${recipient.name}].pdf`,
        path: `./uploads/statements/${req.t('statement.title')}[${user.id}][${
          recipient.name
        }].pdf`,
      },
      {
        filename: `${req.t('invoice.title')}[${recipient.name}].pdf`,
        path: `./uploads/invoices/${req.t('invoice.title')}[${user.id}][${
          recipient.name
        }].pdf`,
      },
    ],
    html: `<html><body>
  <p>${body.message
    .replace('{series}', body.series)
    .replace('{number}', body.number)
    .replace('{total}', `${body.totalInvoice} ${recipient.currency}`)
    .replace(
      '{date}',
      new Date(body.dueDate).toLocaleDateString(user.language)
    )}</p>
  </body></html>`,
  });
};
