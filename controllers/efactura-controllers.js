const User = require('../models/user');
const Invoice = require('../models/invoice');
const xml2js = require('xml2js');
const { generateXMLInvoice } = require('../utils/generateXMLInvoice');
const HttpError = require('../models/http-error');

exports.checkEfacturaMessages = async (req, res, next) => {
  const userId = req.body.user;

  if (userId.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  let user;

  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }
  if (!user.efacturaToken) return;

  const cif = user.cnp || user.taxNumber;

  const apiUrl = `https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura?zile=30&cif=${cif}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.efacturaToken}`,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching message status:', error);
    throw error;
  }
};

exports.checkEfacturaStatus = async (req, res, next) => {
  const { eFacturaIndex, userId } = req.headers.payload;

  let user;

  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 401));
  }

  const apiUrl = ` https://api.anaf.ro/prod/FCTEL/rest/stareMesaj?id_incarcare=${eFacturaIndex}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.efacturaToken}`,
      },
    });

    if (response.ok) {
      const xmlData = await response.text();
      xml2js.parseString(xmlData, (err, result) => {
        if (err) {
          res.status(500).json({ error: 'Error parsing XML response' });
        } else {
          res.json(result);
        }
      });
    } else {
      throw new Error(`Failed to fetch message status: ${response.statusText}`);
    }
  } catch (error) {
    throw error;
  }
};

exports.generateEfacturaXML = async (req, res, next) => {
  let invoice;
  try {
    invoice = await Invoice.findById(req.headers.payload).populate(
      'userId clientId orders addedItems'
    );
  } catch (error) {
    return next(new HttpError('Factura nu exista'), 404);
  }

  const xmlContent = generateXMLInvoice(invoice);

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename=invoice.xml`);

  res.send(xmlContent);
};

exports.uploadXMLInvoice = async (req, res, next) => {
  const { invoiceId } = req.body;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate(
      'userId clientId orders addedItems'
    );
  } catch (error) {
    return next(new HttpError('Factura nu exista'), 404);
  }

  if (invoice.userId._id.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  const cif = invoice.userId.cnp || invoice.userId.taxNumber;

  const apiUrl = `https://api.anaf.ro/prod/FCTEL/rest/upload?standard=UBL&cif=${cif}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${invoice.userId.efacturaToken}`,
      },
      body: generateXMLInvoice(invoice),
    });

    if (response.ok) {
      const xmlData = await response.text();
      xml2js.parseString(xmlData, async (err, result) => {
        if (err) {
          res.status(500).json({
            error: 'Error parsing XML response',
          });
        } else {
          if (!result.header.Errors) {
            invoice.eFacturaStatus = 'sent';
            invoice.eFacturaIndex = result.header.index_incarcare;
            console.log(result.header.index_incarcare);
            try {
              await invoice.save();
            } catch (error) {
              return next(
                new HttpError(req.t('errors.invoicing.update_failed'), 401)
              );
            }
          } else {
            // console.log(JSON.stringify(result));
            invoice.eFacturaStatus = 'failed';
            try {
              await invoice.save();
            } catch (error) {
              return next(
                new HttpError(req.t('errors.invoicing.update_failed'), 401)
              );
            }
          }
          res.json(result);
        }
      });
    } else {
      throw new Error(`Failed to fetch message status: ${response.statusText}`);
    }
  } catch (error) {
    throw error;
  }
};

exports.XMLtoPDF = async (req, res, next) => {
  const { invoiceId } = req.headers.payload;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate('userId clientId');
  } catch (error) {
    return next(new HttpError('Factura nu exista'), 404);
  }

  const apiUrl =
    'https://webservicesp.anaf.ro/prod/FCTEL/rest/transformare/FACT1/DA';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text-/plain',
      },
      body: generateXMLInvoice(invoice),
    });
    res.send(response);
  } catch (error) {
    throw error;
  }
};

exports.downloadXMLInvoice = async (req, res, next) => {
  const invoiceId = req.headers.payload;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate('userId');
  } catch (error) {
    return next(new HttpError('Factura nu exista'), 404);
  }

  if (invoice.userId._id.toString() !== req.userData.userId) {
    return next(new HttpError(req.t('errors.user.no_authorization'), 401));
  }

  if (!invoice.eFacturaIndex) {
    return next(new HttpError('Factura nu a fost incarcata in SPV!', 401));
  }

  // GET ID_DESCARCARE
  let downloadId;
  try {
    const response = await fetch(
      `https://api.anaf.ro/prod/FCTEL/rest/stareMesaj?id_incarcare=${invoice.eFacturaIndex}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${invoice.userId.efacturaToken}`,
        },
      }
    );

    if (response.ok) {
      const xmlData = await response.text();
      xml2js.parseString(xmlData, (err, result) => {
        if (err) {
          res.status(500).json({ error: 'Error parsing XML response' });
        } else {
          downloadId = result.header.$.id_descarcare;
        }
      });
    } else {
      throw new Error(`Failed to fetch message status: ${response.statusText}`);
    }
  } catch (error) {
    throw error;
  }

  const apiUrl = `https://api.anaf.ro/prod/FCTEL/rest/descarcare?id=${downloadId}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${invoice.userId.efacturaToken}`,
      },
    });

    // res.setHeader('Content-Type', 'application/zip');

    const reader = response.body.getReader();

    const pump = () => {
      return reader.read().then(({ done, value }) => {
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        return pump();
      });
    };

    pump();
  } catch (error) {
    throw error;
  }
};
