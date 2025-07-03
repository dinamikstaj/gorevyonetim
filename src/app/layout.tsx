// frontend/app/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import './globals.css';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Yükleme durumu

    useEffect(() => {
        setIsClient(true); // İstemci tarafında olduğumuzu işaretle

        const checkAuthStatus = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token'); // URL'den token'ı al

            let currentAuthToken = localStorage.getItem('authToken'); // Mevcut localStorage token'ı

            // Eğer URL'de bir token varsa (örn: Google OAuth'tan geldi)
            if (urlToken) {
                localStorage.setItem('authToken', urlToken); // localStorage'a kaydet
                currentAuthToken = urlToken; // Mevcut token'ı güncelle
                
                // URL'den token parametresini temizle
                // Bu, kullanıcının URL'sinde hassas bilginin (token) kalmamasını sağlar
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log('URL\'den token alındı ve localStorage\'a kaydedildi.');
            }

            const loggedIn = !!currentAuthToken; // Token varsa true, yoksa false

            setIsAuthenticated(loggedIn);

            // Kimlik doğrulama kontrolleri
            if (!loggedIn && pathname !== '/login') {
                router.push('/login'); // Giriş yapılmamışsa ve giriş sayfasında değilse login'e yönlendir
            } else if (loggedIn && pathname === '/login') {
                router.push('/'); // Giriş yapılmışsa ve giriş sayfasında ise ana sayfaya yönlendir
            }
            setIsLoading(false); // Kimlik doğrulama kontrolü tamamlandı
        };

        // Uygulama yüklendiğinde ve yol değiştiğinde kimlik doğrulama kontrolünü çalıştır
        checkAuthStatus();

        // Opsiyonel: Token'ın localStorage'da dışarıdan değiştiğini dinlemek için
        // window.addEventListener('storage', checkAuthStatus);
        // return () => {
        //   window.removeEventListener('storage', checkAuthStatus);
        // };
    }, [router, pathname]); // Bağımlılıklar güncellendi

    // Yükleme sırasında bir gösterge göster (tarayıcıda render edilene kadar)
    if (!isClient || isLoading) {
        return (
            <html lang="tr">
                <body>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)'
                    }}>
                        Yükleniyor...
                    </div>
                </body>
            </html>
        );
    }

    return (
        <html lang="tr">
            <body>{children}</body>
        </html>
    );
}
