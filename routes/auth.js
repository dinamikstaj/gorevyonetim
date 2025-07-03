// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Google OAuth için axios eklendi
const mongoose = require('mongoose');

// Kullanıcı şeması tanımı
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Google login için opsiyonel olabilir
    googleId: { type: String, unique: true, sparse: true },
    firstName: { type: String },
    lastName: { type: String },
    profilePicture: { type: String },
    role: { 
        type: String, 
        default: 'user', 
        enum: [
            'user', 
            'admin', 
            'ceo', 
            'owner' 
        ] 
    },
}, { collection: 'logins', timestamps: true }); 

let User;
try {
    User = mongoose.model('User');
    console.log('Mevcut User modeli kullanıldı (koleksiyon: logins).');
} catch (error) {
    User = mongoose.model('User', userSchema);
    console.log('Yeni User modeli tanımlandı (koleksiyon: logins).');
}

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

/**
 * JWT token doğrulama middleware'i.
 * Her korumalı rotadan önce çalışır.
 * JWT payload'ına firstName ve lastName ekledik.
 */
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        console.warn('Erişim reddedildi: Token bulunamadı.');
        return res.status(401).json({ message: 'Erişim reddedildi, yetkilendirme tokenı eksik.' });
    }
    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = decoded.user; // Token'dan çözülen user objesini req.user'a ekler
        console.log('Token doğrulandı. Kullanıcı ID:', req.user.id, 'Rol:', req.user.role, 'Ad:', req.user.firstName, 'Soyad:', req.user.lastName);
        next();
    } catch (error) {
        console.error('Token doğrulama hatası:', error.message);
        return res.status(403).json({ message: 'Geçersiz token.' });
    }
};

/**
 * Admin yetkilendirme middleware'i.
 * Sadece admin, ceo, owner rollerinin erişebileceği rotalar için kullanılır.
 */
const authorizeAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'ceo' || req.user.role === 'owner')) {
        console.log('Admin/CEO/Owner yetkisi doğrulandı.');
        next();
    } else {
        console.warn('Erişim reddedildi: Yeterli yetki yok. Kullanıcı rolü:', req.user ? req.user.role : 'Belirtilmemiş');
        return res.status(403).json({ message: 'Erişim reddedildi, yönetici yetkisi gerekli.' });
    }
};

// Kullanıcı Kayıt Rotası (POST /api/auth/register)
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        console.log('Kayıt isteği alındı (auth.js /register).');

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.warn('Kayıt başarısız: Bu e-posta zaten kullanımda.', email);
            return res.status(409).json({ message: 'Bu e-posta zaten kullanımda.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: 'user', // Varsayılan rol 'user'
        });
        await newUser.save();
        console.log('Kullanıcı başarıyla kaydedildi.'); 
        res.status(201).json({ 
            message: 'Kayıt başarılı!', 
            user: { 
                id: newUser._id, 
                email: newUser.email, 
                firstName: newUser.firstName, 
                lastName: newUser.lastName,
                role: newUser.role 
            } 
        });
    } catch (error) {
        console.error('Kayıt sırasında backend hatası (auth.js /register):', error);
        res.status(500).json({ message: 'Kayıt sırasında bir sunucu hatası oluştu.' });
    }
});

// Kullanıcı Giriş (Login) Rotası - Tüm Rollere İzin Verildi (POST /api/auth/login)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('--- Yeni Giriş İsteği ---');
        console.log('Giriş isteği alındı (auth.js /login).');

        // Statik admin kullanıcısı kontrolü (Geliştirme/test amaçlı)
        if (email === 'admin@admin.com' && password === 'admin123') {
            const staticAdminUser = {
                _id: 'static_admin_id',
                email: 'admin@admin.com',
                firstName: 'Dinamik',
                lastName: 'Admin',
                role: 'admin'
            };
            const token = jwt.sign(
                { 
                    user: { // JWT payload'ını user objesi içine sarıldı
                        id: staticAdminUser._id, 
                        email: staticAdminUser.email, 
                        role: staticAdminUser.role,
                        firstName: staticAdminUser.firstName,
                        lastName: staticAdminUser.lastName
                    }
                },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            console.log('Statik admin girişi başarılı!'); 
            return res.json({ 
                message: 'Giriş başarılı!', 
                token,
                user: { 
                    id: staticAdminUser._id,
                    email: staticAdminUser.email,
                    firstName: staticAdminUser.firstName, 
                    lastName: staticAdminUser.lastName,     
                    role: staticAdminUser.role 
                }
            });
        }

        // Normal kullanıcı veya diğer roller için veritabanında ara
        const user = await User.findOne({ email });
        console.log('Veritabanı sorgusu tamamlandı. Kullanıcı bulundu mu?:', !!user);

        if (!user) {
            console.log('Giriş başarısız: Kullanıcı bulunamadı.'); 
            return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });
        }
        console.log('Kullanıcı bulundu.'); 
        
        console.log('Veritabanındaki kullanıcının şifre alanı mevcut mu?:', !!user.password);
        if (!user.password) {
            console.warn('Kullanıcının şifre alanı boş veya tanımlı değil. Google girişi mi?');
            return res.status(401).json({ message: 'Bu hesap şifre ile giriş yapacak şekilde ayarlanmamış.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Bcrypt şifre karşılaştırma sonucu:`, isMatch); 

        if (!isMatch) {
            console.log('Giriş başarısız: Şifreler eşleşmiyor.'); 
            return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });
        }

        // Rol kısıtlaması kaldırıldı, tüm kimlik doğrulanmış kullanıcılar giriş yapabilir
        const token = jwt.sign(
            { 
                user: { // JWT payload'ını user objesi içine sarıldı
                    id: user._id, 
                    email: user.email, 
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('Giriş başarılı, JWT oluşturuldu.'); 
        
        res.json({ 
            message: 'Giriş başarılı!', 
            token,
            user: { 
                id: user._id,
                email: user.email,
                firstName: user.firstName || null, 
                lastName: user.lastName || null,     
                role: user.role 
            }
        });

    } catch (error) {
        console.error('Giriş sırasında backend hatası (auth.js /login):', error);
        res.status(500).json({ message: 'Giriş sırasında bir sunucu hatası oluştu.' });
    }
});

// Adminler için kullanıcı oluşturma rotası (POST /api/auth/admin/register-user)
router.post('/admin/register-user', verifyToken, authorizeAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;
        console.log('Admin tarafından kayıt isteği alındı (auth.js /admin/register-user).');

        if (!firstName || !lastName || !email || !password) {
            console.warn('Admin kayıt başarısız: Eksik alanlar.'); 
            return res.status(400).json({ message: 'Lütfen tüm zorunlu alanları doldurun (Ad, Soyad, E-posta, Şifre).' });
        }

        console.log('Email kontrolü yapılıyor...');
        let user = await User.findOne({ email });
        if (user) {
            console.warn('Admin kayıt başarısız: Bu e-posta zaten kullanımda.', email);
            return res.status(409).json({ message: 'Bu e-posta zaten kullanımda.' });
        }
        console.log('E-posta mevcut değil, devam ediliyor.');

        console.log('Şifre hashleniyor...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Şifre hashlendi.');

        console.log('Yeni kullanıcı objesi oluşturuluyor...');
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: role || 'user', 
        });
        
        console.log('Kullanıcı veritabanına kaydediliyor...');
        await newUser.save();
        console.log('Admin tarafından yeni kullanıcı başarıyla kaydedildi.'); 
        res.status(201).json({ 
            message: 'Kullanıcı başarıyla oluşturuldu!', 
            user: { 
                id: newUser._id, 
                email: newUser.email, 
                firstName: newUser.firstName, 
                lastName: newUser.lastName,
                role: newUser.role
            } 
        });

    } catch (error) {
        console.error('Admin tarafından kullanıcı kaydı sırasında backend hatası (auth.js /admin/register-user):', error.message);
        console.error('Hata Detayı:', error); 
        res.status(500).json({ message: 'Kullanıcı oluşturulurken bir sunucu hatası oluştu.' });
    }
});

// Tüm kullanıcıları listeleme (GET /api/auth/users)
router.get('/users', verifyToken, authorizeAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'firstName lastName email role').sort('firstName');
        console.log(`Backend: ${users.length} kullanıcı başarıyla çekildi (auth.js /users).`);
        res.status(200).json(users);
    } catch (error) {
        console.error('Kullanıcı listesi çekilirken backend hatası (auth.js /users):', error.message);
        res.status(500).json({ message: 'Kullanıcı listesi çekilirken bir hata oluştu.' });
    }
});

// Kullanıcı bilgilerini güncelle (PUT /api/auth/users/:id) - Admin, CEO, Owner erişebilir
router.put('/users/:id', verifyToken, authorizeAdmin, async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;
    const userIdToUpdate = req.params.id;
    console.log(`PUT /api/auth/users/${userIdToUpdate} rotası vuruldu. İstek gönderen rol: ${req.user.role}`);

    try {
        let user = await User.findById(userIdToUpdate);
        if (!user) {
            console.warn(`Güncellenmeye çalışılan kullanıcı bulunamadı: ${userIdToUpdate}`);
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Kendi rolünü değiştirmeyi engelle (daha kısıtlı kurallar)
        // Admin, CEO, Owner kendi rolünü düşüremez, sadece eşit veya üst role yükseltebilir.
        const roleHierarchy = { 'user': 0, 'admin': 1, 'ceo': 2, 'owner': 3 };
        if (req.user.id === userIdToUpdate && role && roleHierarchy[req.user.role] > roleHierarchy[role]) {
            console.warn(`Kullanıcı kendi rolünü düşürmeye çalıştı: ${req.user.email} eski rol: ${req.user.role}, yeni rol: ${role}`);
            return res.status(403).json({ message: 'Kendi rolünüzü düşüremezsiniz.' });
        }
        
        // E-posta değiştirilmeye çalışılıyorsa kontrol et
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userIdToUpdate) {
                console.warn(`Güncelleme başarısız: Yeni e-posta zaten kullanımda (${email})`);
                return res.status(400).json({ message: 'Bu e-posta zaten başka bir kullanıcı tarafından kullanılıyor.' });
            }
            user.email = email;
        }

        // Alanları güncelle
        user.firstName = firstName !== undefined ? firstName : user.firstName;
        user.lastName = lastName !== undefined ? lastName : user.lastName;
        user.role = role !== undefined ? role : user.role;

        // Şifre varsa ve boş değilse güncelle
        if (password) {
            if (password.length < 6) {
                console.warn(`Şifre güncelleme başarısız: Şifre çok kısa`);
                return res.status(400).json({ message: 'Şifre en az 6 karakter uzunluğunda olmalıdır.' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            console.log(`Kullanıcı ${user.email} için şifre güncellendi.`);
        }

        await user.save();
        console.log(`Kullanıcı ${user.email} başarıyla güncellendi.`);
        res.json({ message: 'Kullanıcı başarıyla güncellendi.', user: user.toObject({ getters: true, virtuals: false }) });

    } catch (error) {
        console.error('Kullanıcı güncellenirken sunucu hatası:', error.message);
        res.status(500).json({ message: 'Sunucu hatası: Kullanıcı güncellenemedi.', error: error.message });
    }
});


// Kullanıcının rolünü güncelleme rotası (PATCH /api/auth/users/:id/role)
router.patch('/users/:id/role', verifyToken, authorizeAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        const validRoles = [
            'user', 
            'admin', 
            'ceo', 
            'owner'
        ];

        if (!role || !validRoles.includes(role)) { 
            console.warn('Geçersiz rol belirtildi:', role);
            return res.status(400).json({ message: `Geçersiz veya eksik rol bilgisi. Rol şu değerlerden biri olmalıdır: ${validRoles.join(', ')}.` });
        }

        const user = await User.findById(userId);
        if (!user) {
            console.warn('Kullanıcı bulunamadı, rol güncellemesi başarısız:', userId);
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Kendi rolünü değiştirmeyi engelle (daha yüksek/eşit roller için izin ver, düşürmeyi engelle)
        const roleHierarchy = { 'user': 0, 'admin': 1, 'ceo': 2, 'owner': 3 };
        if (req.user.id === userId && roleHierarchy[req.user.role] > roleHierarchy[role]) {
            return res.status(403).json({ message: 'Kendi rolünüzü düşüremezsiniz.' });
        }
        
        user.role = role;
        await user.save();

        console.log(`Kullanıcı rolü güncellendi: Yeni rol: ${user.role}`); 
        res.status(200).json({ 
            message: 'Kullanıcı rolü başarıyla güncellendi.', 
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Kullanıcı rolü güncellenirken backend hatası (auth.js /users/:id/role):', error.message);
        res.status(500).json({ message: 'Kullanıcı rolü güncellenirken bir sunucu hatası oluştu.' });
    }
});

// Kullanıcı silme rotası (DELETE /api/auth/users/:id)
router.delete('/users/:id', verifyToken, authorizeAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        console.log(`Kullanıcı silme isteği alındı (auth.js /users/${userId}).`);

        // Kendi hesabını silmeyi engelle
        if (req.user.id === userId) {
            console.warn('Admin/Owner kendi hesabını silemez:', userId);
            return res.status(403).json({ message: 'Kendi hesabınızı silemezsiniz.' });
        }

        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            console.warn('Silinecek kullanıcı bulunamadı:', userId);
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Yetki kontrolü: Daha yüksek veya eşit role sahip kullanıcıları silme engeli
        const roleHierarchy = { 'user': 0, 'admin': 1, 'ceo': 2, 'owner': 3 };
        const requesterRoleLevel = roleHierarchy[req.user.role];
        const targetUserRoleLevel = roleHierarchy[userToDelete.role];

        if (requesterRoleLevel < targetUserRoleLevel) {
            console.warn(`Yetkisiz silme denemesi: ${req.user.email} daha yüksek rolü olan ${userToDelete.email} kullanıcısını silmeye çalıştı.`);
            return res.status(403).json({ message: 'Daha yüksek veya eşit role sahip bir kullanıcıyı silemezsiniz.' });
        }

        await User.findByIdAndDelete(userId);

        console.log(`Kullanıcı başarıyla silindi: ${userToDelete.email}`); 
        res.status(200).json({ message: 'Kullanıcı başarıyla silindi.' });

    } catch (error) {
        console.error('Kullanıcı silinirken backend hatası:', error.message);
        res.status(500).json({ message: 'Kullanıcı silinirken bir sunucu hatası oluştu.' });
    }
});

// Google OAuth Callback Rotası (GET /api/auth/google/callback)
router.get('/google/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.error('Google callback: Yetkilendirme kodu eksik.');
        return res.status(400).redirect(`${FRONTEND_URL}/login?error=auth_code_missing`);
    }
    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
            params: {
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
                code: code,
            },
        });
        const { id_token } = tokenResponse.data;
        const idTokenParts = id_token.split('.');
        const payload = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString());

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;
        const email_verified = payload.email_verified;

        console.log('Google Kullanıcı Bilgileri (hassas olmayanlar):', { googleId: googleId ? 'Mevcut' : 'Yok', emailVerified: email_verified });

        if (!email_verified) {
            return res.status(401).redirect(`${FRONTEND_URL}/login?error=email_not_verified`);
        }

        let user = await User.findOne({ googleId });
        if (!user) {
            user = await User.findOne({ email });
            if (user) {
                user.googleId = googleId;
                user.profilePicture = picture;
                await user.save();
                console.log('Mevcut kullanıcının Google ID\'si güncellendi.'); 
            } else {
                user = new User({
                    googleId: googleId,
                    email: email,
                    firstName: name.split(' ')[0] || '',
                    lastName: name.split(' ').slice(1).join(' ') || '',
                    profilePicture: picture,
                    password: '', // Google ile giriş yapanların şifresi olmaz
                    role: 'user', // Varsayılan rol 'user'
                });
                await user.save();
                console.log('Yeni Google kullanıcısı oluşturuldu.'); 
            }
        } else {
            console.log('Mevcut Google kullanıcısı giriş yaptı.'); 
            user.firstName = name.split(' ')[0] || user.firstName;
            user.lastName = name.split(' ').slice(1).join(' ') || user.lastName;
            user.profilePicture = picture || user.profilePicture;
            await user.save();
        }

        const appToken = jwt.sign(
            { 
                user: { // JWT payload'ını user objesi içine sarıldı
                    id: user._id, 
                    email: user.email, 
                    googleId: user.googleId, 
                    role: user.role,
                    firstName: user.firstName, 
                    lastName: user.lastName 
                }
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log(`Kullanıcı ${FRONTEND_URL}/ adresine yönlendiriliyor.`);
        res.redirect(`${FRONTEND_URL}/?token=${appToken}`);

    } catch (error) {
        console.error('Google OAuth callback sırasında hata:', error.response ? error.response.data : error.message);
        res.status(500).redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }
});

module.exports = router;
