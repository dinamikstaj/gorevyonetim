// index.js (Backend Ana Dosyası)

// dotenv'i en üste yükle ki tüm ortam değişkenleri mevcut olsun
require('dotenv').config();

// --- GEÇİCİ HATA AYIKLAMA KODLARI BAŞLANGICI ---
console.log('\n--- .env Değişkenleri Kontrolü ---');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***** (Yapılandırıldı)' : 'Tanımlanmamış!');
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL); // Burası virgülle ayrılmış string olarak görünmeli
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***** (Yapılandırıldı)' : 'Tanımlanmamış!');
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('---------------------------------\n');
// --- GEÇİCİ HATA AYIKLAMA KODLARI SONU ---

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Kimlik doğrulama rotalarımızı içeri aktarıyoruz
const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const subtasksRouter = require('./routes/subtasks');

const app = express();

// Gelişmiş CORS yapılandırması
// FRONTEND_URL'i virgüllerine göre ayırarak bir dizi oluşturuyoruz
// Eğer FRONTEND_URL tanımlı değilse boş bir dizi ile başla.
const envFrontendUrls = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) : [];

// İzin verilen kaynaklar listesini oluştur
const allowedOrigins = [
    ...envFrontendUrls,             // .env dosyasından okunan tüm FRONTEND_URL'leri ekle
    'http://localhost:3000'         // Geliştirme için varsayılan localhost'u her zaman ekle
];

app.use(cors({
    origin: function (origin, callback) {
        // İsteğin geldiği 'origin' (kaynak) undefined olabilir (örneğin aynı sunucudan veya bazı Postman gibi araçlardan yapılan isteklerde)
        // Eğer 'origin' undefined ise veya izin verilen listesinde varsa, isteğe izin ver.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true); // İsteğe izin ver
        } else {
            console.warn(`CORS Hatası: İzin verilmeyen kaynak - ${origin}`);
            callback(new Error('Bu kaynaktan gelen isteklere izin verilmiyor!'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'], // JWT için 'Authorization' başlığını ekledik
    credentials: true
}));

// JSON istek gövdelerini ayrıştırmak için
app.use(express.json());

// MongoDB bağlantı URI'si
// Eğer .env'den MONGO_URI gelmezse fallback olarak localhost kullanılır.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/projeTakip';

// MongoDB bağlantısı ve hata yönetimi
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB bağlantısı başarılı.'))
    .catch(err => {
        console.error('DB bağlantı hatası:', err);
        console.error('MongoDB bağlantısı kurulamadı. Lütfen MongoDB sunucunuzun çalıştığından emin olun.');
        process.exit(1); // Uygulamayı kapat, çünkü veritabanı olmadan çalışamaz
    });

// Basit bir test endpoint'i
app.get('/ping', (req, res) => {
    res.json({ message: 'Backend is running and accessible.' });
});

// Rota tanımlamaları
app.use('/api/auth', authRouter); // Auth rotalarını /api/auth ön eki altında kullan
app.use('/tasks', tasksRouter); // Görev rotalarını /tasks ön eki altında kullan
app.use('/subtasks', subtasksRouter); // Alt görev rotalarını /subtasks ön eki altında kullan

// Hata işleme middleware'i
app.use((err, req, res, next) => {
    console.error('Global Hata Yakalandı:', err.stack);
    res.status(500).json({ error: 'Sunucu tarafında bilinmeyen bir hata oluştu!' });
});

// Sunucuyu dinlemeye başla
const PORT = process.env.PORT || 5000; // Portu da .env'den çekebiliriz
const HOST = '0.0.0.0'; // Tüm ağ arayüzlerinden dinle

app.listen(PORT, HOST, () => {
    console.log(`Backend sunucusu http://${HOST}:${PORT} adresinde çalışıyor.`);
    console.log(`Frontend URL için izin verilenler: ${allowedOrigins.join(', ')}`); // İzin verilenleri logla
    console.log(`MongoDB URI: ${MONGO_URI}`);
});
