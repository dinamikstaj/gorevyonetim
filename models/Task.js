// models/Task.js

const mongoose = require('mongoose');

const troubleshootingNoteSchema = new mongoose.Schema({
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['Bug', 'Solution', 'Review', 'Other'], default: 'Other' },
});

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['beklemede', 'devam-ediyor', 'tamamlandı'], default: 'beklemede' },
    assignedTo: { type: String, default: 'Atanmadı' }, // Atanan kişinin tam adı veya e-postası
    assignedBy: { type: String, required: true }, // Görevi atayan kişi
    type: { type: String, enum: ['bug', 'feature', 'refactor', 'other'], default: 'feature' },
    priority: { type: String, enum: ['düşük', 'orta', 'yüksek'], default: 'orta' },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }, // Görev tamamlandığında ayarlanır
    notes: [troubleshootingNoteSchema], // Sorun giderme notları dizisi
}, { timestamps: true }); // createdAt ve updatedAt otomatik olarak eklenir

module.exports = mongoose.model('Task', taskSchema);
