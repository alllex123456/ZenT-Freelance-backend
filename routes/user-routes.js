const express = require('express');
const { check } = require('express-validator');
const { fileUploadImages } = require('../middleware/file-upload');
const authGuard = require('../middleware/auth-guard');
const router = express.Router();

const {
  signup,
  login,
  updateUser,
  getUserData,
  getRecoverPassword,
  postRecoverPassword,
} = require('../controllers/user-controllers');

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
router.get('/', getUserData);
router.post('/update', fileUploadImages.single('avatar'), updateUser);

module.exports = router;
