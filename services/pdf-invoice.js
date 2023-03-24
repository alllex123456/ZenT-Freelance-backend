const fs = require('fs');
const { fetchImage } = require('../utils/generalFunc');
const PDFDocument = require('pdfkit-table');
const { computeUnits } = require('../utils/compute-units');

const margin = 20;
const textDarkPrimary = '#757575';
const textDarkSecondary = '#006e1e';
const divider = '#2ecc71';
const dividerLight = '#82e0aa';
const tableHeaderBackground = '#fff';

const { translateServices } = require('../utils/translateUnits');

exports.InvoicePDF = async (req, res, invoiceData, type) => {
  const {
    series,
    number,
    orders,
    addedItems,
    issuedDate,
    dueDate,
    reversing,
    detailedOrders,
    reversedInvoice,
  } = invoiceData;

  const user = invoiceData.userData;
  const client = invoiceData.clientData;

  const logo = await fetchImage(
    'https://zent.s3.eu-west-3.amazonaws.com/zent-logo-dark.png'
  );

  if (!req) {
    const translationObject = require(`../locales/${client.language}/translation.json`);
    req = {
      t: (args) => {
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
      },
    };
  }

  const items = detailedOrders ? orders.concat(addedItems) : addedItems;

  const totalWithoutDiscount = items.reduce((acc, item) => {
    if (item.discount) return acc;
    return (acc += item.total + (item.total * user.VATrate) / 100);
  }, 0);

  const total = items.reduce(
    (acc, item) => (acc += item.total + (item.total * user.VATrate) / 100),
    0
  );

  const invoice = new PDFDocument({
    info: {
      Title: req.t('invoice.title'),
    },
    size: 'A4',
    font: 'services/fonts/Ubuntu/Ubuntu-Regular.ttf',
    margin: 20,
    bufferPages: true,
  });

  invoice.pipe(
    fs.createWriteStream(
      `./uploads/invoices/${req.t('invoice.title')}[${user._id}][${
        client.name
      }]${type ? type : ''}.pdf`
    )
  );

  invoice.image(logo, { fit: [80, 80] });

  invoice
    .fillColor(textDarkPrimary)
    .fontSize(18)
    .lineGap(4)
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(req.t('invoice.title').toUpperCase(), 350, margin, { align: 'right' })
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .fillColor(textDarkSecondary)
    .text(
      `${req.t('invoice.series')} ${series}/${req.t(
        'invoice.number'
      )} ${number}`,
      { align: 'right' }
    )
    .text(
      reversing
        ? `${req.t('invoice.reverseHeading')} ${reversedInvoice.series}/${
            reversedInvoice.number
          }`
        : '',
      { align: 'right' }
    )
    .text(
      `${req.t('invoice.issuedDate')}: ${new Date(
        issuedDate
      ).toLocaleDateString(client.language)}`,
      { align: 'right' }
    )
    .text(
      `${req.t('invoice.maturity')}: ${new Date(dueDate).toLocaleDateString(
        client.language
      )}`,
      { align: 'right' }
    );

  invoice
    .fontSize(8)
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(`${req.t('invoice.supplier')}:`, margin, invoice.y)
    .fillColor(textDarkPrimary)
    .fontSize(10)
    .text(user.name.toUpperCase(), { width: 270 })
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .fillColor(textDarkSecondary)
    .text(user.registeredOffice, { width: 270 })
    .text(user.registrationNumber, { width: 270 })
    .text(user.taxNumber, { width: 270 })
    .text(user.email, { width: 270 })
    .text(user.phone, { width: 270 });

  invoice.moveDown();

  invoice.moveTo(margin, invoice.y).lineTo(575, invoice.y).stroke(divider);

  invoice.moveDown();

  invoice
    .fontSize(8)
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(`${req.t('invoice.client')}:`, 20, invoice.y)
    .fillColor(textDarkPrimary)
    .fontSize(10)
    .text(client.name.toUpperCase(), { width: 270 })
    .fillColor(textDarkSecondary)
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .text(client.registeredOffice, { width: 270 })
    .text(client.registrationNumber, { width: 270 })
    .text(client.taxNumber, { width: 270 })
    .text(client.bank, { width: 270 })
    .text(client.iban, { width: 270 })
    .text(client.email, { width: 270 })
    .text(client.phone, { width: 270 });

  invoice.moveDown(3);

  ///////////////////////////////////////////

  let table;
  if (user.VATpayer) {
    table = {
      headers: [
        {
          label: req.t('invoice.it'),
          headerColor: tableHeaderBackground,
        },
        {
          label: req.t('invoice.description'),
          headerColor: tableHeaderBackground,
        },
        {
          label: req.t('invoice.qty'),
          headerColor: tableHeaderBackground,
        },
        {
          label: req.t('invoice.rate'),
          headerColor: tableHeaderBackground,
        },
        {
          label: `${req.t('invoice.amount')} (${client.currency})`,
          headerColor: tableHeaderBackground,
        },
        {
          label: `${req.t('invoice.vat')} ${VATrate}% (${client.currency})`,
          headerColor: tableHeaderBackground,
        },
        {
          label: `${req.t('invoice.amountWithVAT')} (${client.currency})`,
          headerColor: tableHeaderBackground,
        },
      ],
      rows: [],
    };
  } else {
    table = {
      headers: [
        {
          label: req.t('invoice.it'),
          headerColor: tableHeaderBackground,
        },
        {
          label: req.t('invoice.description'),
          headerColor: tableHeaderBackground,
        },
        {
          label: req.t('invoice.qty'),
          headerColor: tableHeaderBackground,
        },
        {
          label: req.t('invoice.rate'),
          headerColor: tableHeaderBackground,
        },
        {
          label: `${req.t('invoice.amount')} (${client.currency})`,
          headerColor: tableHeaderBackground,
        },
      ],
      rows: [],
    };
  }

  items.forEach((item, index) => {
    if (user.VATpayer) {
      table.rows.push([
        index + 1,
        item.addedItem
          ? item.description
          : `${translateServices([item.service], req.t)?.displayedValue} / ${
              item.reference
            }`,
        item.addedItem
          ? item.count.toLocaleString(client.language, {
              maximumFractionDigits: 1,
            })
          : `${computeUnits(item.count, item.unit).toLocaleString(
              client.language,
              {
                maximumFractionDigits: 1,
              }
            )}`,
        `${item.rate.toLocaleString(client.language, {
          maximumFractionDigits: 2,
        })}`,
        item.total.toLocaleString(client.language, {
          maximumFractionDigits: 2,
        }),
        ((item.total * user.VATrate) / 100).toLocaleString(client.language, {
          maximumFractionDigits: 2,
        }),
        (item.total + (item.total * user.VATrate) / 100).toLocaleString(
          client.language,
          { maximumFractionDigits: 2 }
        ),
      ]);
    } else {
      table.rows.push([
        index + 1,
        item.addedItem
          ? item.description
          : `${translateServices([item.service], req.t)?.displayedValue} / ${
              item.reference
            }`,
        item.addedItem
          ? item.count.toLocaleString(client.language, {
              maximumFractionDigits: 1,
            })
          : `${computeUnits(item.count, item.unit).toLocaleString(
              client.language,
              {
                maximumFractionDigits: 1,
              }
            )}`,
        `${item.rate.toLocaleString(client.language, {
          maximumFractionDigits: client.decimalPoints,
        })}`,
        item.total.toLocaleString(client.language, {
          maximumFractionDigits: client.decimalPoints,
        }),
      ]);
    }
  });

  invoice.table(table, {
    width: 575,
    padding: 5,
    x: margin,
    y: invoice.y,
    columnsSize: user.VATpayer
      ? [40, 165, 80, 80, 50, 50, 90]
      : [40, 200, 100, 100, 115],
    divider: {
      header: { disabled: false, width: 1, opacity: 0.5 },
      horizontal: { disabled: false, opacity: 0.2 },
    },
    prepareHeader: () => {
      invoice
        .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
        .fontSize(8)
        .fillColor(textDarkPrimary);
    },
    prepareRow: () =>
      invoice
        .font('services/fonts/Ubuntu/Ubuntu-Light.ttf')
        .fontSize(8)
        .fillColor(textDarkSecondary),
  });

  invoice.moveDown(2);

  invoice
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .text(
      `${req.t('invoice.subtotal')}: ${totalWithoutDiscount.toLocaleString(
        client.language,
        {
          style: 'currency',
          currency: client.currency,
          maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
        }
      )}`,
      {
        align: 'right',
      }
    )
    .text(
      `${req.t('invoice.discount')}: ${(
        totalWithoutDiscount - total
      ).toLocaleString(client.language, {
        style: 'currency',
        currency: client.currency,
        maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
      })}`,
      {
        align: 'right',
      }
    );

  invoice
    .fontSize(10)
    .fillColor(textDarkPrimary)
    .text(
      `${req.t('invoice.toPay')}: ${total.toLocaleString(client.language, {
        style: 'currency',
        currency: client.currency,
        maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
      })}`,
      { align: 'right' }
    );

  invoice.moveDown();

  if (invoice.notes) {
    invoice
      .moveTo(margin, invoice.y)
      .lineTo(575, invoice.y)
      .stroke(dividerLight);

    invoice.moveDown();

    invoice
      .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
      .text(`${req.t('invoice.notes')}`)
      .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
      .text(invoice.notes || '');

    invoice.moveDown();
  }

  invoice.moveTo(margin, invoice.y).lineTo(575, invoice.y).stroke(dividerLight);

  invoice.moveDown();

  invoice
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(req.t('invoice.paymentInfo').toUpperCase());

  invoice.moveDown();

  const bankAccountsTable = {
    headers: [
      { label: req.t('invoice.bank'), headerColor: tableHeaderBackground },
      { label: req.t('invoice.iban'), headerColor: tableHeaderBackground },
      { label: 'SWIFT', headerColor: tableHeaderBackground },
    ],
    rows: [],
  };
  invoiceData.bankAccounts.forEach((account) => {
    if (account.iban) {
      bankAccountsTable.rows.push([account.bank, account.iban, account.swift]);
    }
  });

  invoice.table(bankAccountsTable, {
    width: 575,
    padding: 5,
    x: margin,
    y: invoice.y,
    columnsSize: [200, 150, 100],
    divider: {
      header: { disabled: false, width: 1, opacity: 0.5 },
      horizontal: { disabled: false, opacity: 0.2 },
    },
    prepareHeader: () => {
      invoice
        .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
        .fontSize(8)
        .fillColor(textDarkPrimary);
    },
    prepareRow: () =>
      invoice
        .font('services/fonts/Ubuntu/Ubuntu-Light.ttf')
        .fontSize(8)
        .fillColor(textDarkSecondary),
  });

  invoice.moveDown();

  invoice.moveTo(margin, invoice.y).lineTo(575, invoice.y).stroke(dividerLight);

  invoice.moveDown();

  invoice.font('services/fonts/Ubuntu/Ubuntu-Regular.ttf');

  invoice.text(req.t('signature'), { link: 'https://www.zent-freelance.com' });

  invoice.end();

  if (res && invoiceData._id) {
    invoice.pipe(res);
  }
};
