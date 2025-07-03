// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET; // .env dosyasından JWT_SECRET'ı alın

// JWT Token Doğrulama Middleware'i
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization'); // "Bearer TOKEN" şeklinde gelir
    
    if (!token) {
        console.warn('Erişim reddedildi: Token bulunamadı.');
        return res.status(401).json({ message: 'Erişim reddedildi, yetkilendirme tokenı eksik.' });
    }

    try {
        // "Bearer " kısmını kaldırarak sadece token değerini al
        const actualToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        req.user = decoded; // Çözümlenmiş kullanıcı bilgisini isteğe ekle
        console.log('Token doğrulandı. Kullanıcı ID:', req.user.id, 'Rol:', req.user.role);
        next(); // Bir sonraki middleware'e veya rota işleyicisine geç
    } catch (error) {
        console.error('Token doğrulama hatası:', error.message);
        return res.status(403).json({ message: 'Geçersiz token.' });
    }
};

// Admin Yetkilendirme Middleware'i
const authorizeAdmin = (req, res, next) => {
    // verifyToken middleware'i req.user'ı zaten eklemiş olmalı
    if (req.user && req.user.role === 'admin') {
        console.log('Admin yetkisi doğrulandı.');
        next();
    } else {
        console.warn('Erişim reddedildi: Admin yetkisi yok. Kullanıcı rolü:', req.user ? req.user.role : 'Tanımsız');
        return res.status(403).json({ message: 'Erişim reddedildi, yönetici yetkisi gerekli.' });
    }
};

module.exports = { verifyToken, authorizeAdmin };
