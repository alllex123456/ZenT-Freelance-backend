const express = require('express');
const {
  getAllClients,
  getClient,
  addClient,
  modifyClient,
  deleteClient,
} = require('../controllers/clients-controllers');
const { fileUploadImages } = require('../middleware/file-upload');
const authGuard = require('../middleware/auth-guard');
const { signS3 } = require('../middleware/aws-s3');
const router = express.Router();

router.use(authGuard);

router.get('/', getAllClients);
router.get('/:clientId/sign-s3', signS3);
router.get('/client/:clientId', getClient);

router.post('/add-client', addClient);
router.patch('/modify-client', fileUploadImages.single('avatar'), modifyClient);
router.delete('/delete-client/:clientId', deleteClient);

module.exports = router;
