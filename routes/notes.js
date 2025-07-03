// backend/routes/notes.js

const express = require('express');
const router = express.Router(); // Buradaki router objesi dışa aktarılmalı
const Note = require('../models/Note'); 
const Task = require('../models/Task'); 
const { verifyToken } = require('../middleware/authMiddleware'); 
const mongoose = require('mongoose');

console.log('notes.js rotaları yükleniyor...');

// --- Not Rotaları ---

// Belirli bir görevin tüm notlarını getir (GET /api/notes/task/:taskId)
router.get('/task/:taskId', verifyToken, async (req, res) => {
    console.log(`GET /api/notes/task/${req.params.taskId} rotası vuruldu.`); 
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
            console.error(`Notları getirme için geçersiz görev ID formatı: ${req.params.taskId}`);
            return res.status(400).json({ message: 'Geçersiz görev ID formatı.' });
        }
        const notes = await Note.find({ taskId: req.params.taskId }).sort({ createdAt: 1 });
        console.log(`Görev ID ${req.params.taskId} için notlar başarıyla çekildi. Not sayısı: ${notes.length}`);
        res.json(notes);
    } catch (error) {
        console.error('Notları getirirken backend hatası:', error.message);
        console.error('Hata Detayı:', error);
        res.status(500).json({ message: 'Sunucu hatası: Notlar getirilemedi.' });
    }
});

// Yeni not oluştur (POST /api/notes/task/:taskId)
router.post('/task/:taskId', verifyToken, async (req, res) => {
    const { text, type } = req.body;
    const taskId = req.params.taskId;
    const author = req.user.email || 'Bilinmeyen Kullanıcı'; 

    console.log(`POST /api/notes/task/${taskId} rotası vuruldu. Gelen veri:`, { text, type, author, taskId });

    try {
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            console.error(`Yeni not için geçersiz görev ID formatı: ${taskId}`);
            return res.status(400).json({ message: 'Geçersiz görev ID formatı.' });
        }
        const taskExists = await Task.findById(taskId);
        if (!taskExists) {
            console.error(`Not eklenmeye çalışılan görev bulunamadı: ${taskId}`);
            return res.status(404).json({ message: 'İlgili görev bulunamadı.' });
        }

        const newNote = new Note({
            taskId,
            text,
            author,
            type
        });
        await newNote.save();
        console.log('Yeni not başarıyla oluşturuldu:', newNote.text.substring(0, 20));
        res.status(201).json(newNote);
    } catch (error) {
        console.error('Not oluşturulurken backend hatası:', error.message);
        console.error('Hata Objesi Detayı (POST /api/notes/task/:taskId):', error); 

        if (error.name === 'ValidationError') {
            let messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Not oluşturulurken doğrulama hatası oluştu:', errors: messages, details: error });
        }
        res.status(400).json({ message: 'Not oluşturulurken genel bir hata oluştu.', error: error.message, details: error });
    }
});

// Belirli bir notu güncelle (PUT /api/notes/:noteId)
router.put('/:noteId', verifyToken, async (req, res) => {
    const { text, type } = req.body;
    console.log(`PUT /api/notes/${req.params.noteId} rotası vuruldu. Gelen veri:`, { text, type });

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.noteId)) {
            console.error(`Not güncelleme için geçersiz not ID formatı: ${req.params.noteId}`);
            return res.status(400).json({ message: 'Geçersiz not ID formatı.' });
        }

        const note = await Note.findById(req.params.noteId);
        if (!note) {
            console.error(`Güncellenmeye çalışılan not bulunamadı: ${req.params.noteId}`);
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }

        note.text = text !== undefined ? text : note.text;
        note.type = type !== undefined ? type : note.type;
        
        await note.save();
        console.log('Not güncellendi:', note.text.substring(0, 20));
        res.json(note);
    } catch (error) {
        console.error('Notu güncellerken backend hatası:', error.message);
        console.error('Hata Objesi Detayı (PUT /api/notes/:noteId):', error);

        if (error.name === 'ValidationError') {
            let messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Not güncellenirken doğrulama hatası oluştu:', errors: messages, details: error });
        }
        res.status(400).json({ message: 'Not güncellenirken genel bir hata oluştu.', error: error.message, details: error });
    }
});

// Belirli bir notu sil (DELETE /api/notes/:noteId)
router.delete('/:noteId', verifyToken, async (req, res) => {
    console.log(`DELETE /api/notes/${req.params.noteId} rotası vuruldu.`); 
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.noteId)) {
            console.error(`Not silme için geçersiz not ID formatı: ${req.params.noteId}`);
            return res.status(400).json({ message: 'Geçersiz not ID formatı.' });
        }

        const note = await Note.findByIdAndDelete(req.params.noteId);
        if (!note) {
            console.error(`Silinmeye çalışılan not bulunamadı: ${req.params.noteId}`);
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }
        console.log('Not başarıyla silindi:', note._id);
        res.json({ message: 'Not başarıyla silindi.' });
    } catch (error) {
        console.error('Notu silerken backend hatası:', error.message);
        console.error('Hata Detayı:', error);
        res.status(500).json({ message: 'Not silinirken sunucu hatası oluştu.' });
    }
});

module.exports = router; // router objesini dışa aktardığımızdan emin olun
