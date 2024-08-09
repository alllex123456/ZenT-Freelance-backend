const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const { userSignUp, resetPassword } = require('./html-contents');

const SibApiV3Sdk = require('sib-api-v3-sdk');
let defaultClient = SibApiV3Sdk.ApiClient.instance;

let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.SENDINBLUE_KEY;

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

exports.signupEmail = (recipient, req) => {
  sendSmtpEmail.subject = req.t('mail.subjectSignUp');
  sendSmtpEmail.htmlContent = userSignUp(req);
  sendSmtpEmail.sender = {
    name: 'Zent',
    email: 'admin@zent-freelance.com',
  };
  sendSmtpEmail.to = [{ email: recipient.email }];

  return apiInstance.sendTransacEmail(sendSmtpEmail).then(
    function (data) {},
    function (error) {
      console.error(error);
    }
  );
};

exports.resetPasswordLink = (recipient, token, req) => {
  const href = `http://localhost:3000/reset-password?email=${recipient.email}&token=${token}`;

  sendSmtpEmail.subject = req.t('mail.subjectResetPassword');
  sendSmtpEmail.htmlContent = resetPassword(req, href, recipient);
  sendSmtpEmail.sender = {
    name: 'Zent',
    email: 'admin@zent-freelance.com',
  };
  sendSmtpEmail.to = [{ email: recipient.email }];

  return apiInstance.sendTransacEmail(sendSmtpEmail).then(
    function (data) {},
    function (error) {
      console.error(error);
    }
  );
};
