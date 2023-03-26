const fs = require('fs');
const { translateServices } = require('../utils/translateUnits');

const PDFDocument = require('pdfkit-table');

const margin = 20;
const textDarkPrimary = '#757575';
const textDarkSecondary = '#006e1e';
const divider = '#2ecc71';

exports.StatementPDF = (res, client, user, time, req, invoiceOrders) => {
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
      Title: `${req.t('statement.title')} ${client.name} la ${new Date(
        time
      ).toLocaleDateString(client.language)}`,
    },
    size: 'A4',
    font: 'services/fonts/Ubuntu/Ubuntu-Regular.ttf',
    margin,
    bufferPages: true,
  });

  statement.pipe(
    fs.createWriteStream(
      `./uploads/statements/${req.t('statement.title')}[${user.id}][${
        client.name
      }].pdf`
    )
  );

  statement
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .fontSize(14)
    .fillColor(textDarkPrimary)
    .text(req.t('statement.title').toUpperCase())
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .fillColor(textDarkSecondary)
    .text(`Nume client: ${client.name}`)
    .text(`Generat la: ${new Date(time).toLocaleDateString(client.language)}`);

  statement.moveDown(3);

  statement
    .moveTo(margin, statement.y)
    .lineTo(575, statement.y)
    .stroke(divider);

  statement.moveDown(3);

  const table = {
    headers: [
      req.t('statement.it'),
      req.t('statement.jobRef'),
      req.t('statement.receivedDelivered'),
      req.t('statement.deadline'),
      req.t('statement.qty'),
      `${req.t('statement.rate')} (${client.currency})`,
      `${req.t('statement.amount')} (${client.currency})`,
      req.t('statement.notes'),
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
    req.t('statement.total'),
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

  statement.text(req.t('signature'), {
    link: 'https://www.zent-freelance.com',
  });

  statement.end();

  if (Object.keys(req.body).length === 0) {
    statement.pipe(res);
  }
};
