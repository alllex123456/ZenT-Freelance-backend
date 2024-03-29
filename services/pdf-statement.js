const PDFDocument = require('pdfkit-table');
const { translateServices } = require('../utils/translateUnits');
const { sendStatement } = require('./mailer/html-contents');
const { computePages } = require('../utils/compute-pages');

const margin = 20;
const textDarkPrimary = '#495057';
const textDarkSecondary = '#606A73';
const divider = '#dfedff';

exports.StatementPDF = (res, client, user, time, req, invoiceOrders, email) => {
  const CLIENT_LNG = (args) => {
    const translationObject = require(`../locales/${client.language}/translation.json`);
    const argsArray = args.split('.');
    const argsCount = argsArray.length;

    if (argsCount === 1) {
      return translationObject[`${args}`];
    }
    if (argsCount === 2) {
      return translationObject[`${argsArray[0]}`][`${argsArray[1]}`];
    }
    if (argsCount === 3) {
      return translationObject[`${argsArray[0]}`][`${argsArray[1]}`][
        `${argsArray[2]}`
      ];
    }
  };
  const completedOrders = client.orders.filter(
    (order) => order.status === 'completed'
  );

  let orders;

  if (req.headers.invoiceid || req.headers.listedorders?.length === 0) {
    orders = completedOrders.map((order, index) => [
      index + 1,
      `${translateServices([order.service], req.t)?.displayedValue} / ${
        order.reference
      }`,
      `${new Date(order.receivedDate).toLocaleDateString(client.language)} /
        ${
          order.deliveredDate
            ? new Date(order.deliveredDate).toLocaleDateString(client.language)
            : new Date(order.deadline).toLocaleDateString(client.language)
        }`,
      new Date(order.deadline).toLocaleDateString(client.language),
      order.count.toLocaleString(client.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.rate.toLocaleString(client.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.total.toLocaleString(client.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.notes,
    ]);
  } else {
    orders = invoiceOrders.map((order, index) => [
      index + 1,
      `${translateServices([order.service], req.t)?.displayedValue} / ${
        order.reference
      }`,
      `${new Date(order.receivedDate).toLocaleDateString(client.language)} /
        ${new Date(order.deliveredDate || order.deadline).toLocaleDateString(
          client.language
        )}`,
      new Date(order.deadline).toLocaleDateString(client.language),
      order.count.toLocaleString(client.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.rate.toLocaleString(client.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.total.toLocaleString(client.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.notes,
    ]);
  }

  let totalOrders;

  if (req.headers.invoiceid || req.headers.listedorders?.length === 0) {
    totalOrders = completedOrders.reduce((acc, val) => (acc += val.total), 0);
  } else {
    totalOrders = invoiceOrders.reduce((acc, val) => (acc += val.total), 0);
  }

  let totalCounts;
  if (req.headers.invoiceid || req.headers.listedorders?.length === 0) {
    totalCounts = completedOrders.reduce(
      (acc, val) => (acc += computePages(val.unit, val.count)),
      0
    );
  } else {
    totalCounts = invoiceOrders.reduce(
      (acc, val) => (acc += computePages(val.unit, val.count)),
      0
    );
  }

  const statement = new PDFDocument({
    info: {
      Title: `${CLIENT_LNG('statement.title')} ${client.name} la ${new Date(
        time
      ).toLocaleDateString(client.language)}`,
    },
    size: 'A4',
    font: 'services/fonts/Ubuntu/Ubuntu-Regular.ttf',
    margin,
    bufferPages: true,
  });

  statement
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .fontSize(14)
    .fillColor(textDarkPrimary)
    .text(CLIENT_LNG('statement.title').toUpperCase())
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .fillColor(textDarkSecondary)
    .text(`${CLIENT_LNG('statement.clientName')}: ${client.name}`)
    .text(
      `${CLIENT_LNG('statement.generatedAt')}: ${new Date(
        time
      ).toLocaleDateString(client.language)}`
    );

  statement.moveDown(3);

  statement
    .moveTo(margin, statement.y)
    .lineTo(575, statement.y)
    .stroke(divider);

  statement.moveDown(3);

  const table = {
    headers: [
      CLIENT_LNG('statement.it'),
      CLIENT_LNG('statement.jobRef'),
      CLIENT_LNG('statement.receivedDelivered'),
      CLIENT_LNG('statement.deadline'),
      CLIENT_LNG('statement.qty'),
      `${CLIENT_LNG('statement.rate')} (${client.currency})`,
      `${CLIENT_LNG('statement.amount')} (${client.currency})`,
      CLIENT_LNG('statement.notes'),
      ,
    ],

    rows: orders,
  };

  table.rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    CLIENT_LNG('statement.total'),
    totalOrders.toLocaleString(client.language, {
      style: 'currency',
      currency: client.currency,
      maximumFractionDigits: client.decimalPoints,
    }),
  ]);

  statement.table(table, {
    x: 20,
    width: 555,
    columnsSize: [20, 125, 80, 60, 50, 50, 50, 120],
    divider: {
      header: { disabled: false, width: 1, opacity: 0.5 },
      horizontal: { disabled: false, opacity: 0.2 },
    },
    prepareHeader: () => {
      statement
        .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
        .fontSize(8)
        .fillColor(textDarkPrimary);
    },
    prepareRow: () =>
      statement
        .font('services/fonts/Ubuntu/Ubuntu-Light.ttf')
        .fontSize(8)
        .fillColor(textDarkSecondary),
  });

  statement.text(CLIENT_LNG('signature'), {
    link: 'https://www.zent-freelance.com',
  });

  if (Object.keys(req.body).length !== 0) {
    // if (!client.email || !user.email)
    //   return HttpError(CLIENT_LNG('errors.statement.send_failed'), 500);
    const buffers = [];
    statement.on('data', buffers.push.bind(buffers));
    statement.on('end', () => {
      let statementBuffer = Buffer.concat(buffers);

      const SibApiV3Sdk = require('sib-api-v3-sdk');
      let defaultClient = SibApiV3Sdk.ApiClient.instance;

      let apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = process.env.SENDINBLUE_KEY;

      let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.subject = CLIENT_LNG('mail.subjectStatement');
      sendSmtpEmail.htmlContent = sendStatement(
        CLIENT_LNG,
        totalOrders,
        totalCounts,
        user,
        client
      );
      sendSmtpEmail.sender = {
        name: user.name || user.email,
        email: 'admin@zent-freelance.com',
      };
      sendSmtpEmail.to = [{ email: email || client.email }];
      sendSmtpEmail.replyTo = { email: user.email };
      sendSmtpEmail.attachment = [
        {
          content: statementBuffer.toString('base64'),
          name: `${CLIENT_LNG('statement.title')}[${client.name}].pdf`,
        },
      ];

      return apiInstance.sendTransacEmail(sendSmtpEmail).then(
        function (data) {},
        function (error) {
          console.error(error);
        }
      );
    });
  }

  statement.end();

  if (Object.keys(req.body).length === 0) {
    statement.pipe(res);
  }
};
