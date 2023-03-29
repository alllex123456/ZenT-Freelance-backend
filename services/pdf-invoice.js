const { fetchImage } = require('../utils/generalFunc');
const PDFDocument = require('pdfkit-table');
const { computeUnits } = require('../utils/compute-units');
const { translateServices } = require('../utils/translateUnits');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const { sendInvoice } = require('./mailer/html-contents');

AWS.config.update({ region: 'eu-west-3' });

let transporter = nodemailer.createTransport({
  SES: new AWS.SES(),
});

const margin = 20;
const textDarkPrimary = '#757575';
const textDarkSecondary = '#006e1e';
const divider = '#2ecc71';
const dividerLight = '#82e0aa';
const tableHeaderBackground = '#fff';

exports.InvoicePDF = async (req, res, invoiceData, email, includeStatement) => {
  const {
    prefix,
    number,
    orders,
    addedItems,
    issuedDate,
    dueDate,
    reversing,
    detailedOrders,
    reversedInvoice,
    previousClientBalance,
  } = invoiceData;

  const user = invoiceData.userData;
  const client = invoiceData.clientData;

  const translationObject = require(`../locales/${client.language}/translation.json`);

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

  const userLogo = await fetchImage(user.invoiceLogo);

  const items = detailedOrders ? orders.concat(addedItems) : addedItems;

  const subTotalInvoice = items.reduce((acc, item) => {
    if (item.discount) {
      return acc;
    } else {
      return (acc += item.total + (item.total * user.VATrate) / 100);
    }
  }, 0);

  const totalDiscount = items.reduce((acc, item) => {
    if (item.discount) {
      return (acc += item.total + (item.total * user.VATrate) / 100);
    } else {
      return acc;
    }
  }, 0);

  const totalWithoutVAT = items.reduce((acc, item) => {
    if (item.discount) return acc;
    return (acc += item.total);
  }, 0);

  const totalInvoice =
    items.reduce(
      (acc, item) => (acc += item.total + (item.total * user.VATrate) / 100),
      0
    ) + previousClientBalance;

  const totalInvoiceVAT = items.reduce(
    (acc, item) => (acc += (item.total * user.VATrate) / 100),
    0
  );

  const invoice = new PDFDocument({
    info: {
      Title: CLIENT_LNG('invoice.title'),
    },
    size: 'A4',
    font: 'services/fonts/Ubuntu/Ubuntu-Regular.ttf',
    margin: 20,
    bufferPages: true,
  });

  invoice.image(userLogo, { fit: [80, 80] });

  invoice
    .fillColor(textDarkPrimary)
    .fontSize(18)
    .lineGap(4)
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(CLIENT_LNG('invoice.title').toUpperCase(), 350, margin, {
      align: 'right',
    })
    .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
    .fontSize(8)
    .fillColor(textDarkSecondary)
    .text(
      `${CLIENT_LNG('invoice.prefix')} ${prefix}/${CLIENT_LNG(
        'invoice.number'
      )} ${number}`,
      { align: 'right' }
    )
    .text(
      reversing
        ? `${CLIENT_LNG('invoice.reverseHeading')} ${reversedInvoice.prefix}/${
            reversedInvoice.number
          }`
        : '',
      { align: 'right' }
    )
    .text(
      `${CLIENT_LNG('invoice.issuedDate')}: ${new Date(
        issuedDate
      ).toLocaleDateString(client.language)}`,
      { align: 'right' }
    )
    .text(
      `${CLIENT_LNG('invoice.maturity')}: ${new Date(
        dueDate
      ).toLocaleDateString(client.language)}`,
      { align: 'right' }
    );

  invoice
    .fontSize(8)
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(`${CLIENT_LNG('invoice.supplier')}:`, margin, invoice.y)
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
    .text(`${CLIENT_LNG('invoice.client')}:`, 20, invoice.y)
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
          label: CLIENT_LNG('invoice.it'),
          headerColor: tableHeaderBackground,
        },
        {
          label: CLIENT_LNG('invoice.description'),
          headerColor: tableHeaderBackground,
        },
        {
          label: CLIENT_LNG('invoice.qty'),
          headerColor: tableHeaderBackground,
        },
        {
          label: CLIENT_LNG('invoice.rate'),
          headerColor: tableHeaderBackground,
        },
        {
          label: `${CLIENT_LNG('invoice.amount')} (${client.currency})`,
          headerColor: tableHeaderBackground,
        },
        {
          label: `${CLIENT_LNG('invoice.vat')} ${user.VATrate}% (${
            client.currency
          })`,
          headerColor: tableHeaderBackground,
        },
        {
          label: `${CLIENT_LNG('invoice.amountWithVAT')} (${client.currency})`,
          headerColor: tableHeaderBackground,
        },
      ],
      rows: [],
    };
  } else {
    table = {
      headers: [
        {
          label: CLIENT_LNG('invoice.it'),
          headerColor: tableHeaderBackground,
        },
        {
          label: CLIENT_LNG('invoice.description'),
          headerColor: tableHeaderBackground,
        },
        {
          label: CLIENT_LNG('invoice.qty'),
          headerColor: tableHeaderBackground,
          renderer: (value) =>
            value.toLocaleString(client.language, {
              maximumFractionDigits: 1,
            }),
        },
        {
          label: CLIENT_LNG('invoice.rate'),
          headerColor: tableHeaderBackground,
        },
        {
          label: `${CLIENT_LNG('invoice.amount')} (${client.currency})`,
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
          : `${
              translateServices([item.service], CLIENT_LNG)?.displayedValue
            } / ${item.reference}`,
        item.addedItem ? item.count : computeUnits(item.count, item.unit),
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
          : `${
              translateServices([item.service], CLIENT_LNG)?.displayedValue
            } / ${item.reference}`,
        item.addedItem ? item.count : computeUnits(item.count, item.unit),
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
    .fontSize(10)
    .fillColor(textDarkPrimary)
    .text(
      `${CLIENT_LNG('invoice.subTotal')}: ${subTotalInvoice.toLocaleString(
        client.language,
        {
          style: 'currency',
          currency: client.currency,
          maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
        }
      )}`,
      { align: 'right' }
    )
    .text(
      `${CLIENT_LNG(
        'statement.previousBalance'
      )}: ${previousClientBalance.toLocaleString(client.language, {
        style: 'currency',
        currency: client.currency,
        maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
      })}`,
      { align: 'right' }
    )
    .text(
      `${CLIENT_LNG('invoice.discount')}: ${totalDiscount.toLocaleString(
        client.language,
        {
          style: 'currency',
          currency: client.currency,
          maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
        }
      )}`,
      { align: 'right' }
    );

  if (user.VATpayer) {
    invoice
      .text(
        `${CLIENT_LNG(
          'invoice.amountWithoutVAT'
        )}: ${totalWithoutVAT.toLocaleString(client.language, {
          style: 'currency',
          currency: client.currency,
          maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
        })}`,
        { align: 'right' }
      )
      .text(
        `${CLIENT_LNG('invoice.vat')}: ${totalInvoiceVAT.toLocaleString(
          client.language,
          {
            style: 'currency',
            currency: client.currency,
            maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
          }
        )}`,
        { align: 'right' }
      );
  }

  invoice.font('services/fonts/Ubuntu/Ubuntu-Medium.ttf').text(
    `${CLIENT_LNG('invoice.toPay')}: ${totalInvoice.toLocaleString(
      client.language,
      {
        style: 'currency',
        currency: client.currency,
        maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
      }
    )}`,
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
      .text(`${CLIENT_LNG('invoice.notes')}`)
      .font('services/fonts/Ubuntu/Ubuntu-Regular.ttf')
      .text(invoice.notes || '');

    invoice.moveDown();
  }

  invoice.moveTo(margin, invoice.y).lineTo(575, invoice.y).stroke(dividerLight);

  invoice.moveDown();

  invoice
    .font('services/fonts/Ubuntu/Ubuntu-Medium.ttf')
    .text(CLIENT_LNG('invoice.paymentInfo').toUpperCase());

  invoice.moveDown();

  const bankAccountsTable = {
    headers: [
      { label: CLIENT_LNG('invoice.bank'), headerColor: tableHeaderBackground },
      { label: CLIENT_LNG('invoice.iban'), headerColor: tableHeaderBackground },
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
    columnsSize: [150, 150, 80],
    divider: {
      header: { disabled: false, width: 1, opacity: 0.2 },
      horizontal: { disabled: true },
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

  invoice.font('services/fonts/Ubuntu/Ubuntu-Regular.ttf');

  invoice.text(CLIENT_LNG('signature'), {
    link: 'https://www.zent-freelance.com',
  });

  //////////////////// STATEMENT ///////////////////////////
  let statement;
  if (Object.keys(req.body).length !== 0 && includeStatement) {
    let statementOrders;

    statementOrders = orders.map((order, index) => [
      index + 1,
      `${translateServices([order.service], CLIENT_LNG)?.displayedValue} / ${
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

    let totalOrders;

    totalOrders = orders.reduce((acc, val) => (acc += val.total), 0);

    statement = new PDFDocument({
      info: {
        Title: `${CLIENT_LNG('statement.title')} ${client.name} la ${new Date(
          req.body.date
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
          req.body.date
        ).toLocaleDateString(client.language)}`
      );

    statement.moveDown(3);

    statement
      .moveTo(margin, statement.y)
      .lineTo(575, statement.y)
      .stroke(divider);

    statement.moveDown(3);

    const statementTable = {
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

      rows: statementOrders,
    };

    table.rows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      CLIENT_LNG('statement.total'),
      `${totalOrders.toLocaleString(client.language, {
        maximumFractionDigits: client.decimalPoints,
      })} ${client.currency}`,
    ]);

    statement.table(statementTable, {
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

    statement.end();
  }

  //////////////////// STATEMENT ///////////////////////////

  if (Object.keys(req.body).length !== 0) {
    if (!client.email || !user.email)
      return HttpError(CLIENT_LNG('errors.invoice.send_failed'), 500);
    const invoiceChunks = [];
    const statementChunks = [];
    invoice.on('data', invoiceChunks.push.bind(invoiceChunks));
    if (includeStatement) {
      statement.on('data', statementChunks.push.bind(statementChunks));
    }
    invoice.on('end', () => {
      let invoiceBuffer = Buffer.concat(invoiceChunks);
      let statementBuffer;
      if (includeStatement) {
        statementBuffer = Buffer.concat(statementChunks);
      }

      return transporter
        .sendMail({
          from: `${user.name || user.email} <admin@zent-freelance.com>`,
          to: `<${email || client.email}>`,
          cc: user.email,
          replyTo: user.email,
          subject: CLIENT_LNG('mail.subjectInvoice'),
          attachments: includeStatement
            ? [
                {
                  filename: `${CLIENT_LNG('invoice.title')}[${
                    client.name
                  }].pdf`,
                  content: invoiceBuffer,
                },
                {
                  filename: `${CLIENT_LNG('statement.title')}[${
                    client.name
                  }].pdf`,
                  content: statementBuffer,
                },
              ]
            : {
                filename: `${CLIENT_LNG('invoice.title')}[${client.name}].pdf`,
                content: invoiceBuffer,
              },
          html: sendInvoice(
            CLIENT_LNG,
            {
              totalInvoice: totalInvoice.toLocaleString(client.language, {
                style: 'currency',
                currency: client.currency,
                maximumFractionDigits: user.VATpayer ? 2 : client.decimalPoints,
              }),
              ...invoiceData._doc,
            },
            user.email
          ),
        })
        .then(() => {})
        .catch((error) => {
          return next(
            new HttpError(CLIENT_LNG('errors.invoice.send_failed'), 500)
          );
        });
    });
  }

  invoice.end();

  if (Object.keys(req.body).length === 0) {
    invoice.pipe(res);
  }
};
