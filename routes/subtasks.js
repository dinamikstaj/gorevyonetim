const express = require('express');
const router = express.Router();
const Subtask = require('../models/Subtask');

// Create subtask
router.post('/', async (req, res) => {
  try {
    const { taskId, title } = req.body;
    const subtask = new Subtask({ taskId, title, completed: false });
    await subtask.save();
    res.status(201).json(subtask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update subtask completion status
router.put('/:id', async (req, res) => {
  try {
    const { completed } = req.body;
    const updatedSubtask = await Subtask.findByIdAndUpdate(
      req.params.id,
      { completed },
      { new: true }
    );
    res.json(updatedSubtask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;