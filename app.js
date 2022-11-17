const express = require('express');
const aws = require('aws-sdk');
const dotenv = require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const HttpError = require('./models/http-error');

// aws bucket
aws.config.region = 'eu-west-3';

// i18NEXT
const i18next = require('i18next');
const backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

i18next
  .use(backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: `./locales/{{lng}}/translation.json`,
    },
  });
///////////////////////
const app = express();

app.use(bodyParser.json());
app.use(middleware.handle(i18next));
app.use('/uploads/avatars', express.static(path.join('uploads', 'avatars')));
app.use('/uploads/invoices', express.static(path.join('uploads', 'invoices')));
app.use(
  '/uploads/statements',
  express.static(path.join('uploads', 'statements'))
);

//CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, Content-Type, X-Requested-With, Accept, Authorization, Payload'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

// ROUTES
const appRoutes = require('./routes/app-routes');
const orderRoutes = require('./routes/order-routes');
const userRoutes = require('./routes/user-routes');
const clientsRoutes = require('./routes/clients-routes');
const statementsRoutes = require('./routes/statements-routes');
const metricsRoutes = require('./routes/metrics-routes');
const noteRoutes = require('./routes/note-routes');
const invoiceRoutes = require('./routes/invoice-routes');
app.use('/app', appRoutes);
app.use('/user', userRoutes);
app.use('/orders', orderRoutes);
app.use('/clients', clientsRoutes);
app.use('/statements', statementsRoutes);
app.use('/invoicing', invoiceRoutes);
app.use('/metrics', metricsRoutes);
app.use('/notes', noteRoutes);

app.use((req, res, next) => {
  throw new HttpError('No route found', 500);
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => console.log(err));
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500).json({
    message: error.message || 'An unknown message error occurred',
  });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.vndt4.mongodb.net/${process.env.DATABASE}?retryWrites=true&w=majority`
  )
  .then(() => app.listen(process.env.PORT || 8000))
  .catch((error) => console.log(error));
