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

  // invoice.rect(25, 25, 560, 100);
  // invoice.fill('#6daae8').stroke();
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
      characterSpacing: 2,
    })
    .fontSize(10)
    .text(
      `${req.t('invoice.series')} ${user.invoiceSeries}/${req.t(
        'invoice.number'
      )} ${user.invoiceStartNumber}`,
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
  invoice.fill('black');
  invoice
    .font('services/fonts/Titillium/TitilliumWeb-Bold.ttf')
    .fontSize(10)
    .text(`${req.t('invoice.supplier')}: ${user.name}`, 25, 140, { width: 270 })
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(
      `${req.t('invoice.registeredOffice')}: ${user.registeredOffice || ''}`
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
      `${req.t('invoice.registeredOffice')}: ${client.registeredOffice || ''}`
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
    .fill('#000')
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
    .fill('#000')
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(`${req.t('invoice.email')}: ${client.email || ''}`, 300)
    .text(`${req.t('invoice.phone')}: ${client.phone || ''}`);

  const table = {
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
  orders.forEach((order, index) => {
    table.rows.push([
      index + 1,
      `${translateServices([order.service], req.t).displayedValue} / ${
        order.reference
      }`,
      `${order.count.toLocaleString(user.language)}`,
      `${translateUnits([order.unit], req.t).displayedValue}`,
      `${order.rate.toLocaleString(user.language)}/${
        translateUnits([order.unit], req.t).short
      }`,
      order.total.toLocaleString(user.language),
    ]);
  });

  invoice.table(table, {
    width: 560,
    padding: 5,
    x: 25,
    y: 350,
    columnsSize: [40, 170, 80, 90, 100, 80],
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
    .fontSize(10)
    .text(
      `${req.t('invoice.toPay')}: ${totalInvoice.toLocaleString(user.language, {
        style: 'currency',
        currency: client.currency,
      })}`,
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
          style: 'currency',
          currency: client.currency,
        }
      )}`,
      {
        align: 'right',
      }
    );

  invoice.moveDown(3);

  invoice.rect(invoice.x, invoice.y, 560, 20).stroke();
  invoice
    .font('services/fonts/Titillium/TitilliumWeb-Regular.ttf')
    .text(`${req.t('invoice.notes')}: ${user.invoiceNotes || ''}`);

  invoice.moveDown(1);

  invoice.moveDown(2);

  invoice.text(req.t('signature'));

  invoice.end();

  invoice.pipe(res);
};
