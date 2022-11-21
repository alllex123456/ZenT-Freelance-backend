const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: 'admin@zent-freelance.com',
    pass: 'andaluzia231178',
  },
});

exports.sendStatement = (user, recipient, req, setEmail) => {
  transporter.sendMail({
    from: `${user.name} <admin@zent-freelance.com>`,
    to: `<${setEmail || recipient.email}>`,
    subject:
      user.language === 'ro'
        ? 'Situatia lucrarilor la zi'
        : 'Updated statement of work',
    attachments: {
      fileName: `${req.t('statement.title')}[${recipient.name}].pdf`,
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
  transporter.sendMail({
    from: `${user.name} <admin@zent-freelance.com>`,
    to: `<${recipient.email}>`,
    subject:
      user.language === 'ro'
        ? 'Factură emisă'
        : 'Your invoice is now available',
    attachments: {
      fileName: '',
      path: `./uploads/invoices/${req.t('invoice.title')}[${user.id}][${
        recipient.name
      }].pdf`,
      name: `${req.t('invoice.title')}[${recipient.name}].pdf`,
    },
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
