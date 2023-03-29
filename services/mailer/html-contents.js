exports.userSignUp = (req) => `<!DOCTYPE html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body>

<header>
<h1 style="text-align:center"><span style="color:#006e1e"><strong><span style="font-size:18px">${req.t(
  'mail.userSignUp.h1'
)}</span></strong></span></h1>

<div style="text-align:center"><img alt="" src={"https://zent.s3.eu-west-3.amazonaws.com/zent-logo-transparent-bk.svg"} height="90"; width="170" /></div>
</header>

<main>
<h2 style="text-align:center"><span style="color:#006e1e"><span style="font-size:14px">${req.t(
  'mail.userSignUp.h2'
)}:</span></span></h2>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>${req.t(
  'mail.userSignUp.clientRegistration'
)}</strong>: req.t(
  'mail.userSignUp.listLineOne'
)},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>req.t(
  'mail.userSignUp.orderRegistration'
)}</strong>: req.t(
  'mail.userSignUp.listLineTwo'
)},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>req.t(
  'mail.userSignUp.workStatement'
)}</strong> req.t(
  'mail.userSignUp.listLineThree'
)},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>req.t(
  'mail.userSignUp.invoicingAndPayment'
)}</strong>: req.t(
  'mail.userSignUp.listLineFour'
)},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- req.t(
  'mail.userSignUp.invoiceDetails'
)}: req.t(
  'mail.userSignUp.listLineFive'
)},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- req.t(
  'mail.userSignUp.invoiceFunctionalities'
)}: req.t(
  'mail.userSignUp.listLineSix'
)},</em></span></p>

<p style="text-align:center"><span style="color:#006e1e"><em>- <strong>req.t(
  'mail.userSignUp.userAccount'
)}</strong> req.t(
  'mail.userSignUp.listLineSeven'
)}.</em></span></p>
</main>


<footer>
<p><span style="font-size:9px"><strong>req.t(
  'mail.userSignUp.legalNoteTitle'
)}.</strong></span></p>
<p><span style="font-size:9px">req.t(
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
  user
) => `<!DOCTYPE html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>

<header>
<div style="text-align:center; height:90px; width:170px"><img alt="" src=${
  user.invoiceLogo
} width="170" height="90" /></div>
</header>

<h1 style="text-align:center"><span style="color:#006e1e"><strong><span style="font-size:18px">${CLIENT_LNG(
  'mail.statement.h1'
)},</span></strong></span></h1>

<main>
<h2 style="text-align:center"><span style="color:#006e1e"><span style="font-size:14px">${CLIENT_LNG(
  'mail.statement.h2'
)}</span></span></h2>

<p style="text-align:center"><span style="color:#006e1e">${CLIENT_LNG(
  'mail.statement.summary'
)}</span></p>
<p style="text-align:center"><span style="color:#006e1e">${CLIENT_LNG(
  'mail.statement.ordersCompleted'
)}: ${totalCounts}</span></p>
<p style="text-align:center"><span style="color:#006e1e">${CLIENT_LNG(
  'mail.statement.amount'
)}: ${totalOrders}</span></p>

<footer>
<p style="text-align:center; font-size:9px"><strong>${CLIENT_LNG(
  'mail.statement.footer'
)}: ${user.email}</strong></p>
</footer>

<hr />
<div style="text-align:center; font-size:9px; color:#999>
<p style="color:#999">${CLIENT_LNG('mail.signature')}.</p>
<a href="https://www.zent-freelance.com">www.zent-freelance.com</a>
</div>

</body>
</html>`;

exports.sendInvoice = (CLIENT_LNG, invoice, email) => {
  return `<!DOCTYPE html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>

<header>
<div style="text-align:center; height:90px; width:170px"><img alt="" src=${
    invoice.userData.invoiceLogo
  } width="170" height="90" /></div>
</header>

<h1 style="text-align:center"><span style="color:#006e1e"><strong><span style="font-size:18px">${CLIENT_LNG(
    'mail.statement.h1'
  )},</span></strong></span></h1>

<main>
<h2 style="text-align:center"><span style="color:#006e1e"><span style="font-size:14px">${CLIENT_LNG(
    'mail.invoice.h2'
  )}: ${invoice.prefix}${invoice.number}</span></span></h2>


<div style="text-align:center;background-color:#ecf0f1; border-radius:3px padding: 10px 0">
<h3 style="text-align:center"><span style="color:#006e1e">${CLIENT_LNG(
    'mail.invoice.summary'
  )}</span></h3>
<h4 style="text-align:center"><span style="color:#006e1e">${CLIENT_LNG(
    'mail.invoice.amount'
  )}: ${invoice.totalInvoice}</span></h4>
<h4 style="text-align:center"><span style="color:#006e1e">${CLIENT_LNG(
    'mail.invoice.dueBy'
  )}: ${new Date(invoice.dueDate).toLocaleDateString(
    invoice.language
  )}</span></h4>
</div>

<footer>
<p style="text-align:center; font-size:10px"><strong>${CLIENT_LNG(
    'mail.statement.footer'
  )}: ${email}</strong></p>

<hr />
<div style="text-align:center; font-size:9px; color:#999>
<p style="color:#999">${CLIENT_LNG('mail.signature')}.</p>
<a href="https://www.zent-freelance.com">www.zent-freelance.com</a>
</div>
</footer>

</body>
</html>`;
};
