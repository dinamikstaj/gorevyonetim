// frontend/app/users/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Search, User, Mail, Shield, Crown, Trash2, Loader2, MoreVertical, 
    LayoutDashboard, Key, LogOut, UserPlus, Info, Menu, X, Edit // Edit ikonu eklendi
} from 'lucide-react';

/**
 * Kullanıcı arayüzü tanımı. MongoDB'den çekilecek verilere göre ayarlandı.
 */
interface AppUser {
    _id: string; // MongoDB'den gelen ID
    firstName: string;
    lastName: string;
    email: string;
    // Rolleri sadece 'user', 'admin', 'ceo', 'owner' olarak sınırlandırdık
    role: 'user' | 'admin' | 'ceo' | 'owner'; 
    createdAt?: string; // ISO 8601 string, opsiyonel olabilir
}

/**
 * Toast mesajı arayüzü.
 */
interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

/**
 * Toast Bildirim Bileşeni
 * @param {Object} props - Bileşen özellikleri
 * @param {ToastMessage} props.toast - Gösterilecek toast mesajı objesi
 * @param {function} props.onClose - Toast kapatma işlevi
 */
const Toast: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // 5 saniye sonra otomatik kapan
        return () => clearTimeout(timer);
    }, [onClose]);

    const typeClasses = {
        success: 'success',
        error: 'error',
        info: 'info',
    };

    const typeIcons = {
        success: <Shield size={16} className="icon" />,
        error: <X size={16} className="icon" />, 
        info: <Info size={16} className="icon" />,
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className={`toast-message ${typeClasses[toast.type]}`}
        >
            {typeIcons[toast.type]}
            <span>{toast.message}</span>
            <button onClick={onClose}>
                <X size={14} /> 
            </button>
        </motion.div>
    );
};

/**
 * Onay Modalı Bileşeni
 * @param {Object} props - Bileşen özellikleri
 * @param {string} props.message - Onay mesajı
 * @param {function} props.onConfirm - Onaylama işlevi
 * @param {function} props.onCancel - İptal işlevi
 */
const ConfirmModal: React.FC<{
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="modal-overlay">
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="modal-container"
            >
                <div className="modal-header">
                    <h2 className="modal-title">Onay</h2>
                    <button className="modal-close-button" onClick={onCancel}>
                        <X className="icon" /> 
                    </button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-actions-footer confirmation-buttons">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        İptal
                    </button>
                    <button className="btn btn-danger" onClick={onConfirm}>
                        Onayla
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

/**
 * Kullanıcı düzenleme modalı için özellikler.
 */
interface UserEditModalProps {
    user: AppUser | null;
    onClose: () => void;
    onSave: (updatedUser: AppUser, newPassword?: string) => Promise<void>;
    isLoading?: boolean; // Ana sayfanın genel yükleme durumunu yansıtır
}

/**
 * Kullanıcı Düzenleme Modalı Bileşeni.
 * Kullanıcının adını, soyadını, rolünü ve şifresini değiştirmeye olanak tanır.
 */
const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onSave, isLoading = false }) => {
    const [editedUser, setEditedUser] = useState<AppUser | null>(user);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [modalLoading, setModalLoading] = useState(false); // Modal içindeki işlemler için yükleme durumu
    const [saveSuccess, setSaveSuccess] = useState(false); // Kaydetme başarısı için

    useEffect(() => {
        setEditedUser(user);
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordError('');
        setSaveSuccess(false); // Modal açıldığında başarıyı sıfırla
    }, [user]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editedUser) return;
        const { name, value } = e.target;
        setEditedUser((prev: AppUser | null) => prev ? {
            ...prev,
            [name]: value,
        } : null);
    }, [editedUser]);

    const handleSave = async () => {
        if (!editedUser) return;

        if (newPassword && newPassword !== confirmNewPassword) {
            setPasswordError('Yeni şifreler eşleşmiyor!');
            return;
        }
        
        setPasswordError('');
        setModalLoading(true);
        setSaveSuccess(false);

        try {
            await onSave(editedUser, newPassword || undefined); // Şifre boşsa gönderme
            setSaveSuccess(true); // Başarılı olursa
            // Kısa bir gecikme sonrası kapat
            setTimeout(() => {
                onClose(); 
            }, 1000);
        } catch (error) {
            console.error("Kullanıcı kaydetme hatası:", error);
            setPasswordError("Kaydetme başarısız oldu: " + (error as Error).message);
        } finally {
            setModalLoading(false);
            // Başarılıysa zaten kapanacak, hata varsa mesaj kalır.
        }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, y: -50 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, scale: 0.9, y: -50, transition: { duration: 0.2 } }
    };

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    if (!editedUser) return null;

    return (
        <motion.div
            className="modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
        >
            <motion.div
                className="modal-container"
                variants={modalVariants}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 className="modal-title">Kullanıcı Düzenle: {editedUser.firstName} {editedUser.lastName}</h2>
                    <button className="modal-close-button" onClick={onClose} disabled={modalLoading}>
                        <X className="icon" />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="input-group">
                        <label className="input-label" htmlFor="editFirstName">Ad:</label>
                        <input
                            type="text"
                            id="editFirstName"
                            name="firstName"
                            value={editedUser.firstName}
                            onChange={handleChange}
                            disabled={modalLoading}
                            className="text-input"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label" htmlFor="editLastName">Soyad:</label>
                        <input
                            type="text"
                            id="editLastName"
                            name="lastName"
                            value={editedUser.lastName}
                            onChange={handleChange}
                            disabled={modalLoading}
                            className="text-input"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label" htmlFor="editEmail">E-posta (Değiştirilemez):</label>
                        <input
                            type="email"
                            id="editEmail"
                            name="email"
                            value={editedUser.email}
                            disabled // E-posta genellikle düzenlenemez
                            className="text-input disabled-input"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label" htmlFor="editRole">Rol:</label>
                        <select
                            id="editRole"
                            name="role"
                            value={editedUser.role}
                            onChange={handleChange}
                            disabled={modalLoading}
                            className="select-input"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="ceo">CEO</option>
                            <option value="owner">Owner</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="newPassword">Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın):</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={modalLoading}
                            className="text-input"
                            placeholder="Yeni şifrenizi girin"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label" htmlFor="confirmNewPassword">Yeni Şifreyi Onayla:</label>
                        <input
                            type="password"
                            id="confirmNewPassword"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            disabled={modalLoading}
                            className="text-input"
                            placeholder="Yeni şifreyi tekrar girin"
                        />
                        {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
                    </div>
                    {saveSuccess && (
                        <motion.p 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-green-500 text-center font-semibold mt-4"
                        >
                            Kullanıcı başarıyla güncellendi!
                        </motion.p>
                    )}
                </div>

                <div className="modal-actions-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={modalLoading}>İptal</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={modalLoading}>
                        {modalLoading ? <Loader2 className="animate-spin icon" size={16} /> : 'Kaydet'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/**
 * Kullanıcı Yönetimi Sayfası Ana Bileşeni.
 * Kullanıcıları listeler, rollerini düzenler ve silme işlemleri yapar.
 */
const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [currentUserInfo, setCurrentUserInfo] = useState<{ id: string | null; email: string | null; firstName: string | null; lastName: string | null; role: string | null }>({ id: null, email: null, firstName: null, lastName: null, role: null });

    // Yeni kullanıcı oluşturma state'leri
    const [newUserName, setNewUserName] = useState('');
    const [newUserLastName, setNewUserLastName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    // newUserRole'ün tipi sadece izin verilen 4 rolü içerecek şekilde güncellendi
    const [newUserRole, setNewUserRole] = useState<AppUser['role']>('user'); 
    const [createLoading, setCreateLoading] = useState(false);

    // Confirm Modal state'leri
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

    // Kullanıcı düzenleme için yeni state
    const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);

    // Sidebar durumu
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Backend sunucunuzun temel URL'si (index.js'deki gibi)
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_HOST
        ? `http://${process.env.NEXT_PUBLIC_BACKEND_HOST.replace(/^https?:\/\//, '')}`
        : 'http://localhost:5000';


    /**
     * Toast mesajı ekler.
     * @param {'success' | 'error' | 'info'} type - Mesaj tipi
     * @param {string} message - Gösterilecek mesaj metni
     */
    const addToast = useCallback((type: ToastMessage['type'], message: string) => {
        // crypto.randomUUID() yerine daha uyumlu bir UUID oluşturma yöntemi
        const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        setToasts((prev) => [...prev, { id, type, message }]);
    }, []);

    /**
     * Toast mesajını listeden kaldırır.
     * @param {string} id - Kaldırılacak toast mesajının ID'si
     */
    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    /**
     * Tüm kullanıcıları backend'den çeker.
     */
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                addToast('error', 'Yetkilendirme tokenı bulunamadı. Lütfen giriş yapın.');
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data: AppUser[] = await response.json();
                const processedUsers = data.map(user => ({
                    ...user,
                    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString()
                }));
                // İsimlere göre sıralama (firstName ve lastName birleştirilerek)
                const sortedUsers = processedUsers.sort((a, b) =>
                    (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName)
                );
                setUsers(sortedUsers);
            } else {
                const errorData = await response.json();
                addToast('error', errorData.message || 'Kullanıcılar yüklenirken bir hata oluştu.');
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '/login';
                }
            }
        } catch (error) {
            console.error('Kullanıcıları çekerken hata:', error);
            addToast('error', 'Sunucuya ulaşılamadı veya ağ hatası.');
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, addToast]);

    /**
     * Admin tarafından yeni kullanıcı oluşturma fonksiyonu.
     */
    const handleCreateUser = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);

        if (currentUserInfo.role !== 'admin' && currentUserInfo.role !== 'ceo' && currentUserInfo.role !== 'owner') {
            addToast('error', 'Kullanıcı oluşturma yetkiniz yok.');
            setCreateLoading(false);
            return;
        }

        if (!newUserName.trim() || !newUserLastName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            addToast('error', 'Lütfen tüm kullanıcı bilgilerini doldurun.');
            setCreateLoading(false);
            return;
        }
        if (newUserPassword.length < 6) {
            addToast('error', 'Şifre en az 6 karakter olmalıdır.');
            setCreateLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                addToast('error', 'Yetkilendirme tokenı bulunamadı. Lütfen giriş yapın.');
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/admin/register-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    firstName: newUserName,
                    lastName: newUserLastName,
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole
                })
            });

            if (response.ok) {
                const data = await response.json();
                addToast('success', `Kullanıcı "${data.user.firstName} ${data.user.lastName}" başarıyla oluşturuldu!`);
                setNewUserName('');
                setNewUserLastName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserRole('user');
                fetchUsers(); // Kullanıcı listesini yenile
            } else {
                const errorData = await response.json();
                addToast('error', errorData.message || 'Kullanıcı oluşturulurken bir hata oluştu.');
            }
        } catch (error) {
            console.error('Kullanıcı oluşturma hatası:', error);
            addToast('error', 'Sunucuya ulaşılamadı veya ağ hatası.');
        } finally {
            setCreateLoading(false);
        }
    }, [API_BASE_URL, currentUserInfo.role, newUserName, newUserLastName, newUserEmail, newUserPassword, newUserRole, addToast, fetchUsers]);

    /**
     * Kullanıcı bilgilerini günceller (ad, soyad, rol, isteğe bağlı şifre).
     * @param {AppUser} updatedUser - Güncellenecek kullanıcı objesi
     * @param {string} [newPassword] - Yeni şifre (opsiyonel)
     */
    const handleSaveUser = useCallback(async (updatedUser: AppUser, newPassword?: string) => {
        if (currentUserInfo.role !== 'admin' && currentUserInfo.role !== 'ceo' && currentUserInfo.role !== 'owner') {
            addToast('error', 'Kullanıcı güncelleme yetkiniz yok.');
            return;
        }
        setIsLoading(true); // Genel sayfa yükleme durumu
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                addToast('error', 'Yetkilendirme tokenı bulunamadı. Lütfen giriş yapın.');
                window.location.href = '/login';
                return;
            }

            const payload: any = {
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                role: updatedUser.role,
            };
            if (newPassword) {
                payload.password = newPassword; // Şifre varsa payload'a dahil et
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/users/${updatedUser._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                addToast('success', `${updatedUser.firstName} ${updatedUser.lastName} kullanıcısı başarıyla güncellendi.`);
                fetchUsers(); // Kullanıcı listesini yenile
                setSelectedUserForEdit(null); // Modalı kapat
            } else {
                const errorData = await response.json();
                addToast('error', errorData.message || 'Kullanıcı güncellenirken bir hata oluştu.');
            }
        } catch (error) {
            console.error('Kullanıcı güncelleme hatası:', error);
            addToast('error', 'Sunucuya ulaşılamadı veya ağ hatası.');
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, currentUserInfo.role, addToast, fetchUsers]);

    /**
     * Kullanıcı rolünü günceller. (Bu fonksiyon artık UserEditModal ile birleşen handleSaveUser tarafından kapsanmaktadır, ancak ayrı bir kullanım ihtiyacı olursa tutulabilir.)
     * @param {string} targetUserId - Rolü güncellenecek kullanıcının ID'si
     * @param {AppUser['role']} newRole - Yeni rol
     */
    const handleUpdateRole = useCallback(async (targetUserId: string, newRole: AppUser['role']) => {
        // Bu fonksiyon, handleSaveUser'ın daha genel bir versiyonu ile birleşebilir.
        // Ancak ayrı bir hızlı rol değiştirme mekanizması istenirse burada kalabilir.
        // Şimdilik, handleSaveUser modal tarafından çağrıldığı için bu kısım doğrudan kullanılmayacak.
        if (currentUserInfo.role !== 'admin' && currentUserInfo.role !== 'ceo' && currentUserInfo.role !== 'owner') {
            addToast('error', 'Rol güncelleme yetkiniz yok.');
            return;
        }
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                addToast('error', 'Yetkilendirme tokenı bulunamadı. Lütfen giriş yapın.');
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/users/${targetUserId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                addToast('success', 'Kullanıcı rolü başarıyla güncellendi!');
                fetchUsers(); // Listeyi yenile
            } else {
                const errorData = await response.json();
                addToast('error', errorData.message || 'Rol güncellenirken bir hata oluştu.');
            }
        } catch (error) {
            console.error('Rol güncellenirken hata:', error);
            addToast('error', 'Sunucuya ulaşılamadı veya ağ hatası.');
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, currentUserInfo.role, addToast, fetchUsers]);


    /**
     * Kullanıcı silme modalını açar.
     * @param {AppUser} user - Silinecek kullanıcı objesi
     */
    const handleDeleteUser = useCallback((user: AppUser) => {
        if (currentUserInfo.role !== 'admin' && currentUserInfo.role !== 'ceo' && currentUserInfo.role !== 'owner') {
            addToast('error', 'Kullanıcı silme yetkiniz yok.');
            return;
        }
        if (currentUserInfo.id === user._id) {
            addToast('error', 'Kendi hesabınızı silemezsiniz.');
            return;
        }
        setUserToDelete(user);
        setShowConfirmModal(true);
    }, [currentUserInfo.role, currentUserInfo.id, addToast]);

    /**
     * Kullanıcı silme işlemini onaylar ve backend'den siler.
     */
    const confirmDelete = useCallback(async () => {
        if (!userToDelete) {
            addToast('error', 'Silinecek kullanıcı seçilmedi.');
            return;
        }
        setShowConfirmModal(false);
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                addToast('error', 'Yetkilendirme tokenı bulunamadı. Lütfen giriş yapın.');
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/users/${userToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                addToast('success', `${userToDelete.firstName} ${userToDelete.lastName} kullanıcısı başarıyla silindi.`);
                fetchUsers(); // Listeyi yenile
            } else {
                const errorData = await response.json();
                addToast('error', errorData.message || 'Kullanıcı silinirken bir hata oluştu.');
            }
        } catch (error) {
            console.error('Kullanıcı silinirken hata:', error);
            addToast('error', 'Sunucuya ulaşılamadı veya ağ hatası.');
        } finally {
            setIsLoading(false);
            setUserToDelete(null);
        }
    }, [API_BASE_URL, userToDelete, addToast, fetchUsers]);

    /**
     * Kullanıcı silme işlemini iptal eder.
     */
    const cancelDelete = useCallback(() => {
        setShowConfirmModal(false);
        setUserToDelete(null);
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('userLastName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        addToast('info', 'Başarıyla çıkış yapıldı.');
        window.location.href = '/login';
    }, [addToast]);

    const handleGoToDashboard = useCallback(() => {
        window.location.href = '/';
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    // Bileşen yüklendiğinde ve currentUserInfo değiştiğinde kullanıcı bilgilerini localStorage'dan çek
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('userEmail');
        const storedFirstName = localStorage.getItem('userFirstName');
        const storedLastName = localStorage.getItem('userLastName');
        const storedRole = localStorage.getItem('userRole');

        if (!storedToken) {
            window.location.href = '/login';
            return;
        }

        setCurrentUserInfo({
            id: storedUserId || null,
            email: storedEmail || null,
            firstName: storedFirstName || null,
            lastName: storedLastName || null,
            role: storedRole as AppUser['role'] || 'user', // Role'ü AppUser'daki union type'a dönüştür
        });

        // Sadece yetkili admin, ceo veya owner rolü varsa kullanıcıları çek
        if (storedRole === 'admin' || storedRole === 'ceo' || storedRole === 'owner') {
            fetchUsers();
        } else {
            setIsLoading(false);
            addToast('error', 'Bu sayfayı görüntüleme yetkiniz yok.');
        }
    }, [fetchUsers, addToast]);


    // Arama terimine göre kullanıcıları filtrele (arama çubuğu kaldırıldığından şu an kullanılmıyor ama mantık burada)
    const filteredUsers = useMemo(() => {
        // Arama çubuğu kaldırıldığı için doğrudan tüm kullanıcıları döndürebiliriz
        // Eğer arama çubuğu eklenirse bu filtreleme aktif edilebilir.
        return users;
    }, [users]);

    // Rol için uygun CSS sınıfını döndürür.
    const getRoleBadgeClass = (role: AppUser['role']): string => {
        switch (role) {
            case 'admin': return 'user-card-role-badge admin';
            case 'user': return 'user-card-role-badge user';
            case 'ceo': return 'user-card-role-badge ceo';
            case 'owner': return 'user-card-role-badge owner'; // Yeni Owner rolü için sınıf
            default: return 'user-card-role-badge user'; // Tanımsız rol durumunda varsayılan
        }
    };

    // Avatar için uygun renk sınıfını döndürür
    const getAvatarColorClass = (role: AppUser['role']): string => {
        switch (role) {
            case 'admin': return 'admin-color';
            case 'user': return 'user-color';
            case 'ceo': return 'ceo-color';
            case 'owner': return 'owner-color'; // Yeni Owner rolü için sınıf
            default: return 'default-color'; // Tanımsız rol durumunda varsayılan
        }
    };

    // Yükleme sırasında iskelet yükleyici gösterimi
    if (isLoading || currentUserInfo.role === null) {
        return (
            <div className="loading-overlay">
                <Loader2 className="spinner" />
            </div>
        );
    }

    // Yetkisiz kullanıcılar için boş bir sayfa göster
    if (currentUserInfo.role !== 'admin' && currentUserInfo.role !== 'ceo' && currentUserInfo.role !== 'owner') {
        return (
            <div className="app-container flex-col items-center justify-center text-center p-4">
                <h1 className="header-title mb-4">Unauthorized Access</h1>
                <p className="text-secondary-color text-lg mb-8">You do not have permission to view this page.</p>
                <button onClick={handleGoToDashboard} className="btn-primary">
                    <LayoutDashboard size={16} className="icon mr-2" /> Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="users-page-container app-container">
            {isLoading && (
                <div className="loading-overlay">
                    <Loader2 className="spinner" />
                </div>
            )}

            <header className="app-header">
                <div className="header-left">
                    <a onClick={handleGoToDashboard} className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="header-icon" />
                        <h1 className="header-title">Kullanıcı Yönetimi</h1>
                    </a>
                </div>
                <div className="header-actions">
                    {currentUserInfo.email && (
                        <div className="user-info">
                            <span className="user-avatar">{currentUserInfo.email?.charAt(0).toUpperCase()}</span>
                            <span>Merhaba, {currentUserInfo.firstName} {currentUserInfo.lastName} ({currentUserInfo.role})</span>
                        </div>
                    )}
                    <button onClick={handleLogout} className="logout-button">
                        <LogOut className="icon" />
                        Çıkış Yap
                    </button>
                    {/* Sidebar'ı açıp kapatmak için buton */}
                    <button className="toggle-sidebar-btn" onClick={toggleSidebar} disabled={isLoading}>
                        <Menu className="icon" />
                    </button>
                </div>
            </header>

            <div className={`main-content-wrapper ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
                {/* SOL PANEL: Yeni Kullanıcı Oluşturma Formu (Sidebar) */}
                <aside className={`left-panel ${isSidebarOpen ? '' : 'closed'}`}>
                    <div className="form-section">
                        <div className="form-header">
                            <UserPlus className="icon" />
                            <h2>Yeni üye oluştur</h2>
                        </div>
                        <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
                            <div className="input-group">
                                <label htmlFor="newUserName" className="input-label">Adı</label>
                                <input
                                    type="text"
                                    id="newUserName"
                                    placeholder="First Name"
                                    className="text-input"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    disabled={createLoading}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="newUserLastName" className="input-label">Soy Adı</label>
                                <input
                                    type="text"
                                    id="newUserLastName"
                                    placeholder="Last Name"
                                    className="text-input"
                                    value={newUserLastName}
                                    onChange={(e) => setNewUserLastName(e.target.value)}
                                    disabled={createLoading}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="newUserEmail" className="input-label">E-Posta Adresi</label>
                                <input
                                    type="email"
                                    id="newUserEmail"
                                    placeholder="Email"
                                    className="text-input"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    disabled={createLoading}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="newUserPassword" className="input-label">Şifre</label>
                                <input
                                    type="password"
                                    id="newUserPassword"
                                    placeholder="Password"
                                    className="text-input"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    disabled={createLoading}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="newUserRole" className="input-label">Rolü</label>
                                <select
                                    id="newUserRole"
                                    className="select-input"
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as AppUser['role'])}
                                    disabled={createLoading}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="ceo">CEO</option>
                                    <option value="owner">Owner</option> {/* Yeni eklenen Owner rolü */}
                                </select>
                            </div>
                            <button type="submit" className="btn-primary mt-4" disabled={createLoading}>
                                {createLoading ? <Loader2 className="animate-spin icon" size={16} /> : 'Create User'}
                            </button>
                        </form>
                    </div>
                </aside>

                {/* SAĞ PANEL: Kullanıcı Listesi */}
                <main className="right-panel">
                    <div className="panel-header">
                        <h2 className="header-title">
                            <User className="lucide icon" />
                            Kullanıcı Listesi
                        </h2>
                        {/* "Add User" butonu görseldeki gibi sağ üstte */}
                    </div>

                    {filteredUsers.length === 0 && !isLoading ? (
                        <p className="empty-state">Kriterlerinize uygun kullanıcı bulunamadı.</p>
                    ) : (
                        <div className="users-grid">
                            {filteredUsers.map(user => (
                                <motion.div
                                    key={user._id}
                                    className="user-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Görseldeki gibi profil resmi yerine baş harfler ve rol bazlı renkler */}
                                    <div className={`user-card-avatar ${getAvatarColorClass(user.role)}`}>
                                        {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="user-card-name">{user.firstName} {user.lastName}</div>
                                    <div className="user-card-handle">@{user.email.split('@')[0]}</div> {/* Email'in @'den önceki kısmı */}
                                    <span className={getRoleBadgeClass(user.role)}>
                                        <Crown size={12} className="icon" /> {user.role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </span>
                                    {/* Yeni eylem butonları grubu */}
                                    <div className="user-card-actions mt-5 flex justify-center gap-2 w-full"> {/* mt-auto yerine mt-5 kullanıldı */}
                                        <button
                                            className="btn btn-secondary px-3 py-1 text-sm flex items-center gap-1"
                                            onClick={() => setSelectedUserForEdit(user)}
                                            disabled={isLoading}
                                        >
                                            <Edit size={14} /> Düzenle
                                        </button>
                                        <button
                                            className="btn btn-danger px-3 py-1 text-sm flex items-center gap-1"
                                            onClick={() => handleDeleteUser(user)}
                                            disabled={isLoading}
                                        >
                                            <Trash2 size={14} /> Sil
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && Array.from({ length: 6 }).map((_, index) => ( // Yükleme animasyonu için
                                <div key={`skeleton-${index}`} className="skeleton-user-card">
                                    <div className="h-avatar"></div>
                                    <div className="h-name"></div>
                                    <div className="h-handle"></div>
                                    <div className="h-role-badge"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Toast Messages */}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && userToDelete && (
                <ConfirmModal
                    message={`Are you sure you want to delete user ${userToDelete.firstName} ${userToDelete.lastName}? This action cannot be undone.`}
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            )}

            {/* Kullanıcı Düzenleme Modalı */}
            <AnimatePresence>
                {selectedUserForEdit && (
                    <UserEditModal
                        user={selectedUserForEdit}
                        onClose={() => setSelectedUserForEdit(null)}
                        onSave={handleSaveUser}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserManagementPage;
