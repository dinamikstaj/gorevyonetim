const express = require('express');
const router = express.Router();
const Personnel = require('../models/personnel');

// GET all personnel
router.get('/', async (req, res) => {
  try {
    const personnel = await Personnel.find();
    res.json(personnel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new personnel
router.post('/', async (req, res) => {
  const person = new Personnel({
    name: req.body.name,
  });

  try {
    const newPerson = await person.save();
    res.status(201).json(newPerson);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
