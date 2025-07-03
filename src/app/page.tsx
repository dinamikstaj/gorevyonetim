// frontend/app/page.tsx (Komple Kod - Dinamik API URL Entegrasyonu)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    PlusCircle,
    Edit,
    Trash2,
    User,
    Calendar,
    Tag,
    Bug,
    Eye,
    Search,
    FileText,
    Code,
    Database,
    BarChart,
    Mail,
    Shield,
    CheckCircle,
    X,
    Star,
    Menu,
    LayoutDashboard,
    Loader2,
    LogOut,
    UserPlus,
    Users,
    Settings // Ayarlar ikonu eklendi
} from 'lucide-react';

/**
 * Sorun Giderme Notu arayüzü.
 */
interface TroubleshootingNote {
    _id: string;
    text: string;
    author: string;
    createdAt: string;
    type: 'Bug' | 'Solution' | 'Review' | 'Other';
}

/**
 * Görev (Task) arayüzü.
 */
interface Task {
    _id: string;
    title: string;
    description: string;
    status: 'beklemede' | 'devam-ediyor' | 'tamamlandı';
    assignedTo: string;
    assignedBy: string;
    type: string;
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    completedAt: string | null;
    troubleshootingNotes: TroubleshootingNote[];
}

/**
 * Kullanıcı arayüzü (Backend'den çekilecek users listesi için).
 * Bu interface aynı zamanda TaskDetailModal ve Yeni Görev Ekleme kısmında da kullanılacak.
 */
interface AppUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

interface TaskDetailModalProps {
    task: Task | null;
    onClose: () => void;
    onSave: (updatedTask: Task) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
    users: AppUser[]; // Modal'a kullanıcı listesi geçilecek
    currentUserRole: string | null; // Mevcut kullanıcının rolü eklendi
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onSave, onDelete, users, currentUserRole }) => {
    const [editedTask, setEditedTask] = useState<Task | null>(task);
    const [isLoadingModal, setIsLoadingModal] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteType, setNewNoteType] = useState<TroubleshootingNote['type']>('Other');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editedNoteText, setEditedNoteText] = useState('');

    // Admin olup olmadığını kontrol eden bir bayrak
    const isAdmin = currentUserRole === 'admin';

    useEffect(() => {
        // editedTask state'i set edilirken troubleshootingNotes'un her zaman bir dizi olduğundan emin ol
        setEditedTask(task ? { ...task, troubleshootingNotes: task.troubleshootingNotes || [] } : null);
        setNewNoteText('');
        setNewNoteType('Other');
        setEditingNoteId(null);
        setEditedNoteText('');
    }, [task]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        // Sadece admin ise değişikliklere izin ver
        if (!editedTask || !isAdmin) return;
        const { name, value } = e.target;

        let newCompletedAt = editedTask.completedAt;
        let newStatus = editedTask.status;

        if (name === 'completedAt') {
            newCompletedAt = value === '' ? null : value;
            newStatus = value === '' ? 'beklemede' : 'tamamlandı';
        } else if (name === 'status') {
            newStatus = value as Task['status'];
            newCompletedAt = value === 'tamamlandı' && !editedTask.completedAt ? new Date().toISOString() : editedTask.completedAt;
            if (value !== 'tamamlandı') {
                newCompletedAt = null;
            }
        }

        setEditedTask((prev: Task | null) => prev ? {
            ...prev,
            [name]: value,
            completedAt: newCompletedAt,
            status: newStatus
        } : null);
    }, [editedTask, isAdmin]); // isAdmin bağımlılık olarak eklendi

    const handleSave = async () => {
        // Sadece admin ise kaydetmeye izin ver
        if (!editedTask || !isAdmin) return;
        setIsLoadingModal(true);
        try {
            await onSave(editedTask);
        }
        catch (error) {
            console.error("Görev kaydedilirken hata oluştu:", error);
        } finally {
            setIsLoadingModal(false);
        }
    };

    const handleDelete = async () => {
        // Sadece admin ise silmeye izin ver
        if (!editedTask || !isAdmin) return;
        if (window.confirm("Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            setIsLoadingModal(true);
            try {
                await onDelete(editedTask._id);
            }
            catch (error) {
                console.error("Görev silinirken hata oluştu:", error);
            } finally {
            setIsLoadingModal(false);
            }
        }
    };

    const handleAddNote = () => {
        // Sadece admin ise not eklemeye izin ver
        if (!editedTask || !newNoteText.trim() || !isAdmin) return;

        const newNote: TroubleshootingNote = {
            _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            text: newNoteText.trim(),
            author: "Admin", // Buraya dinamik olarak notu ekleyen kullanıcının adı gelebilir
            createdAt: new Date().toISOString(),
            type: newNoteType,
        };

        setEditedTask((prev: Task | null) => ({
            ...prev!,
            troubleshootingNotes: [...prev!.troubleshootingNotes, newNote],
        }));
        setNewNoteText('');
        setNewNoteType('Other');
    };

    const handleDeleteNote = (noteId: string) => {
        // Sadece admin ise not silmeye izin ver
        if (!editedTask || !isAdmin) return;
        if (window.confirm("Bu notu silmek istediğinizden emin misiniz?")) {
            setEditedTask((prev: Task | null) => ({
                ...prev!,
                troubleshootingNotes: prev!.troubleshootingNotes.filter((note: TroubleshootingNote) => note._id !== noteId),
            }));
        }
    };

    const handleEditNote = (note: TroubleshootingNote) => {
        // Sadece admin ise not düzenlemeye izin ver
        if (!isAdmin) return;
        setEditingNoteId(note._id);
        setEditedNoteText(note.text);
        setNewNoteType(note.type);
    };

    const handleSaveEditedNote = () => {
        // Sadece admin ise düzenlenmiş notu kaydetmeye izin ver
        if (!editedTask || !editingNoteId || !editedNoteText.trim() || !isAdmin) return;

        setEditedTask((prev: Task | null) => ({
            ...prev!,
            troubleshootingNotes: prev!.troubleshootingNotes.map((note: TroubleshootingNote) =>
                note._id === editingNoteId
                    ? { ...note, text: editedNoteText.trim(), type: newNoteType }
                    : note
            ),
        }));
        setEditingNoteId(null);
        setEditedNoteText('');
        setNewNoteType('Other');
    };

    const handleCancelEditNote = () => {
        setEditingNoteId(null);
        setEditedNoteText('');
        setNewNoteType('Other');
    };

    const formatDate = (isoString: string | null) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return isoString;
        }
    };

    const toISODateString = (dateString: string | null) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    if (!editedTask) return null;

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
                    <h2 className="modal-title">{editedTask.title}</h2>
                    <button className="modal-close-button" onClick={onClose} disabled={isLoadingModal}>
                        <X className="icon" />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-title">Görev Adı:</label>
                        <input
                            type="text"
                            id="modal-title"
                            name="title"
                            value={editedTask.title}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="text-input"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-description">Açıklama:</label>
                        <textarea
                            id="modal-description"
                            name="description"
                            rows={3}
                            value={editedTask.description}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="textarea-input"
                        ></textarea>
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-status">Durum:</label>
                        <select
                            id="modal-status"
                            name="status"
                            value={editedTask.status}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="select-input"
                        >
                            <option value="beklemede">Beklemede</option>
                            <option value="devam-ediyor">Devam Ediyor</option>
                            <option value="tamamlandı">Tamamlandı</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-priority">Öncelik:</label>
                        <select
                            id="modal-priority"
                            name="priority"
                            value={editedTask.priority}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="select-input"
                        >
                            <option value="low">Düşük</option>
                            <option value="medium">Orta</option>
                            <option value="high">Yüksek</option>
                        </select>
                    </div>

                    {/* Atanan Kişi input'u select'e dönüştürüldü */}
                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-assignedTo">Atanan Kişi:</label>
                        <select
                            id="modal-assignedTo"
                            name="assignedTo"
                            value={editedTask.assignedTo}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="select-input"
                        >
                            <option value="">Seçiniz</option> {/* Varsayılan boş seçenek */}
                            {users.map((user) => (
                                <option key={user._id} value={`${user.firstName} ${user.lastName}`}>
                                    {user.firstName} {user.lastName} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-assignedBy">Atayan Kişi:</label>
                        <input
                            type="text"
                            id="modal-assignedBy"
                            name="assignedBy"
                            value={editedTask.assignedBy}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="text-input"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-type">Tip:</label>
                        <input
                            type="text"
                            id="modal-type"
                            name="type"
                            value={editedTask.type}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="text-input"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Ekleme Tarihi (Otomatik):</label>
                        <input type="text" value={formatDate(editedTask.createdAt)} disabled className="text-input disabled-input" />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="modal-completedAt">Bitiş Tarihi:</label>
                        <input
                            type="date"
                            id="modal-completedAt"
                            name="completedAt"
                            value={editedTask.completedAt ? toISODateString(editedTask.completedAt) : ''}
                            onChange={handleChange}
                            disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                            className="text-input"
                        />
                    </div>

                    {/* Sorun Giderme Notları Bölümü */}
                    <div className="troubleshooting-notes-section">
                        <h3 className="modal-title" style={{ fontSize: '20px', fontWeight: '600' }}>Sorun Giderme Notları</h3>
                        {editedTask.troubleshootingNotes.length === 0 && !editingNoteId && (
                            <p className="empty-state">Henüz not eklenmedi.</p>
                        )}
                        <ul className="notes-list">
                            {editedTask.troubleshootingNotes.map((note: TroubleshootingNote) => (
                                <li key={note._id} className="note-item">
                                    {editingNoteId === note._id ? (
                                        <div className="add-note-form">
                                            <textarea
                                                value={editedNoteText}
                                                onChange={(e) => setNewNoteText(e.target.value)}
                                                disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                                                placeholder="Notunuzu buraya yazın..."
                                                className="textarea-input"
                                            ></textarea>
                                            <select
                                                className="select-input"
                                                value={newNoteType}
                                                onChange={(e) => setNewNoteType(e.target.value as TroubleshootingNote['type'])}
                                                disabled={isLoadingModal || !isAdmin} // Sadece admin ise düzenlenebilir
                                            >
                                                <option value="Bug">Hata</option>
                                                <option value="Solution">Çözüm</option>
                                                <option value="Review">İnceleme</option>
                                                <option value="Other">Diğer</option>
                                            </select>
                                            <div className="note-buttons">
                                                <button className="btn-cancel-note" onClick={handleCancelEditNote} disabled={isLoadingModal || !isAdmin}>İptal</button>
                                                <button className="btn-add-note" onClick={handleSaveEditedNote} disabled={isLoadingModal || !editedNoteText.trim() || !isAdmin}>Kaydet</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="note-item-header">
                                                <span className={`note-type-badge ${note.type}`}>
                                                    {note.type === 'Bug' && <Bug className="icon" />}
                                                    {note.type === 'Solution' && <CheckCircle className="icon" />}
                                                    {note.type === 'Review' && <Eye className="icon" />}
                                                    {note.type === 'Other' && <FileText className="icon" />}
                                                    {note.type}
                                                </span>
                                                <span className="note-author-date">{note.author} - {formatDate(note.createdAt)}</span>
                                            </div>
                                            <p className="note-content">{note.text}</p>
                                            {isAdmin && ( // Sadece admin ise düzenleme/silme butonları görünecek
                                                <div className="edit-delete-buttons">
                                                    <button className="edit-note-btn" onClick={() => handleEditNote(note)} disabled={isLoadingModal}>
                                                        <Edit className="icon" />
                                                    </button>
                                                    <button className="delete-note-btn" onClick={() => handleDeleteNote(note._id)} disabled={isLoadingModal}>
                                                        <Trash2 className="icon" />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>

                        {isAdmin && !editingNoteId && ( // Sadece admin ise not ekleme formu görünecek
                            <div className="add-note-form">
                                <textarea
                                    value={newNoteText}
                                    onChange={(e) => setNewNoteText(e.target.value)}
                                    placeholder="Yeni notunuzu buraya yazın..."
                                    disabled={isLoadingModal}
                                    className="textarea-input"
                                ></textarea>
                                <select
                                    className="select-input"
                                    value={newNoteType}
                                    onChange={(e) => setNewNoteType(e.target.value as TroubleshootingNote['type'])}
                                    disabled={isLoadingModal}
                                >
                                    <option value="Bug">Hata</option>
                                    <option value="Solution">Çözüm</option>
                                    <option value="Review">İnceleme</option>
                                    <option value="Other">Diğer</option>
                                </select>
                                <div className="note-buttons">
                                    <button className="btn-add-note" onClick={handleAddNote} disabled={isLoadingModal || !newNoteText.trim()}>Not Ekle</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-actions-footer">
                    <button className="btn btn-primary" onClick={handleSave} disabled={isLoadingModal || !isAdmin}>
                        {isLoadingModal ? <Loader2 className="animate-spin icon-small" /> : 'Kaydet'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isLoadingModal}>İptal</button>
                    <button className="btn btn-danger" onClick={handleDelete} disabled={isLoadingModal || !isAdmin}>
                        {isLoadingModal ? <Loader2 className="animate-spin icon-small" /> : 'Sil'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const HomePage: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [filter, setFilter] = useState<'all' | 'beklemede' | 'devam-ediyor' | 'tamamlandı'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
    const [newTaskType, setNewTaskType] = useState('');
    
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [showCreateUserForm, setShowCreateUserForm] = useState(false);

    const [newUserName, setNewUserName] = useState('');
    const [newUserLastName, setNewUserLastName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createMessage, setCreateMessage] = useState('');

    const [users, setUsers] = useState<AppUser[]>([]);
    // Dinamik API URL'i için state
    const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);

    const router = useRouter();

    const fetchTasks = useCallback(async () => {
        if (!apiBaseUrl) {
            console.warn("Görevler çekilemiyor: API sunucu URL'i henüz ayarlanmadı.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/tasks`, { // API_BASE_URL yerine apiBaseUrl kullanıldı
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userFirstName');
                    localStorage.removeItem('userLastName');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userRole');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Task[] = await response.json();
            // troubleshootingNotes'un her zaman bir dizi olduğundan emin ol
            const processedTasks = data.map(task => ({
                ...task,
                troubleshootingNotes: task.troubleshootingNotes || []
            }));
            setTasks(processedTasks);
        } catch (error) {
            console.error("Görevler çekilirken hata oluştu:", error);
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiBaseUrl, router]); // apiBaseUrl bağımlılık olarak eklendi

    const fetchUsers = useCallback(async () => {
        if (!apiBaseUrl) {
            console.warn("Kullanıcı listesi çekilemiyor: API sunucu URL'i henüz ayarlanmadı.");
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.warn("Kullanıcı listesi çekilemiyor: Auth token yok.");
                return;
            }
            const response = await fetch(`${apiBaseUrl}/api/auth/users`, { // API_BASE_URL yerine apiBaseUrl kullanıldı
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.error(`Kullanıcı listesi çekilirken HTTP hatası! status: ${response.status}`);
                setUsers([]);
                return;
            }
            const data: AppUser[] = await response.json();
            setUsers(data);
            console.log("Kullanıcı listesi başarıyla çekildi:", data);
        } catch (error) {
            console.error("Kullanıcı listesi çekilirken ağ hatası:", error);
            setUsers([]);
        }
    }, [apiBaseUrl]); // apiBaseUrl bağımlılık olarak eklendi


    useEffect(() => {
        console.log('--- HomePage useEffect Başladı ---');
        const authToken = localStorage.getItem('authToken');
        const storedFirstName = localStorage.getItem('userFirstName'); 
        const storedLastName = localStorage.getItem('userLastName');
        const storedEmail = localStorage.getItem('userEmail'); 
        const storedRole = localStorage.getItem('userRole');

        // API URL'i localStorage'dan veya varsayılan olarak yükle
        const storedApiBaseUrl = localStorage.getItem('apiBaseUrl') || (process.env.NEXT_PUBLIC_BACKEND_HOST
            ? `http://${process.env.NEXT_PUBLIC_BACKEND_HOST.replace(/^https?:\/\//, '')}`
            : 'http://localhost:5000');
        setApiBaseUrl(storedApiBaseUrl);


        console.log('localStorage authToken:', authToken);
        console.log('localStorage userFirstName:', storedFirstName);
        console.log('localStorage userLastName:', storedLastName);
        console.log('localStorage userEmail:', storedEmail);
        console.log('localStorage userRole:', storedRole);
        console.log('Kullanılan API Base URL:', storedApiBaseUrl);


        if (!authToken) {
            console.log('Token bulunamadı, /login sayfasına yönlendiriliyor.');
            setIsLoading(false); // Token yoksa yükleme durumunu kapat
            router.push('/login');
            return;
        }

        if (storedFirstName && storedFirstName !== '' && storedLastName && storedLastName !== '') {
            setCurrentUser(`${storedFirstName} ${storedLastName}`);
        } else if (storedEmail && storedEmail !== '') {
            setCurrentUser(storedEmail);
        } else {
            setCurrentUser('Misafir');
        }

        setCurrentUserRole(storedRole);

        // API URL ayarlandıktan sonra görevleri ve kullanıcıları çek
        if (storedApiBaseUrl) {
            fetchTasks();
            if (storedRole === 'admin') { // Sadece admin ise kullanıcı listesini çek
                fetchUsers();
            }
        } else {
            setIsLoading(false); // Eğer API URL ayarlanamazsa yüklemeyi bitir
        }
        console.log('--- HomePage useEffect Bitti ---');
    }, [router, fetchTasks, fetchUsers]); // Bağımlılıklar güncellendi

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('userLastName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('apiBaseUrl'); // API URL'i de temizle
        setCurrentUser(null);
        setCurrentUserRole(null);
        setIsLoading(false); // Çıkış yaparken yükleme durumunu kapat
        router.push('/login');
        console.log('Kullanıcı çıkış yaptı.');
    };

    const handleGoToUsersPage = useCallback(() => { // Fonksiyon adı güncellendi
        router.push('/users'); // /users sayfasına yönlendirme
    }, [router]);

    const handleSaveTask = useCallback(async (updatedTask: Task) => {
        if (!apiBaseUrl) {
            console.warn("Görev kaydedilemiyor: API sunucu URL'i ayarlı değil.");
            return;
        }
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/tasks/${updatedTask._id}`, { // apiBaseUrl kullanıldı
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedTask),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const savedTask: Task = await response.json();
            setTasks(prevTasks =>
                prevTasks.map(task => (task._id === savedTask._id ? savedTask : task))
            );
            setSelectedTask(null);
        } catch (error) {
            console.error("Görev güncellenirken hata oluştu:", error);
        } finally {
            setIsLoading(false);
        }
    }, [apiBaseUrl]); // apiBaseUrl bağımlılık olarak eklendi

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (!apiBaseUrl) {
            console.warn("Görev silinemiyor: API sunucu URL'i ayarlı değil.");
            return;
        }
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/tasks/${taskId}`, { // apiBaseUrl kullanıldı
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
            setSelectedTask(null);
        } catch (error) {
            console.error("Görev silinirken hata oluştu:", error);
        } finally {
            setIsLoading(false);
        }
    }, [apiBaseUrl]); // apiBaseUrl bağımlılık olarak eklendi

    const handleToggleTaskStatus = useCallback(async (id: string) => {
        if (!apiBaseUrl) {
            console.warn("Görev durumu güncellenemiyor: API sunucu URL'i ayarlı değil.");
            return;
        }
        const taskToToggle = tasks.find(task => task._id === id);
        if (!taskToToggle) return;

        const newStatus = taskToToggle.status === 'tamamlandı' ? 'beklemede' : 'tamamlandı';
        const updatedTask = {
            ...taskToToggle,
            status: newStatus,
            completedAt: newStatus === 'tamamlandı' ? new Date().toISOString() : null,
        };

        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/tasks/${updatedTask._id}`, { // apiBaseUrl kullanıldı
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedTask),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const savedTask: Task = await response.json();
            setTasks(prevTasks =>
                prevTasks.map(task => (task._id === savedTask._id ? savedTask : task))
            );
        } catch (error) {
            console.error("Görev durumu güncellenirken hata oluştu:", error);
        } finally {
            setIsLoading(false);
        }
    }, [tasks, apiBaseUrl]); // apiBaseUrl bağımlılık olarak eklendi

    const handleAddTask = useCallback(async () => {
        // Sadece admin ise yeni görev eklemeye izin ver
        if (currentUserRole !== 'admin') return;

        if (!apiBaseUrl) {
            console.warn("Yeni görev eklenemiyor: API sunucu URL'i ayarlı değil.");
            return;
        }
        if (!newTaskTitle.trim()) {
            return;
        }

        setIsLoading(true);
        const newTaskData = {
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim(),
            assignedTo: newTaskAssignedTo.trim() || 'Atanmamış',
            assignedBy: currentUser || 'Bilinmiyor',
            type: newTaskType.trim() || 'Genel',
            priority: newTaskPriority,
        };

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/tasks`, { // apiBaseUrl kullanıldı
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTaskData),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const addedTask: Task = await response.json();
            setTasks(prevTasks => [addedTask, ...prevTasks]);
            setNewTaskTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('medium');
            setNewTaskAssignedTo('');
            setNewTaskType('');
        } catch (error) {
            console.error("Yeni görev eklenirken hata oluştu:", error);
        } finally {
            setIsLoading(false);
        }

    }, [newTaskTitle, newTaskDescription, newTaskPriority, newTaskAssignedTo, newTaskType, currentUser, apiBaseUrl, currentUserRole]); // currentUserRole bağımlılık olarak eklendi

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateMessage('');

        if (!apiBaseUrl) {
            console.warn("Kullanıcı oluşturulamıyor: API sunucu URL'i ayarlı değil.");
            setCreateLoading(false);
            return;
        }

        if (!newUserName.trim() || !newUserLastName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            setCreateMessage('Lütfen tüm kullanıcı bilgilerini doldurun.');
            setCreateLoading(false);
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            setCreateMessage('Yetkilendirme hatası: Giriş yapmış bir admin değilsiniz.');
            setCreateLoading(false);
            return;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/admin/register-user`, { // apiBaseUrl kullanıldı
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
                    role: 'user'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setCreateMessage(`Kullanıcı "${data.user.firstName} ${data.user.lastName}" başarıyla oluşturuldu!`);
                setNewUserName('');
                setNewUserLastName('');
                setNewUserEmail('');
                setNewUserPassword('');
                fetchUsers();
                setTimeout(() => setCreateMessage(''), 5000);
            } else {
                const errorData = await response.json();
                setCreateMessage(errorData.message || 'Kullanıcı oluşturulurken bir hata oluştu.');
                setTimeout(() => setCreateMessage(''), 5000);
            }
        } catch (error) {
            console.error("Kullanıcı oluşturma hatası:", error);
            setCreateMessage('Kullanıcı oluşturulurken bir ağ hatası oluştu.');
            setTimeout(() => setCreateMessage(''), 5000);
        } finally {
            setCreateLoading(false);
        }
    };


    const filteredTasks = tasks.filter(task => {
        const matchesFilter = filter === 'all' || task.status === filter;
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               task.type.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getPriorityLabel = (priority: 'low' | 'medium' | 'high') => {
        switch (priority) {
            case 'high': return 'Yüksek';
            case 'medium': return 'Orta';
            case 'low': return 'Düşük';
            default: return 'Bilinmiyor';
        }
    };

    const getPriorityClass = (priority: 'low' | 'medium' | 'high') => {
        switch (priority) {
            case 'high': return 'high';
            case 'medium': return 'medium';
            case 'low': return 'low';
            default: return '';
        }
    };

    const getStatusLabel = (status: 'beklemede' | 'devam-ediyor' | 'tamamlandı') => {
        switch (status) {
            case 'beklemede': return 'Beklemede';
            case 'devam-ediyor': return 'Devam Ediyor';
            case 'tamamlandı': return 'Tamamlandı';
            default: return 'Bilinmiyor';
        }
    };

    const getStatusClass = (status: 'beklemede' | 'devam-ediyor' | 'tamamlandı') => {
        switch (status) {
            case 'beklemede': return 'bg-yellow-200 text-yellow-800';
            case 'devam-ediyor': return 'bg-blue-200 text-blue-800';
            case 'tamamlandı': return 'bg-green-200 text-green-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    const formatDateForDisplay = (isoString: string | null) => {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return 'Geçersiz Tarih';
        }
    };

    const getTaskTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'tasarım': return <FileText className="icon" />;
            case 'geliştirme': return <Code className="icon" />;
            case 'veritabanı': return <Database className="icon" />;
            case 'analiz': return <BarChart className="icon" />;
            case 'iletişim': return <Mail className="icon" />;
            case 'güvenlik': return <Shield className="icon" />;
            case 'test': return <CheckCircle className="icon" />;
            case 'backend': return <Code className="icon" />;
            case 'frontend': return <LayoutDashboard className="icon" />;
            default: return <Tag className="icon" />;
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen((prev: boolean) => !prev);
    };

    if (isLoading && currentUser === null) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 font-inter">
                <Loader2 className="animate-spin text-gray-700" size={50} />
                <p className="text-lg text-gray-700 ml-4">Yükleniyor...</p>
            </div>
        );
    }
    
    return (
        <div className="app-container">
            {isLoading && (
                <div className="loading-overlay">
                    <Loader2 className="spinner animate-spin" />
                </div>
            )}

            {/* HEADER */}
            <header className="app-header">
                <div className="header-left">
                    <LayoutDashboard className="header-icon" />
                    <h1 className="header-title">Görev Yönetim Paneli</h1>
                </div>
                <div className="header-actions">
                    {/* Kullanıcı bilgisi ve dinamik kullanıcı adı */}
                    {currentUser && (
                        <div className="user-info-container flex items-center space-x-2 px-3 py-1.5 bg-gray-700 text-gray-200 text-sm rounded-md shadow-sm ml-2">
                            <span className="user-avatar flex justify-center items-center w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex-shrink-0">
                                {currentUser.charAt(0).toUpperCase()}
                            </span>
                            <span>Merhaba, {currentUser.split(' ')[0]}!</span> {/* Sadece ilk isim */}
                        </div>
                    )}
                    {/* Admin ise Kullanıcıları Yönet/Ayarlar butonu */}
                    {currentUserRole === 'admin' && (
                        <button onClick={handleGoToUsersPage} className="manage-button flex items-center space-x-2 px-3 py-1.5 bg-gray-700 text-gray-200 text-sm rounded-md shadow-sm hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 ml-2" disabled={isLoading}>
                            <Settings className="icon" size={16} /> {/* Settings ikonu bırakıldı */}
                            <span>Kullanıcı Ayarları</span> {/* Buton metni güncellendi */}
                        </button>
                    )}
                    {/* Eski "Settings" butonu kaldırıldı, rol bağımlılığı eklendi */}
                    {currentUserRole !== 'admin' && ( // Sadece admin değilse Settings butonu görünsün
                         <button onClick={handleGoToUsersPage} className="manage-button">
                            <Settings className="icon" />
                            Settings
                        </button>
                    )}
                    {/* Çıkış butonu */}
                    <button className="logout-button" onClick={handleLogout} disabled={isLoading}>
                        <LogOut className="icon" />
                        Çıkış Yap
                    </button>
                    <button className="toggle-sidebar-btn" onClick={toggleSidebar} disabled={isLoading}>
                        <Menu className="icon" />
                    </button>
                </div>
            </header>

            <div className="main-content-wrapper">
                {/* SOL PANEL: Görev Ekleme (Sidebar) - Sadece admin ise görünecek */}
                {currentUserRole === 'admin' && (
                    <div className={`left-panel ${isSidebarOpen ? '' : 'closed'}`}>
                        <div className="panel-header">
                            <PlusCircle className="header-icon" />
                            <h2 className="header-title" style={{ fontSize: '20px' }}>Yeni Görev Ekle</h2>
                        </div>
                        <div className="form-section">
                            <div className="input-group">
                                <label className="input-label" htmlFor="newTaskTitle">Görev Adı</label>
                                <input
                                    type="text"
                                    id="newTaskTitle"
                                    className="text-input"
                                    placeholder="Görevinizin başlığını girin"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label" htmlFor="newTaskDescription">Açıklama (Opsiyonel)</label>
                                <textarea
                                    id="newTaskDescription"
                                    rows={3}
                                    className="textarea-input"
                                    placeholder="Açıklama ekleyin..."
                                    value={newTaskDescription}
                                    onChange={(e) => setNewTaskDescription(e.target.value)}
                                    disabled={isLoading}
                                ></textarea>
                            </div>

                            {/* Atanan Kişi input'u select'e dönüştürüldü */}
                            <div className="input-group">
                                <label className="input-label" htmlFor="newTaskAssignedTo">Atanan Kişi</label>
                                <select
                                    id="newTaskAssignedTo"
                                    className="select-input"
                                    value={newTaskAssignedTo}
                                    onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="">Seçiniz</option> {/* Varsayılan boş seçenek */}
                                    {users.map((user) => (
                                        <option key={user._id} value={`${user.firstName} ${user.lastName}`}>
                                            {user.firstName} {user.lastName} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="newTaskType">Tip</label>
                                <input
                                    type="text"
                                    id="newTaskType"
                                    className="text-input"
                                    placeholder="Örn: Tasarım, Geliştirme, Test, Backend, Frontend"
                                    value={newTaskType}
                                    onChange={(e) => setNewTaskType(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="newTaskPriority">Öncelik</label>
                                <select
                                    id="newTaskPriority"
                                    className="select-input"
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                                    disabled={isLoading}
                                >
                                    <option value="low">Düşük</option>
                                    <option value="medium">Orta</option>
                                    <option value="high">Yüksek</option>
                                </select>
                            </div>

                            <button className="add-task-button" onClick={handleAddTask} disabled={isLoading || !newTaskTitle.trim()}>
                                <PlusCircle className="icon" />
                                Yeni Görev Ekle
                            </button>
                        </div>
                    </div>
                )}

                {/* Sidebar açıldığında overlay */}
                {isSidebarOpen && currentUserRole === 'admin' && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

                {/* SAĞ PANEL: Görevlerim ve Kullanıcı Oluşturma */}
                <div className={`right-panel ${isSidebarOpen && currentUserRole === 'admin' ? 'sidebar-open' : 'sidebar-closed'}`}>
                    {/* Admin için Kullanıcı Oluşturma Formu */}
                    <AnimatePresence>
                        {showCreateUserForm && currentUserRole === 'admin' && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="user-creation-section panel-content-section bg-white p-8 rounded-2xl shadow-xl mb-6 border border-gray-200"
                            >
                                <h2 className="section-title flex items-center space-x-3 text-2xl font-bold text-gray-900 mb-6">
                                    <UserPlus size={24} className="text-purple-600" />
                                    <span>Yeni Kullanıcı Oluştur</span>
                                </h2>
                                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input
                                        type="text"
                                        placeholder="Adı"
                                        className="text-input p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        disabled={createLoading}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Soyadı"
                                        className="text-input p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                                        value={newUserLastName}
                                        onChange={(e) => setNewUserLastName(e.target.value)}
                                        disabled={createLoading}
                                        required
                                    />
                                    <input
                                        type="email"
                                        placeholder="E-posta"
                                        className="text-input md:col-span-2 p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        disabled={createLoading}
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Şifre"
                                        className="text-input md:col-span-2 p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        disabled={createLoading}
                                        required
                                    />
                                    {createMessage && (
                                        <p className={`md:col-span-2 text-sm mt-2 text-center py-2 px-4 rounded-md ${createMessage.includes('başarıyla') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {createMessage}
                                        </p>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={createLoading} 
                                        className="btn btn-primary md:col-span-2 flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all duration-300 transform hover:scale-105"
                                    >
                                        {createLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <UserPlus className="icon mr-2" size={20} />}
                                        <span>Kullanıcı Oluştur</span>
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="panel-header">
                        <h2 className="header-title" style={{ fontSize: '26px' }}>Görevlerim</h2>
                        <div className="search-bar">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Görev ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={isLoading}
                            />
                            <Search className="search-icon" />
                        </div>
                    </div>

                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                            disabled={isLoading}
                        >
                            Tümü
                        </button>
                        <button
                            className={`filter-btn ${filter === 'beklemede' ? 'active' : ''}`}
                            onClick={() => setFilter('beklemede')}
                            disabled={isLoading}
                        >
                            Beklemede
                        </button>
                        <button
                            className={`filter-btn ${filter === 'devam-ediyor' ? 'active' : ''}`}
                            onClick={() => setFilter('devam-ediyor')}
                            disabled={isLoading}
                        >
                            Devam Ediyor
                        </button>
                        <button
                            className={`filter-btn ${filter === 'tamamlandı' ? 'active' : ''}`}
                            onClick={() => setFilter('tamamlandı')}
                            disabled={isLoading}
                        >
                            Tamamlandı
                        </button>
                    </div>

                    {!isLoading && filteredTasks.length === 0 ? (
                        <p className="empty-state">Görev bulunamadı.</p>
                    ) : (
                        <ul className="task-list">
                            {filteredTasks.map(task => (
                                <motion.li
                                    key={task._id}
                                    className={`task-list-item ${task.status === 'tamamlandı' ? 'completed-task' : ''}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <input
                                        type="checkbox"
                                        className="task-checkbox"
                                        checked={task.status === 'tamamlandı'}
                                        onChange={() => handleToggleTaskStatus(task._id)}
                                        onClick={e => e.stopPropagation()}
                                        disabled={isLoading || currentUserRole !== 'admin'} // Admin değilse checkbox devre dışı
                                    />
                                    <h3 className="task-title">
                                        {task.title}
                                    </h3>
                                    <span className={`status-badge ${getStatusClass(task.status)}`}>
                                        {getStatusLabel(task.status)}
                                    </span>
                                    <span className="task-type-badge">
                                        {getTaskTypeIcon(task.type)}
                                        <span className="ml-1">{task.type}</span>
                                    </span>
                                    <span className="task-assigned-to">
                                        <User className="icon mr-1" size={14} />
                                        {task.assignedTo}
                                    </span>

                                    {/* Oluşturulma Tarihi */}
                                    {task.createdAt && (
                                        <span className="task-date-info">
                                            <Calendar className="icon mr-1" size={14} />
                                            Oluşturuldu: {formatDateForDisplay(task.createdAt)}
                                        </span>
                                    )}

                                    {/* Bitiş Tarihi (Sadece tamamlanmış görevler için veya varsa) */}
                                    {task.completedAt && (
                                        <span className="task-date-info">
                                            <Calendar className="icon mr-1" size={14} />
                                            Bitiş: {formatDateForDisplay(task.completedAt)}
                                        </span>
                                    )}

                                    <div className="flex items-center space-x-2 flex-shrink-0 ml-auto">
                                        <button className="view-task-button" onClick={() => setSelectedTask(task)} disabled={isLoading}>
                                            <Eye size={16} />
                                            <span>Görüntüle</span>
                                        </button>
                                    </div>
                                </motion.li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onSave={handleSaveTask}
                        onDelete={handleDeleteTask}
                        users={users} // Kullanıcı listesi modal'a gönderiliyor
                        currentUserRole={currentUserRole} // Rol bilgisi modala iletiliyor
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default HomePage;
