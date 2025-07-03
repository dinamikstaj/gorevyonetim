// routes/tasks.js

const express = require('express');
const router = express.Router();
const Task = require('../models/Task'); 
const Note = require('../models/Note'); 
const mongoose = require('mongoose'); 
const { verifyToken } = require('../middleware/authMiddleware'); // auth.js'ten gelen verifyToken'ı kullanıyoruz

console.log('tasks.js rotaları yükleniyor (not rotaları notes.js\'e taşındı)...');

// --- Görev Yönetimi Rotaları ---

// Tüm görevleri getir veya Kullanıcı rolündeyse sadece kendisine atanmış görevleri getir (GET /api/tasks)
router.get('/', verifyToken, async (req, res) => {
    try {
        let tasks;
        // Kullanıcının rolünü kontrol et
        const userRole = req.user.role;
        const userFirstName = req.user.firstName;
        const userLastName = req.user.lastName;
        const userFullName = userFirstName && userLastName ? `${userFirstName} ${userLastName}` : req.user.email; // Tam adı veya e-posta

        console.log(`Görev çekme isteği. Kullanıcı Rolü: ${userRole}, Adı: ${userFullName}`);

        if (userRole === 'user') {
            // Eğer rol 'user' ise, sadece kendisine atanmış görevleri getir
            // Not: 'assignedTo' alanı genellikle kullanıcının adını/soyadını tuttuğu için bu şekilde filtreleme yapıyoruz.
            // Eğer 'assignedTo' alanı ID tutuyorsa, filtreleme yöntemini değiştirmelisiniz.
            tasks = await Task.find({ assignedTo: userFullName }).sort({ createdAt: -1 });
            console.log(`Kullanıcı (${userFullName}) için ${tasks.length} atanmış görev çekildi.`);
        } else {
            // Eğer rol 'admin', 'ceo', 'owner' veya başka bir rol ise, tüm görevleri getir
            tasks = await Task.find().sort({ createdAt: -1 });
            console.log(`Yönetici rolü (${userRole}) için tüm ${tasks.length} görev çekildi.`);
        }
        
        res.json(tasks);
    } catch (error) {
        console.error('Görevleri getirirken backend hatası:', error.message);
        console.error('Hata Detayı:', error);
        res.status(500).json({ message: 'Sunucu hatası: Görevler getirilemedi.' });
    }
});

// Yeni görev oluştur (POST /api/tasks)
router.post('/', verifyToken, async (req, res) => {
    const { title, description, status, assignedTo, type, priority } = req.body;
    console.log('Yeni görev oluşturma isteği alındı. Gelen veri:', req.body);

    const assignedBy = req.user.email || 'Bilinmeyen Kullanıcı'; 

    try {
        const newTask = new Task({
            title,
            description,
            status,
            assignedTo,
            assignedBy,
            type,
            priority,
        });

        await newTask.save();
        console.log('Yeni görev başarıyla oluşturuldu:', newTask.title);
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Görev oluşturulurken backend hatası:', error.message);
        console.error('Hata Objesi Detayı (POST /api/tasks):', error);
        
        if (error.name === 'ValidationError') {
            let messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Görev oluşturulurken doğrulama hatası oluştu:', errors: messages, details: error });
        }
        res.status(400).json({ message: 'Görev oluşturulurken genel bir hata oluştu.', error: error.message, details: error });
    }
});

// Belirli bir görevi ID'ye göre getir (GET /api/tasks/:id)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Görev bulunamadı.' });
        }
        res.json(task);
    } catch (error) {
        console.error('Görevi getirirken backend hatası (ID ile):', error.message);
        console.error('Hata Detayı:', error);
        res.status(500).json({ message: 'Sunucu hatası: Görev getirilemedi.' });
    }
});

// Görev güncelle (PUT /api/tasks/:id)
router.put('/:id', verifyToken, async (req, res) => {
    const { title, description, status, assignedTo, type, priority, completedAt } = req.body; 
    console.log(`Görevi güncelleme isteği alındı (ID: ${req.params.id}). Gelen veri:`, JSON.stringify(req.body, null, 2)); 

    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Görev bulunamadı.' });
        }

        task.title = title !== undefined ? title : task.title;
        task.description = description !== undefined ? description : task.description;
        task.status = status !== undefined ? status : task.status;
        task.assignedTo = assignedTo !== undefined ? assignedTo : task.assignedTo;
        task.type = type !== undefined ? type : task.type;
        task.priority = priority !== undefined ? priority : task.priority;

        if (status === 'tamamlandı' && !task.completedAt) {
            task.completedAt = new Date();
        } else if (status !== 'tamamlandı') {
            task.completedAt = undefined; 
        }
        if (completedAt !== undefined) {
            task.completedAt = completedAt === null ? undefined : new Date(completedAt);
        }
        
        await task.save();
        console.log('Görev güncellendi:', task.title);
        res.json(task);
    } catch (error) {
        console.error('Görevi güncellerken backend hatası:', error.message);
        console.error('Hata Objesi Detayı (PUT /api/tasks/:id):', error); 
        
        if (error.name === 'ValidationError') {
            let messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Görev güncellenirken doğrulama hatası oluştu:', errors: messages, details: error });
        }
        res.status(400).json({ message: 'Görev güncellenirken genel bir hata oluştu.', error: error.message, details: error });
    }
});

// Görev sil (DELETE /api/tasks/:id)
router.delete('/:id', verifyToken, async (req, res) => {
    console.log(`Görevi silme isteği alındı (ID: ${req.params.id}).`); 
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Görev bulunamadı.' });
        }
        await Note.deleteMany({ taskId: req.params.id }); 
        console.log(`Görev (${task.title}) ve ilgili notları başarıyla silindi.`);
        res.json({ message: 'Görev ve ilgili notları başarıyla silindi.' });
    } catch (error) {
        console.error('Görevi silerken backend hatası:', error.message);
        console.error('Hata Detayı:', error); 
        res.status(500).json({ message: 'Sunucu hatası: Görev silinemedi.' });
    }
});

module.exports = router;
