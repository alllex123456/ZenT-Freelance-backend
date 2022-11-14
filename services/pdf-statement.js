const fs = require('fs');
const { translateServices } = require('../utils/translateUnits');

const PDFDocument = require('pdfkit-table');

exports.StatementPDF = (res, client, user, time, req, invoiceOrders) => {
  const completedOrders = client.orders.filter(
    (order) => order.status === 'completed'
  );

  let orders;

  if (Object.keys(req.body).length === 0) {
    orders = completedOrders.map((order, index) => [
      index + 1,
      `${translateServices([order.service], req.t)?.displayedValue} / ${
        order.reference
      }`,
      `${new Date(order.receivedDate).toLocaleDateString()} /
        ${
          order.deliveredDate
            ? new Date(order.deliveredDate).toLocaleDateString()
            : new Date(order.receivedDate).toLocaleDateString()
        }`,
      new Date(order.deadline).toLocaleDateString(user.language),
      order.count.toLocaleString(user.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.rate.toLocaleString(user.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.total.toLocaleString(user.language, {
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
      `${new Date(order.receivedDate).toLocaleDateString()} /
        ${new Date(order.deliveredDate).toLocaleDateString()}`,
      new Date(order.deadline).toLocaleDateString(user.language),
      order.count.toLocaleString(user.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.rate.toLocaleString(user.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.total.toLocaleString(user.language, {
        maximumFractionDigits: client.decimalPoints,
      }),
      order.notes,
    ]);
  }

  let totalOrders;

  if (Object.keys(req.body).length === 0) {
    totalOrders = completedOrders.reduce((acc, val) => (acc += val.total), 0);
  } else {
    totalOrders = invoiceOrders.reduce((acc, val) => (acc += val.total), 0);
  }

  const statement = new PDFDocument({
    info: {
      Title: `${req.t('statement.title')} ${
        client.name
      } la ${new Date().toLocaleString()}`,
    },
    size: 'A4',
    font: 'services/fonts/Titillium/TitilliumWeb-Regular.ttf',
    margin: 20,
    bufferPages: true,
  });

  statement.pipe(
    fs.createWriteStream(
      `./uploads/statements/${req.t('statement.title')}[${user.id}][${
        client.name
      }].pdf`
    )
  );

  statement.rect(20, 20, 450, 70);
  statement.fill('#589ee5').stroke();
  statement.image(`uploads/avatars/${client.id}`, 480, 20, { width: 80 });
  statement
    .fill('#fff')
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .fontSize(14)
    .text(req.t('statement.title').toUpperCase(), 25, 25)
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .fontSize(8)
    .text(`Cod client: ${client.id}`)
    .text(`Nume client: ${client.name}`)
    .text(`Generat la: ${new Date(time).toLocaleString(user.language)}`);

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
    `${totalOrders.toLocaleString(user.language, {
      maximumFractionDigits: client.decimalPoints,
    })} ${client.currency}`,
  ]);
  table.rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    req.t('statement.previousBalance'),
    `${client.remainder.toLocaleString(user.language, {
      maximumFractionDigits: client.decimalPoints,
    })} ${client.currency}`,
  ]);

  statement.table(table, {
    x: 20,
    width: 560,
    columnsSize: [20, 100, 80, 60, 50, 50, 50, 120],
  });

  statement.text(req.t('signature'));

  statement.end();

  if (Object.keys(req.body).length === 0) {
    statement.pipe(res);
  }
};
