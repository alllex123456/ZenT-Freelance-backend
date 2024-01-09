const User = require('../models/user');
const Invoice = require('../models/invoice');
const xml2js = require('xml2js');
const { generateXMLInvoice } = require('../utils/generateXMLInvoice');

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

exports.generateEfacturaXML = async (req, res, next) => {
  let invoice;
  try {
    invoice = await Invoice.findById(req.headers.payload).populate(
      'userId clientId'
    );
  } catch (error) {
    return next(new HttpError('Factura nu exista'), 404);
  }

  const xmlContent = generateXMLInvoice(invoice);

  res.setHeader('Content-Type', 'application/xml');

  res.send(xmlContent);
};

exports.uploadXMLInvoice = async (req, res, next) => {
  const { invoiceId } = req.body;

  let invoice;
  try {
    invoice = await Invoice.findById(invoiceId).populate('userId clientId');
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
      xml2js.parseString(xmlData, (err, result) => {
        if (err) {
          console.error('Error parsing XML:', err);
          res.status(500).json({ error: 'Error parsing XML response' });
        } else {
          res.json(result);
        }
      });
    } else {
      console.error('Failed to fetch message status:', response.statusText);
      throw new Error(`Failed to fetch message status: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error fetching message status:', error);
    throw error;
  }
};
