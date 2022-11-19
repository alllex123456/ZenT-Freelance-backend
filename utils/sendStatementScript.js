const SibApiV3Sdk = require('sib-api-v3-sdk');

exports.sendStatementScript = (user, client, body, setEmail, req) => {
  const { message } = body;

  SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey =
    process.env.SENDINBLUE_KEY;

  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = '{{params.subject}}';
  sendSmtpEmail.htmlContent = `<html><body>
  <p>${message || ''}</p>
  <a href="{{params.link}}">link</a>
  </body></html>`;
  sendSmtpEmail.sender = { name: user.name, email: user.email };
  sendSmtpEmail.to = [{ email: setEmail || client.email, name: client.name }];
  sendSmtpEmail.cc = [{ name: user.name, email: user.email }];
  sendSmtpEmail.replyTo = { name: user.name, email: user.email };
  sendSmtpEmail.params = {
    link:
      'https://zent-freelance.herokuapp.com/uploads/statements/' +
      req.t('statement.title') +
      '[' +
      user.id +
      ']' +
      '[' +
      client.name +
      '].pdf',
    subject:
      user.language === 'ro'
        ? 'Situatia lucrarilor la zi'
        : 'Updated statement of work',
  };
  sendSmtpEmail.attachment = [
    {
      url: `https://zent-freelance.herokuapp.com/uploads/statements/${req.t(
        'statement.title'
      )}[${user.id}][${client.name}].pdf`,
      name: `${req.t('statement.title')}[${client.name}].pdf`,
    },
  ];
  console.log(sendSmtpEmail.attachment);
  apiInstance.sendTransacEmail(sendSmtpEmail).then(
    function (data) {
      console.log(
        'API called successfully. Returned data: ' + JSON.stringify(data)
      );
    },
    function (error) {
      console.error(error);
    }
  );
};
