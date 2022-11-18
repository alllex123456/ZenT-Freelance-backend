const fs = require('fs');
const PDFDocument = require('pdfkit-table');

const {
  translateServices,
  translateUnits,
} = require('../utils/translateUnits');

exports.InvoicePDF = (req, res, invoiceData, totalInvoice) => {
  const {
    clientId: client,
    userId: user,
    orders,
    addedItems,
    dueDate,
    invoiceRemainder,
  } = invoiceData;

  const invoice = new PDFDocument({
    info: {
      Title: req.t('invoice.title'),
    },
    size: 'A4',
    font: 'services/fonts/Titillium/TitilliumWeb-Regular.ttf',
    margin: 20,
    bufferPages: true,
  });

  invoice.pipe(
    fs.createWriteStream(
      `./uploads/invoices/${req.t('invoice.title')}[${user.id}][${
        client.name
      }].pdf`
    )
  );

  let gradient = invoice.linearGradient(25, 25, 560, 100);
  gradient.stop(0.3, '#fff').stop(0.5, '#6daae8').stop(1, '#2e86de');
  invoice.rect(25, 25, 560, 100);
  invoice.fill(gradient);
  invoice
    .fill('#fff')
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .fontSize(24)
    .text(req.t('invoice.title').toUpperCase(), 50, 30, {
      align: 'right',
      characterSpacing: 1,
    })
    .fontSize(10)
    .text(
      `${req.t('invoice.series')} ${user.invoiceSeries}/${req.t(
        'invoice.number'
      )} ${invoiceData.number}`,
      {
        align: 'right',
      }
    );
  invoice
    .fontSize(10)
    .text(
      `${req.t('invoice.issuedDate')}: ${new Date().toLocaleDateString(
        user.language
      )}`,
      {
        align: 'right',
      }
    );
  invoice
    .fontSize(10)
    .text(
      `${req.t('invoice.maturity')}: ${new Date(dueDate).toLocaleDateString(
        user.language
      )}`,
      {
        align: 'right',
      }
    );

  invoice.font('services/fonts/Titillium/TitilliumWeb-Regular.ttf');
  invoice.fill('#2f3640');
  invoice
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .fontSize(10)
    .text(`${req.t('invoice.supplier')}: ${user.name}`, 25, 140, { width: 270 })
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(
      `${req.t('invoice.registeredOffice')}: ${user.registeredOffice || ''}`,
      { width: 270 }
    )
    .text(
      `${req.t('invoice.registrationNumber')}: ${user.registrationNumber || ''}`
    )
    .text(`${req.t('invoice.taxNumber')}: ${user.taxNumber}`)
    .text(`${req.t('invoice.bank')}: ${user.bank || ''}`)
    .text(`${req.t('invoice.iban')}: ${user.iban || ''}`);

  invoice
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .fontSize(10)
    .text(`${req.t('invoice.client')}: ${client.name}`, 300, 140, {
      width: 280,
    })
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(
      `${req.t('invoice.registeredOffice')}: ${client.registeredOffice || ''}`,
      {
        width: 280,
      }
    )
    .text(
      `${req.t('invoice.registrationNumber')}: ${
        client.registrationNumber || ''
      }`
    )
    .text(`${req.t('invoice.taxNumber')}: ${client.taxNumber}`)
    .text(`${req.t('invoice.bank')}: ${client.bank || ''}`)
    .text(`${req.t('invoice.iban')}: ${client.iban || ''}`);

  invoice.rect(25, 270, 82, 18);
  invoice.fill('#079992');
  invoice
    .fill('#fff')
    .fontSize(10)
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .text(req.t('invoice.contact').toUpperCase(), 30, 272, {
      characterSpacing: 5,
    });
  invoice.moveDown(0.3);
  invoice
    .fill('#2f3640')
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(`${req.t('invoice.email')}: ${user.email || ''}`, 25)
    .text(`${req.t('invoice.phone')}: ${user.phone || ''}`);

  invoice.rect(300, 270, 82, 18);
  invoice.fill('#079992');
  invoice
    .fill('#fff')
    .fontSize(10)
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .text(req.t('invoice.contact').toUpperCase(), 305, 272, {
      characterSpacing: 5,
    });
  invoice.moveDown(0.3);
  invoice
    .fill('#2f3640')
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(`${req.t('invoice.email')}: ${client.email || ''}`, 300)
    .text(`${req.t('invoice.phone')}: ${client.phone || ''}`);

  let table;
  if (user.VATpayer) {
    table = {
      headers: [
        {
          label: req.t('invoice.it'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: req.t('invoice.jobRef'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: req.t('invoice.qty'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: req.t('invoice.mu'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: `${req.t('invoice.rate')}*`,
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: `${req.t('invoice.amount')} (${client.currency})`,
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: `${req.t('invoice.vat')} ${user.VATrate}% (${
            client.currency
          })`,
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: `${req.t('invoice.amountWithVAT')} (${client.currency})`,
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
      ],

      rows: [[0, req.t('invoice.clientBalance'), '', '', '', client.remainder]],
    };
  } else {
    table = {
      headers: [
        {
          label: req.t('invoice.it'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: req.t('invoice.jobRef'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: req.t('invoice.qty'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: req.t('invoice.mu'),
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: `${req.t('invoice.rate')}*`,
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
        {
          label: `${req.t('invoice.amount')} (${client.currency})`,
          headerColor: '#079992',
          headerOpacity: 0.5,
        },
      ],

      rows: [[0, req.t('invoice.clientBalance'), '', '', '', client.remainder]],
    };
  }

  orders.forEach((order, index) => {
    if (user.VATpayer) {
      table.rows.push([
        index + 1,
        `${translateServices([order.service], req.t)?.displayedValue} / ${
          order.reference
        }`,
        `${order.count.toLocaleString(user.language, {
          maximumFractionDigits: client.decimalPoints,
        })}`,
        `${translateUnits([order.unit], req.t).displayedValue}`,
        `${order.rate.toLocaleString(user.language, {
          maximumFractionDigits: client.decimalPoints,
        })}/${translateUnits([order.unit], req.t).short}`,
        order.total.toLocaleString(user.language, {
          maximumFractionDigits: client.decimalPoints,
        }),
        ((order.total * user.VATrate) / 100).toLocaleString(user.language, {
          maximumFractionDigits: client.decimalPoints,
        }),
        (order.total + (order.total * user.VATrate) / 100).toLocaleString(
          user.language,
          { maximumFractionDigits: client.decimalPoints }
        ),
      ]);
    } else {
      table.rows.push([
        index + 1,
        `${translateServices([order.service], req.t)?.displayedValue} / ${
          order.reference
        }`,
        `${order.count.toLocaleString(user.language, {
          maximumFractionDigits: client.decimalPoints,
        })}`,
        `${translateUnits([order.unit], req.t).displayedValue}`,
        `${order.rate.toLocaleString(user.language, {
          maximumFractionDigits: client.decimalPoints,
        })}/${translateUnits([order.unit], req.t).short}`,
        order.total.toLocaleString(user.language, {
          maximumFractionDigits: client.decimalPoints,
        }),
      ]);
    }
  });

  if (addedItems?.length !== 0) {
    addedItems.forEach((item, index) => {
      if (user.VATpayer) {
        table.rows.push([
          index + 1,
          `-/${item.reference}`,
          `${item.count.toLocaleString(user.language, {
            maximumFractionDigits: client.decimalPoints,
          })}`,
          `${
            item.unit !== '-'
              ? translateUnits([item.unit], req.t).displayedValue
              : '-'
          }`,
          `${item.rate.toLocaleString(user.language, {
            maximumFractionDigits: client.decimalPoints,
          })}/${item.unit ? translateUnits([item.unit], req.t).short : '-'}`,
          item.discount
            ? -item.total.toLocaleString(user.language, {
                maximumFractionDigits: client.decimalPoints,
              })
            : item.total.toLocaleString(user.language, {
                maximumFractionDigits: client.decimalPoints,
              }),
          item.discount
            ? -((item.total * user.VATrate) / 100).toLocaleString(
                user.language,
                { maximumFractionDigits: client.decimalPoints }
              )
            : ((item.total * user.VATrate) / 100).toLocaleString(
                user.language,
                { maximumFractionDigits: client.decimalPoints }
              ),
          item.discount
            ? -(item.total + (item.total * user.VATrate) / 100).toLocaleString(
                user.language,
                { maximumFractionDigits: client.decimalPoints }
              )
            : (item.total + (item.total * user.VATrate) / 100).toLocaleString(
                user.language,
                { maximumFractionDigits: client.decimalPoints }
              ),
        ]);
      } else {
        table.rows.push([
          index + 1,
          `-/${item.reference}`,
          `${item.count.toLocaleString(user.language, {
            maximumFractionDigits: client.decimalPoints,
          })}`,
          `${
            item.unit !== '-'
              ? translateUnits([item.unit], req.t).displayedValue
              : '-'
          }`,
          `${item.rate.toLocaleString(user.language, {
            maximumFractionDigits: client.decimalPoints,
          })}/${translateUnits([item.unit], req.t).short}`,
          item.discount
            ? -item.total.toLocaleString(user.language, {
                maximumFractionDigits: client.decimalPoints,
              })
            : item.total.toLocaleString(user.language, {
                maximumFractionDigits: client.decimalPoints,
              }),
        ]);
      }
    });
  }

  invoice.table(table, {
    width: 560,
    padding: 5,
    x: 25,
    y: 350,
    columnsSize: user.VATpayer
      ? [40, 140, 60, 60, 80, 50, 50, 80]
      : [40, 170, 80, 80, 90, 100],
    divider: {
      header: { disabled: false, width: 2, opacity: 1 },
      horizontal: { disabled: false, opacity: 0.2 },
    },
    prepareHeader: () => {
      invoice
        .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
        .fontSize(10);
    },
    prepareRow: () =>
      invoice
        .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
        .fontSize(8),
  });

  invoice.text(`*${client.currency}/${req.t('invoice.billingUnit')}`);

  invoice.moveDown();
  invoice
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .fontSize(12)
    .text(
      `${req.t('invoice.toPay')}: ${totalInvoice.toLocaleString(user.language, {
        maximumFractionDigits: client.decimalPoints,
      })} ${client.currency}`,
      {
        align: 'right',
      }
    );
  invoice.moveDown();
  invoice
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .fontSize(10)
    .text(
      `${req.t('invoice.remainder')}: ${invoiceRemainder.toLocaleString(
        user.language,
        {
          maximumFractionDigits: client.decimalPoints,
        }
      )} ${client.currency}`,
      {
        align: 'right',
      }
    );

  invoice.moveDown(3);

  invoice.moveTo(20, invoice.y).lineTo(580, invoice.y).stroke();
  invoice
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(`${req.t('invoice.notes')}: ${user.invoiceNotes || ''}`);

  invoice.moveDown(2);

  invoice.text(req.t('signature'));

  invoice.end();

  if (invoiceData._id) {
    invoice.pipe(res);
  }
};
