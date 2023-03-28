const PDFDocument = require('pdfkit-table');
const { translateServices } = require('../utils/translateUnits');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');

AWS.config.update({ region: 'eu-west-3' });

let transporter = nodemailer.createTransport({
  SES: new AWS.SES(),
});

const margin = 20;
const textDarkPrimary = '#757575';
const textDarkSecondary = '#006e1e';
const divider = '#2ecc71';

exports.StatementPDF = (res, client, user, time, req, invoiceOrders, email) => {
  const language = (args) => {
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

  const statement = new PDFDocument({
    info: {
      Title: `${language('statement.title')} ${client.name} la ${new Date(
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
    .text(language('statement.title').toUpperCase())
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .fillColor(textDarkSecondary)
    .text(`${language('statement.clientName')}: ${client.name}`)
    .text(
      `${language('statement.generatedAt')}: ${new Date(
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
      language('statement.it'),
      language('statement.jobRef'),
      language('statement.receivedDelivered'),
      language('statement.deadline'),
      language('statement.qty'),
      `${language('statement.rate')} (${client.currency})`,
      `${language('statement.amount')} (${client.currency})`,
      language('statement.notes'),
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
    language('statement.total'),
    `${totalOrders.toLocaleString(client.language, {
      maximumFractionDigits: client.decimalPoints,
    })} ${client.currency}`,
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

  statement.text(language('signature'), {
    link: 'https://www.zent-freelance.com',
  });

  if (Object.keys(req.body).length !== 0) {
    if (!client.email || !user.email)
      return HttpError(language('errors.statement.send_failed'), 500);
    const buffers = [];
    statement.on('data', buffers.push.bind(buffers));
    statement.on('end', () => {
      let pdfData = Buffer.concat(buffers);

      return transporter
        .sendMail({
          from: `${user.name || user.email} <admin@zent-freelance.com>`,
          to: `<${email || client.email}>`,
          replyTo: user.email,
          subject:
            client.language === 'ro'
              ? 'Evidența lucrarilor la zi'
              : 'Updated statement of work',
          attachments: {
            filename: `${language('statement.title')}[${client.name}].pdf`,
            content: pdfData,
          },
          html: user.statementEmailMessage[`${client.language}`],
        })
        .then(() => {})
        .catch((error) => {
          return next(
            new HttpError(language('errors.statement.send_failed'), 500)
          );
        });
    });
  }

  statement.end();

  if (Object.keys(req.body).length === 0) {
    statement.pipe(res);
  }
};
