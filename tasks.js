// router/tasks.js (DÜZELTİLMİŞ SÜRÜM)

const express = require('express');
const router = express.Router();
const Task = require('../models/Task'); // Task modelinizin doğru yolda olduğundan emin olun

// GET all tasks
router.get('/', async (req, res) => {
    try {
        // populate('subtasks') kaldırıldı, çünkü Task modelinde subtasks alanı tanımlı değil.
        const tasks = await Task.find();
        res.json(tasks);
    } catch (err) {
        console.error('Backend Hatası (GET /tasks):', err.message); // Loglama eklendi
        res.status(500).json({ message: err.message });
    }
});

// CREATE a new task
router.post('/', async (req, res) => {
    // BURADAKİ DESTRUCTURING'E 'type' ALANI EKLENDİ!
    const { title, description, assignedTo, assignedBy, status, type } = req.body;

    const task = new Task({
        title,
        description,
        assignedTo,
        assignedBy,
        status: status || 'beklemede', // Varsayılan olarak beklemede
        type, // `type` alanı buraya eklendi!
        // subtasks: [] - Task modelinde tanımlı olmadığı için kaldırıldı.
    });

    try {
        const newTask = await task.save();
        res.status(201).json(newTask);
    } catch (err) {
        console.error('Backend Hatası (POST /tasks):', err.message); // Loglama eklendi
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message, errors: err.errors });
        }
        res.status(500).json({ message: err.message });
    }
});

// UPDATE a task by ID
router.put('/:id', async (req, res) => {
    try {
        // 'type' buraya da eklendi
        const { title, description, assignedTo, assignedBy, status, type } = req.body;
        const taskId = req.params.id;

        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { title, description, assignedTo, assignedBy, status, type }, // 'type' buraya da eklendi
            { new: true, runValidators: true }
        );
        // .populate('subtasks'); // Kaldırıldı

        if (!updatedTask) {
            return res.status(404).json({ message: 'Görev bulunamadı' });
        }
        res.json(updatedTask);
    } catch (err) {
        console.error('Backend Hatası (PUT /tasks/:id):', err.message); // Loglama eklendi
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message, errors: err.errors });
        }
        res.status(400).json({ message: err.message });
    }
});

// DELETE a task by ID
router.delete('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const deletedTask = await Task.findByIdAndDelete(taskId);

        if (!deletedTask) {
            return res.status(404).json({ message: 'Görev bulunamadı' });
        }
        res.json({ message: 'Görev başarıyla silindi' });
    } catch (err) {
        console.error('Backend Hatası (DELETE /tasks/:id):', err.message); // Loglama eklendi
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;