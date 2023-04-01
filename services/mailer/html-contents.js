const { translateUnits } = require('../../utils/translateUnits');

exports.userSignUp = (req) => `<!DOCTYPE html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body>

<header>
<h1 style="text-align:center"><span style="color:#006e1e"><strong><span style="font-size:18px">${req.t(
  'mail.userSignUp.h1'
)}</span></strong></span></h1>

<div style="text-align:center"><img alt="" src="https://zent.s3.eu-west-3.amazonaws.com/zent-logo-transparent-bk.svg" height="90"; width="170" /></div>
</header>

<main>
<h2 style="text-align:center"><span style="color:#006e1e"><span style="font-size:14px">${req.t(
  'mail.userSignUp.h2'
)}:</span></span></h2>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>${req.t(
  'mail.userSignUp.clientRegistration'
)}</strong>: ${req.t('mail.userSignUp.listLineOne')},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>${req.t(
  'mail.userSignUp.orderRegistration'
)}</strong>: ${req.t('mail.userSignUp.listLineTwo')},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>${req.t(
  'mail.userSignUp.workStatement'
)}</strong> ${req.t('mail.userSignUp.listLineThree')},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>${req.t(
  'mail.userSignUp.invoicingAndPayment'
)}</strong>: ${req.t('mail.userSignUp.listLineFour')},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- ${req.t(
  'mail.userSignUp.invoiceDetails'
)}: ${req.t('mail.userSignUp.listLineFive')},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- ${req.t(
  'mail.userSignUp.invoiceFunctionalities'
)}: ${req.t('mail.userSignUp.listLineSix')},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>${req.t(
  'mail.userSignUp.userAccount'
)}</strong> ${req.t('mail.userSignUp.listLineSeven')}.</em></span></p>
</main>


<footer>
<p><span style="font-size:9px"><strong>${req.t(
  'mail.userSignUp.legalNoteTitle'
)}.</strong></span></p>
<p><span style="font-size:9px">${req.t(
  'mail.userSignUp.legalNoteText'
)}.</span></p>
</footer>

</body>
</html>`;

exports.resetPassword = (req, href, user) => `<!DOCTYPE html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>

<header>
<h1 style="text-align:center"><span style="color:#006e1e"><strong><span style="font-size:18px">${req.t(
  'mail.passwordReset.h1'
)}, ${user.alias}</span></strong></span></h1>

<div style="text-align:center"><img alt="Zent logo" src="https://zent.s3.eu-west-3.amazonaws.com/zent-logo-transparent-bk.svg" height="90"; width="170" /></div>
</header>

<main>
<h2 style="text-align:center"><span style="color:#006e1e"><span style="font-size:14px">${req.t(
  'mail.passwordReset.h2'
)}</span></span></h2>

<p style="text-align:center"><span style="color:#006e1e">${req.t(
  'mail.passwordReset.instruction'
)}</span></p>

<div style="text-align:center">
<a href=${href} style="padding: 10px 5px; color:#fff; text-decoration:none; background-color:#006e1e">${req.t(
  'mail.passwordReset.button'
)}</a>
</div>

<footer>
<p style="text-align:center; font-size:9px"><strong>${req.t(
  'mail.passwordReset.warning'
)}</strong></p>
</footer>

</body>
</html>`;

exports.sendStatement = (
  CLIENT_LNG,
  totalOrders,
  totalCounts,
  user,
  client
) => `<!DOCTYPE html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>

<table align="center" style="margin: 0 auto;">

    
  ${
    user.invoiceLogo &&
    `<tr style="margin: 0 0 20px 0">
        <td style="text-align:center">
          <img alt="" src=${user.invoiceLogo} width="170" height="90" />
        </td>
      </tr>`
  }
      
    

    <tr style="padding:20px 0">
          <td>
               <h1 style="text-align:center; color:#006e1e; font-size:18px">${CLIENT_LNG(
                 'mail.statement.h1'
               )},</h1>
          </td>
    </tr>

    <tr style="padding:20px 0">
          <td>
               <h2 style="text-align:center; color:#006e1e; font-size:16px">${CLIENT_LNG(
                 'mail.statement.h2'
               )}</h2>
          </td>
    </tr>

   
    <tr style="background-color:#ecf0f1; margin: 20px 0">
          <td >
               <p style="text-align:center; color:#006e1e; font-size:14px; font-weight: bold">${CLIENT_LNG(
                 'mail.statement.summary'
               )}</p>
          </td>
    </tr>

    <tr style="background-color:#ecf0f1; margin:20px 0">
          <td>
               <p style="text-align:center; font-size:12px; color:#006e1e">${CLIENT_LNG(
                 'mail.statement.quantity'
               )}: ${totalCounts.toLocaleString(client.language, {
  maximumFractionDigits: client.decimalPoints,
})}</p>
          </td>
    </tr>

    <tr style="background-color:#ecf0f1; margin:20px 0">
          <td>
               <p style="text-align:center; color:#006e1e; font-size:12px">${CLIENT_LNG(
                 'mail.statement.amount'
               )}: ${totalOrders.toLocaleString(client.language, {
  style: 'currency',
  currency: client.currency,
  maximumFractionDigits: client.decimalPoints,
})}</p>
          </td>
    </tr>
    </tbody>

    <tr style="padding:20px 0; border-bottom: 1px solid grey">
          <td>
               <p style="text-align:center; font-size:10px"><strong>${CLIENT_LNG(
                 'mail.statement.footer'
               )}: ${user.email}</strong></p>
          </td>
    </tr>

   

     <tr style="padding:20px 0">
          <td>
               <p style="color:#999;font-size:9px">${CLIENT_LNG(
                 'mail.signature'
               )}.</p> <a style="font-size:9px" href="https://www.zent-freelance.com">www.zent-freelance.com</a>
          </td>
    </tr>


</table>


</body>
</html>`;

exports.sendInvoice = (CLIENT_LNG, invoice, user) => {
  return `<!DOCTYPE html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>

<table align="center" style="margin: 0 auto;">

${
  user.invoiceLogo &&
  `<tr style="margin: 0 0 20px 0">
        <td style="text-align:center">
          <img alt="" src=${user.invoiceLogo} width="170" height="90" />
        </td>
      </tr>`
}

    <tr style="padding:20px 0">
          <td>
               <h1 style="text-align:center; color:#006e1e; font-size:18px">${CLIENT_LNG(
                 'mail.statement.h1'
               )},</h1>
          </td>
    </tr>

    <tr style="padding:20px 0">
          <td>
               <h2 style="text-align:center; color:#006e1e; font-size:16px">${CLIENT_LNG(
                 'mail.invoice.h2'
               )}: ${invoice.prefix}${invoice.number}</h2>
          </td>
    </tr>

   
    <tr style="background-color:#ecf0f1; margin: 20px 0">
          <td >
               <p style="text-align:center; color:#006e1e; font-size:14px; font-weight: bold">${CLIENT_LNG(
                 'mail.invoice.summary'
               )}</p>
          </td>
    </tr>

    <tr style="background-color:#ecf0f1; margin:20px 0">
          <td>
               <p style="text-align:center; color:#006e1e; font-size:12px">${CLIENT_LNG(
                 'mail.invoice.amount'
               )}: ${invoice.totalInvoice.toLocaleString(
    invoice.clientData.language,
    {
      style: 'currency',
      currency: invoice.clientData.currency,
      maximumFractionDigits: invoice.clientData.decimalPoints,
    }
  )}</p>
          </td>
    </tr>


    <tr style="background-color:#ecf0f1; margin:20px 0">
        <td>
            <p style="text-align:center; font-size:12px; color:#006e1e">${CLIENT_LNG(
              'mail.invoice.dueBy'
            )}: ${new Date(invoice.dueDate).toLocaleDateString(
    invoice.clientData.language
  )}</p>
        </td>
    </tr>


    <tr style="padding:20px 0; border-bottom: 1px solid grey">
          <td>
               <p style="text-align:center; font-size:10px"><strong>${CLIENT_LNG(
                 'mail.invoice.footer'
               )}: ${user.email}</strong></p>
          </td>
    </tr>

    <tr style="padding:20px 0">
          <td>
               <p style="color:#999;font-size:9px">${CLIENT_LNG(
                 'mail.signature'
               )}.</p> <a style="font-size:9px" href="https://www.zent-freelance.com">www.zent-freelance.com</a>
          </td>
    </tr>

</table>


</body>
</html>`;
};

exports.invoiceReminders = (CLIENT_LNG, invoice, user, severity) => {
  return `<!DOCTYPE html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>

<table align="center" style="margin: 0 auto;">

${
  user.invoiceLogo &&
  `<tr style="margin: 0 0 20px 0">
        <td style="text-align:center">
          <img alt="" src=${user.invoiceLogo} width="170" height="90" />
        </td>
      </tr>`
}

    <tr style="padding:20px 0">
          <td>
               <h1 style="text-align:center; color:#006e1e; font-size:18px">${CLIENT_LNG(
                 'mail.reminders.invoice.h1'
               )},</h1>
          </td>
    </tr>

    <tr style="padding:20px 0">
          <td>
               <h2 style="text-align:center; color:#006e1e; font-size:16px">${CLIENT_LNG(
                 'mail.reminders.invoice.h2'
               )} ${invoice.prefix}${invoice.number} ${CLIENT_LNG(
    'mail.reminders.invoice.issued'
  )} ${new Date(invoice.issuedDate).toLocaleDateString(
    invoice.clientData.language
  )} ${CLIENT_LNG(
    'mail.reminders.invoice.inAmountOf'
  )} ${invoice.totalInvoice.toLocaleString(invoice.clientData.language, {
    style: 'currency',
    currency: invoice.clientData.currency,
    maximumFractionDigits: invoice.clientData.decimalPoints,
  })} ${CLIENT_LNG(`mail.reminders.invoice.${severity}`)}. </h2>
          </td>
    </tr>

   
    <tr style="background-color:#ecf0f1; margin: 20px 0">
          <td >
               <p style="text-align:center; color:#006e1e; font-size:14px; font-weight: bold">${CLIENT_LNG(
                 'mail.reminders.invoice.findDocumentAttached'
               )}.</p>
          </td>
    </tr>

   
    <tr style="padding:20px 0; border-bottom: 1px solid grey">
          <td>
               <p style="text-align:center; font-size:10px"><strong>${CLIENT_LNG(
                 'mail.invoice.footer'
               )}: ${user.email}</strong></p>
          </td>
    </tr>

    <tr style="padding:20px 0">
          <td>
               <p style="color:#999;font-size:9px">${CLIENT_LNG(
                 'mail.signature'
               )}.</p> <a style="font-size:9px" href="https://www.zent-freelance.com">www.zent-freelance.com</a>
          </td>
    </tr>

</table>


</body>
</html>`;
};
