const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const { userSignUp, resetPassword } = require('./html-contents');

AWS.config.update({ region: 'eu-west-3' });

let transporter = nodemailer.createTransport({
  SES: new AWS.SES(),
});

exports.signupEmail = (recipient, req) => {
  transporter.sendMail({
    from: 'Zent <admin@zent-freelance.com>',
    to: `<${recipient.email}>`,
    subject: req.t('mail.subjectSignUp'),
    html: userSignUp(req),
  });
};

exports.resetPasswordLink = (recipient, token, req) => {
  const href = `http://localhost:3000/reset-password?email=${recipient.email}&token=${token}`;
  transporter.sendMail({
    from: 'ZenT-Freelance <admin@zent-freelance.com>',
    to: `<${recipient.email}>`,
    subject: req.t('mail.subjectResetPassword'),
    html: resetPassword(req, href, recipient),
  });
};
