const PDFDocument = require('pdfkit-table');

const margin = 20;
const textDarkSecondary = '#006e1e';
const divider = '#2ecc71';

exports.ReceiptPDF = (res, receiptData) => {
  const translationObject = require(`../locales/${receiptData.invoiceId.clientData.language}/translation.json`);

  CLIENT_LNG = (args) => {
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

  const invoiceItems = receiptData.invoiceId.detailedOrders
    ? receiptData.invoiceId.orders.concat(receiptData.invoiceId.addedItems)
    : receiptData.invoiceId.addedItems;

  const totalInvoice = invoiceItems.reduce(
    (acc, item) =>
      (acc += item.total + (item.total * receiptData.userId.VATrate) / 100),
    0
  );

  const receipt = new PDFDocument({
    size: 'B6',
    layout: 'landscape',
    font: 'services/fonts/Ubuntu/Ubuntu-Regular.ttf',
    bufferPages: true,
    margin,
  });

  receipt
    .fillColor(textDarkSecondary)
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .fontSize(14)
    .text(CLIENT_LNG('receipt.title').toUpperCase(), 20, 20);
  receipt
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .text(
      `${CLIENT_LNG('receipt.number')} ${receiptData.prefix}${
        receiptData.number
      }`,
      150,
      20,
      {
        align: 'right',
      }
    )
    .text(
      `${CLIENT_LNG(
        'receipt.date'
      )} ${receiptData.dateCashed.toLocaleDateString(
        receiptData.invoiceId.clientData.language
      )}`,
      { align: 'right' }
    );
  receipt.moveDown();
  receipt.fontSize(10).text(
    `${CLIENT_LNG('receipt.amount')} ${receiptData.cashedAmount.toLocaleString(
      receiptData.invoiceId.clientData.language,
      {
        style: 'currency',
        currency: receiptData.invoiceId.clientData.currency,
        maximumFractionDigits: receiptData.invoiceId.clientData.decimalPoints,
      }
    )}`,
    { align: 'right', underline: 'true' }
  );

  receipt.moveDown(2);

  receipt
    .fontSize(10)
    .text(
      `${CLIENT_LNG(
        'receipt.received'
      )} ${receiptData.cashedAmount.toLocaleString(
        receiptData.invoiceId.clientData.language,
        {
          style: 'currency',
          currency: receiptData.invoiceId.clientData.currency,
          maximumFractionDigits: receiptData.invoiceId.clientData.decimalPoints,
        }
      )} ${CLIENT_LNG('receipt.from')} `,
      20
    )
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(receiptData.invoiceId.clientData.name)
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .text(receiptData.invoiceId.clientData.registeredOffice)
    .text(receiptData.invoiceId.clientData.registrationNumber)
    .text(receiptData.invoiceId.clientData.taxNumber)
    .text(
      `${CLIENT_LNG('receipt.for')} ${CLIENT_LNG('receipt.invoice')} ${
        receiptData.invoiceId.prefix
      }${receiptData.invoiceId.number} ${CLIENT_LNG(
        'receipt.amounting'
      )} ${totalInvoice.toLocaleString(
        receiptData.invoiceId.clientData.language,
        {
          style: 'currency',
          currency: receiptData.invoiceId.clientData.currency,
          maximumFractionDigits: receiptData.invoiceId.clientData.decimalPoints,
        }
      )}`
    );

  receipt.moveDown();

  receipt.moveTo(margin, receipt.y).lineTo(575, receipt.y).stroke(divider);

  receipt.moveDown();

  receipt
    .fontSize(8)
    .text(CLIENT_LNG('receipt.receivedBy'))
    .text(receiptData.userId.name);
  receipt.text(CLIENT_LNG('receipt.signature'), { align: 'right' });

  receipt.end();

  receipt.pipe(res);
};
