// index.js (Backend Ana Dosyası)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const tasksRouter = require('./routes/tasks');
const subtasksRouter = require('./routes/subtasks'); // Subtasks kullanmıyorsanız bu satırı ve ilgili 'app.use' satırını silebilirsiniz.

const app = express();

// Gelişmiş CORS yapılandırması
app.use(cors({
  // Frontend uygulamanızın çalıştığı adresleri buraya ekleyin.
  // Geliştirme ortamında hem localhost hem de IP adresiyle erişim gerekebilir.
  origin: ['http://localhost:3000', 'http://192.168.9.35:3000'], // Lütfen kendi frontend adreslerinizle güncelleyin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true // Cookie'ler veya kimlik doğrulama başlıkları gerekiyorsa
}));

// JSON istek gövdelerini ayrıştırmak için
app.use(express.json());

// MongoDB bağlantı URI'si
// Lütfen kendi MongoDB sunucunuzun adresini ve veritabanı adını kontrol edin.
const MONGO_URI = 'mongodb://localhost:27017/projeTakip';

// MongoDB bağlantısı ve hata yönetimi
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı.'))
  .catch(err => {
    console.error('DB bağlantı hatası:', err);
    process.exit(1); // Hata durumunda uygulamayı kapat
  });

// Basit bir test endpoint'i
app.get('/ping', (req, res) => {
  res.json({ message: 'Backend is running and accessible.' });
});

// Rota tanımlamaları
app.use('/tasks', tasksRouter);
app.use('/subtasks', subtasksRouter); // Subtasks kullanmıyorsanız bu satırı silin.

// Hata işleme middleware'i (Tüm route'lardan sonra tanımlanmalı)
app.use((err, req, res, next) => {
  console.error(err.stack); // Detaylı hata loglaması
  res.status(500).json({ error: 'Sunucu tarafında bilinmeyen bir hata oluştu!' });
});

// Sunucuyu dinlemeye başla
const PORT = 5000;
const HOST = '0.0.0.0'; // Tüm ağ arayüzlerinden erişime izin verir

app.listen(PORT, HOST, () => {
  console.log(`Backend sunucusu http://${HOST}:${PORT} adresinde çalışıyor.`);
});