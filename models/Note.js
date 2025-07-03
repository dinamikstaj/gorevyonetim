// models/Note.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    // Bu notun hangi göreve ait olduğunu belirten görev ID'si
    taskId: {
        type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId tipi
        ref: 'Task', // 'Task' modeline referans verir
        required: true
    },
    text: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true // Notu yazan kullanıcı
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Not tipi (Enum değerleri)
    type: {
        type: String,
        enum: ['Bug', 'Solution', 'Review', 'Other'], // Backend ile uyumlu olsun
        default: 'Other'
    },
});

module.exports = mongoose.model('Note', noteSchema);
