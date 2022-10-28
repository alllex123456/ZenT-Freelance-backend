const SibApiV3Sdk = require('sib-api-v3-sdk');

exports.sendInvoiceScript = (user, client, body, setEmail, req) => {
  const { series, number, totalInvoice, dueDate, message } = body;

  const messageBody = () => {
    message.replace('{series}', series);
    message.replace('{number}', number);
    message.replace('{totalInvoice}', totalInvoice);
    message.replace('{dueDate}', dueDate);
    return message;
  };

  SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey =
    process.env.SENDINBLUE_KEY;

  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = '{{params.subject}}';
  sendSmtpEmail.htmlContent = `<html><body>
  <p>Stimate colaborator,</p>
  <p>${messageBody()}</p>
  </body></html>`;
  sendSmtpEmail.sender = { name: user.name, email: user.email };
  sendSmtpEmail.to = [{ email: setEmail || client.email, name: client.name }];
  sendSmtpEmail.cc = [{ name: user.name, email: user.email }];
  sendSmtpEmail.replyTo = { name: user.name, email: user.email };
  sendSmtpEmail.params = {
    subject: 'Factura dvs. a fost emisa',
  };
  sendSmtpEmail.attachment = [
    {
      url: `https://zent-freelance.herokuapp.com/uploads/statements/${req.t(
        'statement.title'
      )}[${user.id}][${client.name}].pdf`,
    },
    {
      url: `https://zent-freelance.herokuapp.com/uploads/invoices/${req.t(
        'invoice.title'
      )}[${user.id}][${client.name}].pdf`,
    },
  ];

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
