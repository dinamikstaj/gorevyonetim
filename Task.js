// models/Task.js (Sadece güncellenmiş kısım)

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    // ... (diğer alanlar)
    status: {
        type: String,
        enum: ['beklemede', 'devam-ediyor', 'tamamlandı'],
        default: 'beklemede'
    },
    assignedTo: {
        type: String,
        required: true,
        trim: true
    },
    assignedBy: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: { // YENİ EKLENEN ALAN
        type: Date,
        default: null // Başlangıçta null olacak
    }
}, { timestamps: true }); // Mongoose'un createdAt ve updatedAt'i otomatik yönetmesi için.
                           // Zaten createdAt'i manuel yönettiğimiz için buradaki createdAt'i kaldırabiliriz.
                           // Veya sadece `updatedAt` için `timestamps: { updatedAt: true }` kullanabiliriz.
                           // En iyisi, manuel createdAt'i tutalım ve completedAt'i biz yönetelim.

// Eğer Task'ın durumu 'tamamlandı' olarak değişirse, completedAt'i güncellemek için
// bir pre-save hook ekleyebiliriz (index.js veya routes/tasks.js içinde değil, modelin kendisinde)
taskSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'tamamlandı') {
        this.completedAt = new Date();
    } else if (this.isModified('status') && this.status !== 'tamamlandı') {
        // Eğer durum tamamlandıdan başka bir şeye çevrilirse bitiş tarihini temizle
        this.completedAt = null;
    }
    next();
});

// Ayrıca Task.findByIdAndUpdate için de benzer bir mantık gerekebilir.
// Bu karmaşıklığı yönetmek istemezsek, sadece Task.status 'tamamlandı' olduğunda frontend'den
// o anki tarihi completedAt'e atamasını isteyebiliriz.
// Şimdilik, sadece alanı ekledim. Durum değiştiğinde bu alanı güncelleme mantığını
// PUT rotasında (handleUpdateTask) da ele almamız gerekecek.
// En basiti, sadece TaskModel'e ekleyin ve frontend'de durumu tamamlandı yapınca o anki tarihi yollayın.


module.exports = mongoose.model('Task', taskSchema);