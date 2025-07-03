// frontend/app/login/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Yükleme animasyonu için Lucide React ikon bileşeni

/**
 * LoginPage bileşeni, kullanıcıların e-posta/şifre ile giriş yapmasını sağlar.
 * Kimlik doğrulama işlemini backend API'si üzerinden gerçekleştirir ve başarılı
 * giriş sonrası bir JWT tokenı alır.
 */
const LoginPage: React.FC = () => {
    // Giriş form alanları için state'ler
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Uygulama durumu yönetimi için state'ler
    const [isLoading, setIsLoading] = useState(false); // İşlem devam ederken yükleniyor durumunu gösterir
    const [errorMessage, setErrorMessage] = useState(''); // Kullanıcıya gösterilecek hata mesajı
    const [successMessage, setSuccessMessage] = useState(''); // Kullanıcıya gösterilecek başarı mesajı
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Kullanıcının oturum açıp açmadığını belirtir
    const [loggedInUserName, setLoggedInUserName] = useState<string | null>(null); // Giriş yapan kullanıcının tam adı veya e-postası

    const router = useRouter(); // Next.js'in yönlendirme hook'u

    // Backend API'sinin temel URL'i, ortam değişkeninden veya varsayılan olarak localhost:5000
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_HOST
        ? `http://${process.env.NEXT_PUBLIC_BACKEND_HOST.replace(/^https?:\/\//, '')}`
        : 'http://localhost:5000';

    // Form input alanlarına doğrudan erişim için useRef hook'ları
    const emailInputRef = useRef<HTMLInputElement | null>(null);
    const passwordInputRef = useRef<HTMLInputElement | null>(null);
    
    /**
     * Bileşen yüklendiğinde ve `router` değiştiğinde çalışacak useEffect.
     * Bu hook, kullanıcının daha önce oturum açıp açmadığını kontrol eder
     * ve eğer token varsa doğrudan ana sayfaya yönlendirir.
     */
    useEffect(() => {
        const token = localStorage.getItem('authToken'); // JWT tokenını kontrol et
        const storedFirstName = localStorage.getItem('userFirstName'); 
        const storedLastName = localStorage.getItem('userLastName');
        const storedEmail = localStorage.getItem('userEmail');

        if (token) { // Eğer token varsa
            setIsLoggedIn(true); // Oturum açıldı olarak işaretle
            // Kullanıcı adını localStorage'dan al, yoksa e-postayı kullan
            if (storedFirstName && storedFirstName !== '' && storedLastName && storedLastName !== '') {
                setLoggedInUserName(`${storedFirstName} ${storedLastName}`);
            } else if (storedEmail && storedEmail !== '') {
                setLoggedInUserName(storedEmail);
            }
            router.push('/'); // Ana sayfaya yönlendir
        }
    }, [router]); // router objesi değiştiğinde bu effect'i yeniden çalıştır

    /**
     * Kullanıcı mesajlarını (hata veya başarı) belirli bir gecikme sonrası temizler.
     * @param setter Mesaj state'ini güncelleyecek setState fonksiyonu.
     */
    const clearMessageAfterDelay = (setter: React.Dispatch<React.SetStateAction<string>>) => {
        setTimeout(() => {
            setter(''); // 5 saniye sonra mesajı boşalt
        }, 5000); 
    };

    /**
     * Belirli bir input alanına odaklanmayı sağlar.
     * @param inputRef Odaklanılacak input elementinin ref'i.
     */
    const focusInput = (inputRef: React.RefObject<HTMLInputElement | null>) => {
        if (inputRef.current) {
            inputRef.current.focus(); // Input'a odaklan
        }
    };

    /**
     * E-posta ve şifre ile giriş yapma işlemini yönetir.
     * Backend API'sine POST isteği gönderir ve yanıtı işler.
     * @param e Form gönderim olayı.
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); // Formun varsayılan gönderim davranışını engelle
        setIsLoading(true); // Yükleniyor durumunu etkinleştir
        setErrorMessage(''); // Önceki hata mesajını temizle
        setSuccessMessage(''); // Önceki başarı mesajını temizle

        // Alanların boş olup olmadığını kontrol et
        if (!email || !password) {
            setErrorMessage('Lütfen e-posta ve şifrenizi girin.');
            focusInput(emailInputRef); // Eksik alan varsa e-posta inputuna odaklan
            setIsLoading(false); // Yükleniyor durumunu devre dışı bırak
            return;
        }

        const requestUrl = `${API_BASE_URL}/api/auth/login`; // Backend giriş endpoint'i
        console.log('Giriş isteği gönderiliyor:', requestUrl);

        try {
            // Backend'e kimlik doğrulama isteği gönder
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // JSON veri gönderildiğini belirt
                },
                body: JSON.stringify({ email, password }), // E-posta ve şifreyi JSON formatında gönder
            });

            // HTTP yanıtının başarılı olup olmadığını kontrol et
            if (response.ok) {
                const data = await response.json(); // Yanıtı JSON olarak ayrıştır
                console.log('>>> Backend\'den gelen başarılı giriş yanıtı (data):', data); 
                
                setSuccessMessage('Giriş başarılı! Yönlendiriliyorsunuz...'); // Başarı mesajını ayarla
                setIsLoggedIn(true); // Oturum açıldı durumunu ayarla
                localStorage.setItem('authToken', data.token); // Alınan JWT tokenını localStorage'a kaydet

                // Kullanıcı bilgilerini (isim, e-posta, rol) localStorage'a kaydet
                if (data.user) {
                    localStorage.setItem('userEmail', data.user.email || '');
                    localStorage.setItem('userFirstName', data.user.firstName || '');
                    localStorage.setItem('userLastName', data.user.lastName || '');
                    localStorage.setItem('userRole', data.user.role || 'user'); // Rolü de kaydet (varsayılan: user)
                    console.log('localStorage\'a kullanıcı bilgileri kaydedildi:', {
                        firstName: data.user.firstName,
                        lastName: data.user.lastName,
                        email: data.user.email,
                        role: data.user.role
                    });
                } else {
                    console.warn('Backend yanıtında user objesi bulunamadı. Varsayılan bilgiler kullanılacak.');
                    localStorage.setItem('userRole', 'user'); // User objesi yoksa varsayılan rolü kaydet
                }

                // Görüntülenecek kullanıcı adını belirle (isim soyisim veya e-posta)
                const userDisplayName = data.user?.firstName && data.user?.lastName 
                    ? `${data.user.firstName} ${data.user.lastName}`
                    : data.user?.email || email;
                setLoggedInUserName(userDisplayName); // Kullanıcı adını state'e kaydet

                // Kısa bir gecikme sonrası kullanıcıyı ana sayfaya yönlendir
                setTimeout(() => { router.push('/'); }, 1000);
            } else {
                // Yanıt başarılı değilse (örneğin 401 Unauthorized, 400 Bad Request)
                const errorData = await response.json(); // Hata detaylarını JSON olarak al
                console.error('Giriş başarısız yanıtı (errorData):', errorData);
                setErrorMessage(errorData.message || 'Giriş başarısız oldu. Lütfen bilgilerinizi kontrol edin.');
                clearMessageAfterDelay(setErrorMessage); // Hata mesajını otomatik olarak temizle
            }
        } catch (error: any) {
            // Ağ hataları veya fetch işlemi sırasında oluşan diğer hataları yakala
            console.error('Giriş isteği sırasında ağ hatası:', error);
            if (error.message === 'Failed to fetch') {
                setErrorMessage('Sunucuya ulaşılamadı. Lütfen backend sunucusunun çalıştığından emin olun ve adresini kontrol edin.');
            } else {
                setErrorMessage('Giriş sırasında bir hata oluştu: ' + error.message);
            }
            clearMessageAfterDelay(setErrorMessage); // Hata mesajını otomatik olarak temizle
        } finally {
            setIsLoading(false); // İşlem tamamlandı, yükleniyor durumunu devre dışı bırak
        }
    };

    /**
     * Kullanıcı başarıyla giriş yaptığında gösterilecek yönlendirme ekranı.
     */
    if (isLoggedIn) {
        return (
            <div className="login-page-container">
                <div className="login-right-panel" style={{ textAlign: 'center' }}>
                    <h1 className="main-heading" style={{ fontSize: '2.5rem', marginBottom: 'var(--space-6)' }}>
                        Hoş Geldiniz{loggedInUserName ? `, ${loggedInUserName}!` : '!'}
                    </h1>
                    <p style={{ color: 'var(--login-text-secondary)', marginBottom: 'var(--space-6)' }}>
                        Başarıyla giriş yaptınız. Uygulamaya yönlendiriliyorsunuz...
                    </p>
                    <Loader2 className="spinner animate-spin" style={{ width: '60px', height: '60px', margin: '0 auto', color: 'var(--login-button-primary)' }} />
                </div>
            </div>
        );
    }

    /**
     * Giriş formunu içeren ana render bloğu.
     */
    return (
        <div className="login-page-container">
            {isLoading && ( // isLoading true ise yükleme overlay'ini göster
                <div className="loading-overlay">
                    <Loader2 className="spinner animate-spin" />
                </div>
            )}

            <div className="login-content-wrapper"> {/* Tüm login içeriğini kapsayan ana alan */}
                <div className="login-left-panel"> {/* Sol panel (karşılama mesajları) */}
                    <h1 className="main-heading">Merhaba, Hoş Geldiniz!</h1>
                    <p className="welcome-text">Proje Yönetim Sistemine Giriş Yapın.</p>
                    <p className="sub-text">Devam etmek için lütfen giriş bilgilerinizi kullanın.</p>
                </div>

                <div className="login-right-panel"> {/* Sağ panel (giriş formu) */}
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-input-group">
                            <label htmlFor="email" className="form-label">E-Mail</label>
                            <input
                                type="email"
                                id="email"
                                placeholder="E.g. user@example.com"
                                className="form-input" // Global input stilini uygula
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading} // Yüklenirken inputları devre dışı bırak
                                ref={emailInputRef} // Ref'i ata
                                required // Gerekli alan
                            />
                        </div>

                        <div className="form-input-group">
                            <label htmlFor="password" className="form-label">Şifre</label>
                            <input
                                type="password"
                                id="password"
                                placeholder="Şifreniz"
                                className="form-input" // Global input stilini uygula
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading} // Yüklenirken inputları devre dışı bırak
                                ref={passwordInputRef} // Ref'i ata
                                required // Gerekli alan
                            />
                        </div>

                        {/* Hata ve başarı mesajlarını koşullu olarak göster */}
                        {errorMessage && <p className="login-message error">{errorMessage}</p>}
                        {successMessage && <p className="login-message success">{successMessage}</p>}

                        {/* Butonlar */}
                        <div className="login-buttons-container">
                            <button type="submit" className="login-button" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Giriş Yap'}
                            </button>
                            {/* Yeni "Kullanıcı Girişi" butonu */}
                            <button type="button" className="login-button secondary-login-button" onClick={handleLogin} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Kullanıcı Girişi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
