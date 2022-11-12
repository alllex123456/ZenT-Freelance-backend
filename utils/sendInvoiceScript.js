const SibApiV3Sdk = require('sib-api-v3-sdk');

exports.sendInvoiceScript = (user, client, body, setEmail, req) => {
  const { series, number, totalInvoice, dueDate, message } = body;

  SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey =
    process.env.SENDINBLUE_KEY;

  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = '{{params.subject}}';
  sendSmtpEmail.htmlContent = `<html><body>
  <p>${message
    .replace('{series}', series)
    .replace('{number}', number)
    .replace('{total}', `${totalInvoice} ${client.currency}`)
    .replace('{date}', new Date(dueDate).toLocaleDateString(user.language))}</p>
  </body></html>`;
  sendSmtpEmail.sender = { name: user.name, email: user.email };
  sendSmtpEmail.to = [{ email: setEmail || client.email, name: client.name }];
  sendSmtpEmail.cc = [{ name: user.name, email: user.email }];
  sendSmtpEmail.replyTo = { name: user.name, email: user.email };
  sendSmtpEmail.params = {
    subject:
      user.language === 'ro'
        ? 'Factura dvs. a fost emisa'
        : 'Your invoice is now available',
  };
  sendSmtpEmail.attachment = [
    {
      url: `https://zent-freelance.herokuapp.com/uploads/statements/${req.t(
        'statement.title'
      )}[${user.id}][${client.name}].pdf`,
      name: `${req.t('statement.title')}[${client.name}].pdf`,
    },
    {
      url: `https://zent-freelance.herokuapp.com/uploads/invoices/${req.t(
        'invoice.title'
      )}[${user.id}][${client.name}].pdf`,
      name: `${req.t('invoice.title')}[${client.name}].pdf`,
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
