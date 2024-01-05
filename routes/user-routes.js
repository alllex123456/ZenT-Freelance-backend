const express = require('express');
const { check } = require('express-validator');
const authGuard = require('../middleware/auth-guard');
const router = express.Router();

const {
  signup,
  login,
  updateUser,
  getUserData,
  getRecoverPassword,
  postRecoverPassword,
  changePassword,
  saveAccessToken,
} = require('../controllers/user-controllers');
const { signS3 } = require('../middleware/aws-s3');

router.post(
  '/signup',
  [
    check('email')
      .normalizeEmail()
      .isEmail()
      .withMessage('Adresa de e-mail introdusă nu este validă'),
    check('password')
      .isLength({ min: 5 })
      .withMessage('Parola trebuie să fie formată din cel puțin 5 caractere'),
  ],
  signup
);
router.post('/login', login);
router.post(
  '/recover-password',
  [
    check('email')
      .normalizeEmail()
      .isEmail()
      .withMessage('Adresa de e-mail introdusă nu este validă'),
  ],
  getRecoverPassword
);
router.post(
  '/reset-password',
  [
    check('email')
      .normalizeEmail()
      .isEmail()
      .withMessage('Adresa de e-mail introdusă nu este validă'),
    check('password')
      .isLength({ min: 5 })
      .withMessage('Parola trebuie să fie formată din cel puțin 5 caractere'),
  ],
  postRecoverPassword
);

router.use(authGuard);
router.post('/save-access-token', saveAccessToken);
router.get('/', getUserData);
router.get('/sign-s3', signS3);
router.post('/update', updateUser);
router.post('/change-password', changePassword);

module.exports = router;
