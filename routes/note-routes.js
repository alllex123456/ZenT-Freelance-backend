const express = require('express');
const {
  getNotes,
  saveNote,
  removeNote,
} = require('../controllers/note-controllers');
const authGuard = require('../middleware/auth-guard');
const router = express.Router();

router.use(authGuard);
router.get('/get-notes', getNotes);
router.post('/save-note', saveNote);
router.delete('/remove-note/:noteId', removeNote);

module.exports = router;
