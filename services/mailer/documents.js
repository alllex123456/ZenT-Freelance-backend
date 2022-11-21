const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: true,
  auth: {
    user: 'admin@zent-freelance.com',
    pass: 'andaluzia231178',
  },
});

exports.sendStatement = (user, recipient, req, setEmail) => {
  transporter.sendMail({
    from: `${user.name} <${user.email}>`,
    to: `<${setEmail || recipient.email}>`,
    subject:
      user.language === 'ro'
        ? 'Situatia lucrarilor la zi'
        : 'Updated statement of work',
    attachments: {
      fileName: '',
      path: `./uploads/statements/${req.t('statement.title')}[${user.id}][${
        client.name
      }].pdf`,
      name: `${req.t('statement.title')}[${client.name}].pdf`,
    },
    html:
      recipient.language === 'ro'
        ? `<html><body> <p>Stimate client,</p> <p>Regăsiți în atașament situația lucrărilor predate la zi. </p> <p>Vă mulțumim.</p> </body></html>`
        : `<html><body> <p>Dear Client,</p> <p>Please find attached our detailed work statement up to date. </p> <p>Thank you.</p> </body></html>`,
  });
};

exports.sendInvoice = (user, recipient, body, req, setEmail) => {
  transporter.sendMail({
    from: `${user.name} <${user.email}>`,
    to: `<${recipient.email}>`,
    subject:
      user.language === 'ro'
        ? 'Situatia lucrarilor la zi'
        : 'Updated statement of work',
    attachments: {
      fileName: '',
      path: `./uploads/invoices/${req.t('invoice.title')}[${user.id}][${
        client.name
      }].pdf`,
      name: `${req.t('invoice.title')}[${client.name}].pdf`,
    },
    html: `<html><body>
  <p>${message
    .replace('{series}', series)
    .replace('{number}', number)
    .replace('{total}', `${totalInvoice} ${client.currency}`)
    .replace('{date}', new Date(dueDate).toLocaleDateString(user.language))}</p>
  </body></html>`,
  });
};
