const fs = require('fs');

const PDFDocument = require('pdfkit-table');
const { measurementUnit } = require('../utils/generalFunc');

exports.StatementPDF = (res, client, user, time) => {
  const completedOrders = client.orders.filter(
    (order) => order.status === 'completed'
  );

  const orders = completedOrders.map((order, index) => [
    index + 1,
    `${order.service} / ${order.reference}`,
    `${new Date(order.receivedDate).toLocaleDateString()} /
        ${new Date(order.deliveredDate).toLocaleDateString()}`,
    new Date(order.deadline).toLocaleDateString(user.language),
    order.count.toLocaleString(user.language),
    order.rate.toLocaleString(user.language),
    order.total.toFixed(client.decimalPoints).toLocaleString(user.language),
    order.notes,
  ]);

  const totalOrders = completedOrders.reduce(
    (acc, val) => (acc += val.total),
    0
  );

  const statement = new PDFDocument({
    info: {
      Title: `Situație ${client.name} la ${new Date().toLocaleString()}`,
    },
    size: 'A4',
    font: 'services/fonts/Titillium/TitilliumWeb-Regular.ttf',
    margin: 20,
    bufferPages: true,
  });

  statement.pipe(
    fs.createWriteStream(
      `./uploads/statements/Statement[${user.id}][${client.name}].pdf`
    )
  );

  statement.rect(20, 20, 560, 70);
  statement.fill('#589ee5').stroke();
  statement
    .fill('#fff')
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .fontSize(14)
    .text('SITUATIE LUCRARI LA ZI', 25, 25)
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .fontSize(8)
    .text(`Cod client: ${client.id}`)
    .text(`Nume client: ${client.name}`)
    .text(`Generat la: ${new Date(time).toLocaleString(user.language)}`);

  statement.moveDown(3);

  const table = {
    headers: [
      'Nr.',
      'Tip Serviciu/Referinta client',
      'Primit/predat',
      'Termen',
      'Cantitate',
      `Tarif (${client.currency}/unitate)`,
      `Total (${client.currency})`,
      'Note',
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
    'Total situatie:',
    `${totalOrders
      .toFixed(client.decimalPoints)
      .toLocaleString(user.language)} ${client.currency}`,
  ]);
  table.rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    'In sold client:',
    `${client.remainder.toLocaleString(user.language)} ${client.currency}`,
  ]);

  statement.table(table, {
    x: 20,
    width: 560,
    columnSize: [20, 100, 60, 30, 50, 50, 50, 50],
  });

  statement.text('Document generat cu ZenT Freelance');

  statement.end();

  statement.pipe(res);
};
