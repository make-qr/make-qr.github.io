/**
 * Site-wide theme and Progressive Web App controls.
 */
(function () {
    'use strict';

    const rootPath = typeof ROOT_PATH === 'string' ? ROOT_PATH : '';
    let installPrompt = null;

    function currentTheme() {
        return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    }

    function updateThemeUi() {
        const isDark = currentTheme() === 'dark';
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.setAttribute('aria-label', isDark ? 'Use light mode' : 'Use dark mode');
            button.setAttribute('aria-pressed', String(isDark));
        });
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) themeColor.content = isDark ? '#0f172a' : '#1e40af';
    }

    function setTheme(theme, persist) {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        if (persist) localStorage.setItem('make-qr-theme', theme);
        updateThemeUi();
    }

    function bindThemeButtons() {
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            if (button.dataset.bound === 'true') return;
            button.dataset.bound = 'true';
            button.addEventListener('click', () => {
                setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
            });
        });
        updateThemeUi();
    }

    function addPwaMetadata() {
        if (!document.querySelector('link[rel="manifest"]')) {
            const manifest = document.createElement('link');
            manifest.rel = 'manifest';
            manifest.href = rootPath + 'manifest.webmanifest';
            document.head.append(manifest);
        }
        if (!document.querySelector('meta[name="theme-color"]')) {
            const themeColor = document.createElement('meta');
            themeColor.name = 'theme-color';
            document.head.append(themeColor);
        }
        if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
            const capable = document.createElement('meta');
            capable.name = 'apple-mobile-web-app-capable';
            capable.content = 'yes';
            document.head.append(capable);
        }
        updateThemeUi();
    }

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function isIosMobile() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent);
    }

    function updateInstallButtons() {
        const canInstall = !isStandalone() && (Boolean(installPrompt) || isIosMobile());
        document.querySelectorAll('[data-install-app]').forEach(button => {
            button.hidden = !canInstall;
            if (button.dataset.bound === 'true') return;
            button.dataset.bound = 'true';
            button.addEventListener('click', installApp);
        });
    }

    async function installApp() {
        if (installPrompt) {
            installPrompt.prompt();
            await installPrompt.userChoice;
            installPrompt = null;
            updateInstallButtons();
            return;
        }
        if (isIosMobile()) {
            alert('To install Make QR, tap the Share button in Safari, then choose “Add to Home Screen”.');
        }
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(rootPath + 'sw.js', {scope: rootPath || './'})
                .catch(error => console.warn('Service worker registration failed:', error));
        });
    }

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        installPrompt = event;
        updateInstallButtons();
    });
    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        updateInstallButtons();
    });

    addPwaMetadata();
    bindThemeButtons();
    updateInstallButtons();
    registerServiceWorker();
    document.addEventListener('templatesLoaded', () => {
        bindThemeButtons();
        updateInstallButtons();
    });
})();
