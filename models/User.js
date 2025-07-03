// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Şifre hash'leme için

// Kullanıcı şeması tanımlanıyor
const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true // Baştaki ve sondaki boşlukları temizler
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true, // Kullanıcı adının tekil olmasını sağlar (aynı kullanıcı adı birden fazla kez kullanılamaz)
        trim: true,
        lowercase: true // Kullanıcı adlarını küçük harfe çevirir
    },
    email: {
        type: String,
        required: true,
        unique: true, // E-posta adresinin tekil olmasını sağlar
        trim: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Lütfen geçerli bir e-posta adresi girin.'] // E-posta formatını doğrular
    },
    password: {
        type: String,
        required: true,
        minlength: 6 // Minimum şifre uzunluğu
    },
    // Frontend'den gelen IP bağlama tercihini tutar
    bindIpPreference: {
        type: Boolean,
        default: false
    },
    // Son giriş yapılan IP adresi (backend tarafından doldurulacak)
    lastLoginIp: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now // Belgenin oluşturulduğu zamanı otomatik olarak kaydeder
    }
}, {
    collection: 'logins' // MongoDB'deki 'logins' koleksiyonuna eşlenmesini sağlar
});

// **Şifreyi Kaydetmeden Önce Hash'leme (Mongoose Middleware)**
// Bu fonksiyon, yeni bir kullanıcı kaydedilirken veya şifresi güncellenirken otomatik olarak çalışır.
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) { // Eğer şifre alanı değiştirilmediyse hash'leme yapma
        return next();
    }
    const salt = await bcrypt.genSalt(10); // Şifreye eklemek için rastgele bir "tuz" oluşturur
    this.password = await bcrypt.hash(this.password, salt); // Şifreyi tuz ile birlikte hash'ler
    next(); // Bir sonraki middleware'e veya kaydetme işlemine devam et
});

// **Şifre Karşılaştırma Metodu (Model Metodu)**
// Bu metod, giriş yaparken kullanıcının girdiği şifreyi, veritabanındaki hash'lenmiş şifre ile karşılaştırmak için kullanılır.
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password); // Girilen şifreyi hash'lenmiş şifre ile karşılaştırır
};

// 'User' modelini dışa aktarıyoruz, böylece diğer dosyalarda kullanabiliriz.
const User = mongoose.model('User', UserSchema);

module.exports = User;