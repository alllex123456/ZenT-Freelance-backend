const mongoose = require('mongoose');

const Note = require('../models/note');
const User = require('../models/user');
const HttpError = require('../models/http-error');

exports.getNotes = async (req, res, next) => {
  const { userId } = req.userData;

  let notes;
  try {
    notes = await Note.find({ userId });
  } catch (error) {
    return next(new HttpError(req.t('errors.notes.not_found'), 500));
  }

  res.json({ message: notes.map((note) => note.toObject({ getters: true })) });
};

exports.saveNote = async (req, res, next) => {
  const { userId } = req.userData;
  const { note } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError(req.t('errors.user.not_found'), 500));
  }

  if (!user) {
    return next(new HttpError(req.t('errors.user.no_user'), 500));
  }

  const newNote = new Note({
    userId,
    note,
  });
  user.notes.push(newNote);

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await user.save({ session });
    await newNote.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.notes.save_failed'), 500));
  }

  res.json({ message: newNote.toObject({ getters: true }) });
};

exports.removeNote = async (req, res, next) => {
  const { noteId } = req.params;

  let note;
  try {
    note = await Note.findById(noteId).populate('userId');
  } catch (error) {
    return next(new HttpError(req.t('errors.notes.not_found'), 500));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await note.remove({ session });
    note.userId.notes.pull(note);
    await note.userId.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError(req.t('errors.notes.delete_failed'), 500));
  }

  let notes;
  try {
    notes = await Note.find({ userId: note.userId._id });
  } catch (error) {
    return next(new HttpError(req.t('errors.notes.not_found'), 500));
  }

  res.json({ message: notes.map((note) => note.toObject({ getters: true })) });
};
