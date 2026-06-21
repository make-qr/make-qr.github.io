// Keyboard Tester Pro - JavaScript
class KeyboardTester {
    constructor() {
        this.pressedKeys = new Set();
        this.testedKeys = new Set();
        this.keyStats = {
            totalPressed: 0,
            workingKeys: 0,
            letters: new Set(),
            numbers: new Set(),
            functions: new Set(),
            special: new Set()
        };
        this.startTime = Date.now();
        this.typingSpeed = 0;
        this.lastKeyPressTime = Date.now();
        this.keySequence = [];
        this.soundEnabled = true;
        this.animationEnabled = true;
        this.sessionInterval = null;
        this.audioContext = null;
        
        this.init();

        // Prevent Windows key context menu
        window.addEventListener('contextmenu', (e) => {
            if (e.key === 'Meta' || e.code.startsWith('Meta')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });

        // Additional Windows key prevention
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Meta' || e.code.startsWith('Meta')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }

    init() {
        this.setupEventListeners();
        this.setupUI();
        this.loadSettings();
        this.startSessionTimer();
        this.initializeAudioContext();
        
        // Show welcome message
        setTimeout(() => {
            this.showNotification('welcome', 'welcomeMsg');
        }, 500);
    }

    initializeAudioContext() {
        // Initialize AudioContext on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('Audio not supported:', e);
                    this.soundEnabled = false;
                }
            }
        }, { once: true });
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Control buttons
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        document.getElementById('test-all-btn').addEventListener('click', () => this.testAllKeys());
        document.getElementById('export-btn').addEventListener('click', () => this.exportReport());

        // Layout selector
        document.getElementById('layout-select').addEventListener('change', (e) => {
            this.switchKeyboardLayout(e.target.value);
            this.saveSettings();
        });

        // Settings toggles
        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            if (this.soundEnabled && !this.audioContext) {
                this.initializeAudioContext();
            }
        });
        document.getElementById('animation-toggle').addEventListener('change', (e) => this.animationEnabled = e.target.checked);

        // Key click events
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', () => this.simulateKeyPress(key.dataset.key));
        });
    }

    setupUI() {
        this.updateStats();
        this.updateProgress();
    }

    handleKeyDown(e) {
        // Prevent default behavior for all function and special keys
        if (
            e.key.startsWith('F') || // Function keys (F1-F12)
            e.code === 'Space' ||
            e.code === 'Tab' ||
            e.code.includes('Lock') || // CapsLock, NumLock, ScrollLock
            e.code === 'PrintScreen' ||
            e.code === 'Pause' ||
            e.code === 'Insert' ||
            e.code === 'Delete' ||
            e.code === 'Home' ||
            e.code === 'End' ||
            e.code === 'PageUp' ||
            e.code === 'PageDown' ||
            e.code.startsWith('Arrow') ||
            e.code.startsWith('Meta') || // Windows key
            e.code.startsWith('Alt') ||
            e.code.startsWith('Control') ||
            e.code.startsWith('Shift') ||
            e.code === 'Backslash' // Add backslash to prevent default
        ) {
            e.preventDefault();
            e.stopPropagation();
        }

        let key;
        if (e.code === 'Backslash') {
            key = '\\\\';
        } else {
            key = this.normalizeKey(e);
        }

        if (this.pressedKeys.has(key)) return; // Prevent key repeat
        
        this.pressedKeys.add(key);
        this.testedKeys.add(key);
        this.keyStats.totalPressed++;
        
        // Update key statistics
        this.updateKeyStats(key, e);
        
        // Visual feedback
        this.highlightKey(key, e.code, true);
        
        // Update key info
        this.updateKeyInfo(e);
        
        // Sound feedback
        if (this.soundEnabled) {
            this.playKeySound();
        }
        
        // Update typing speed
        this.updateTypingSpeed();
        
        // Update UI
        this.updateStats();
        this.updateProgress();
        
        // Store key in sequence
        this.keySequence.push({
            key: key,
            timestamp: Date.now(),
            code: e.code,
            keyCode: e.keyCode
        });
        
        // Keep sequence limited
        if (this.keySequence.length > 100) {
            this.keySequence.shift();
        }
    }

    handleKeyUp(e) {
        let key;
        if (e.code === 'Backslash') {
            key = '\\\\';
        } else {
            key = this.normalizeKey(e);
        }
        this.pressedKeys.delete(key);
        this.highlightKey(key, e.code, false);
    }

    normalizeKey(event) {
        // Handle special cases for different key representations
        const keyMappings = {
            ' ': 'Space',
            'ArrowUp': 'ArrowUp',
            'ArrowDown': 'ArrowDown',
            'ArrowLeft': 'ArrowLeft',
            'ArrowRight': 'ArrowRight'
        };

        // Use code for special keys to distinguish left/right variants
        const codeToKey = {
            'ShiftLeft': 'ShiftLeft',
            'ShiftRight': 'ShiftRight',
            'ControlLeft': 'ControlLeft',
            'ControlRight': 'ControlRight',
            'AltLeft': 'AltLeft',
            'AltRight': 'AltRight',
            'MetaLeft': 'MetaLeft',
            'MetaRight': 'MetaRight'
        };

        if (codeToKey[event.code]) {
            return codeToKey[event.code];
        }

        return keyMappings[event.key] || event.key;
    }

    highlightKey(key, code, isPressed) {
        let selector;
        if (code === 'Backslash' || key === '\\\\') {
            selector = '[data-key="\\\\"]';
        } else {
            selector = `[data-key="${key}"]`;
        }
        
        const keyElements = document.querySelectorAll(selector);
        
        keyElements.forEach(element => {
            if (isPressed) {
                element.classList.add('pressed');
                if (!element.classList.contains('tested')) {
                    element.classList.add('tested');
                }
                
                if (this.animationEnabled) {
                    element.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        element.style.transform = '';
                    }, 100);
                }
            } else {
                element.classList.remove('pressed');
            }
        });

        // Handle special numpad key mapping
        if (code && code.startsWith('Numpad')) {
            const numpadElements = document.querySelectorAll(`[data-key="${code}"]`);
            numpadElements.forEach(element => {
                if (isPressed) {
                    element.classList.add('pressed');
                    if (!element.classList.contains('tested')) {
                        element.classList.add('tested');
                    }
                } else {
                    element.classList.remove('pressed');
                }
            });
        }
    }

    updateKeyStats(key, event) {
        // Letters (a-z)
        if (/^[a-z]$/.test(key)) {
            this.keyStats.letters.add(key);
        }
        // Numbers (0-9)
        else if (/^[0-9]$/.test(key)) {
            this.keyStats.numbers.add(key);
        }
        // Function keys (F1-F12)
        else if (/^F\d+$/.test(key)) {
            this.keyStats.functions.add(key);
        }
        // Numpad numbers
        else if (/^Numpad[0-9]$/.test(event.code)) {
            this.keyStats.numbers.add(event.code);
        }
        // Special keys (everything else)
        else {
            this.keyStats.special.add(key);
        }
        
        this.keyStats.workingKeys = this.testedKeys.size;
    }

    updateKeyInfo(event) {
        document.getElementById('last-key').textContent = event.key === ' ' ? 'Space' : event.key;
        document.getElementById('key-code').textContent = event.code;
        document.getElementById('key-location').textContent = this.getKeyLocation(event.location);
        document.getElementById('key-modifiers').textContent = this.getModifiers(event);
    }

    updateStats() {
        document.getElementById('keys-pressed').textContent = this.keyStats.totalPressed;
        document.getElementById('keys-working').textContent = this.keyStats.workingKeys;
        document.getElementById('typing-speed').textContent = Math.round(this.typingSpeed);
    }

    updateProgress() {
        // Letters progress (26 letters)
        const letterProgress = (this.keyStats.letters.size / 26) * 100;
        document.getElementById('letter-progress').style.width = letterProgress + '%';
        document.getElementById('letter-text').textContent = `${this.keyStats.letters.size}/26`;
        
        // Numbers progress (10 regular numbers + 10 numpad = 20 total)
        const totalNumbers = new Set([...this.keyStats.numbers]).size;
        const numberProgress = (totalNumbers / 20) * 100;
        document.getElementById('number-progress').style.width = numberProgress + '%';
        document.getElementById('number-text').textContent = `${totalNumbers}/20`;
        
        // Function keys progress (12 function keys)
        const functionProgress = (this.keyStats.functions.size / 12) * 100;
        document.getElementById('function-progress').style.width = functionProgress + '%';
        document.getElementById('function-text').textContent = `${this.keyStats.functions.size}/12`;
        
        // Special keys progress (estimated 30 common special keys)
        const specialProgress = Math.min((this.keyStats.special.size / 30) * 100, 100);
        document.getElementById('special-progress').style.width = specialProgress + '%';
        document.getElementById('special-text').textContent = `${this.keyStats.special.size}/30`;
    }

    getKeyLocation(location) {
        const locations = {
            0: 'Standard',
            1: 'Left',
            2: 'Right',
            3: 'Numpad'
        };
        return locations[location] || 'Unknown';
    }

    getModifiers(event) {
        const modifiers = [];
        if (event.ctrlKey) modifiers.push('Ctrl');
        if (event.altKey) modifiers.push('Alt');
        if (event.shiftKey) modifiers.push('Shift');
        if (event.metaKey) modifiers.push('Meta');
        return modifiers.length > 0 ? modifiers.join(' + ') : 'None';
    }

    updateTypingSpeed() {
        const currentTime = Date.now();
        const timeDiff = (currentTime - this.startTime) / 1000 / 60; // minutes
        const keyCount = this.keyStats.totalPressed;
        
        // Rough WPM calculation (assuming 5 characters per word)
        this.typingSpeed = timeDiff > 0 ? (keyCount / 5) / timeDiff : 0;
    }

    startSessionTimer() {
        this.sessionInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('session-time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    playKeySound() {
        if (!this.audioContext || this.audioContext.state === 'suspended') {
            return;
        }

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            console.warn('Sound playback error:', e);
        }
    }

    simulateKeyPress(keyCode) {
        let selector;
        if (keyCode === '\\\\') {
            selector = '[data-key="\\\\"]';
        } else {
            selector = `[data-key="${keyCode}"]`;
        }
        
        const keyElement = document.querySelector(selector);
        if (keyElement) {
            keyElement.classList.add('pressed');
            setTimeout(() => {
                keyElement.classList.remove('pressed');
            }, 150);
            
            // Add to tested keys
            this.testedKeys.add(keyCode);
            keyElement.classList.add('tested');
            
            if (this.soundEnabled) {
                this.playKeySound();
            }
            
            this.updateStats();
            this.updateProgress();
        }
    }

    testAllKeys() {
        const allKeys = document.querySelectorAll('.key[data-key]');
        let delay = 0;
        
        allKeys.forEach((keyElement, index) => {
            setTimeout(() => {
                const keyCode = keyElement.dataset.key;
                this.simulateKeyPress(keyCode);
                
                if (this.animationEnabled) {
                    keyElement.classList.add('highlight');
                    setTimeout(() => {
                        keyElement.classList.remove('highlight');
                    }, 300);
                }
                
                // Update stats for simulated keys
                this.keyStats.totalPressed++;
                this.testedKeys.add(keyCode);
                
                // Categorize the key
                if (/^[a-z]$/.test(keyCode)) {
                    this.keyStats.letters.add(keyCode);
                } else if (/^[0-9]$/.test(keyCode)) {
                    this.keyStats.numbers.add(keyCode);
                } else if (/^F\d+$/.test(keyCode)) {
                    this.keyStats.functions.add(keyCode);
                } else if (/^Numpad[0-9]$/.test(keyCode)) {
                    this.keyStats.numbers.add(keyCode);
                } else {
                    this.keyStats.special.add(keyCode);
                }
                
                this.keyStats.workingKeys = this.testedKeys.size;
                this.updateStats();
                this.updateProgress();
                
            }, delay);
            delay += 50; // 50ms delay between each key
        });
        
        // Show completion message
        setTimeout(() => {
            this.showNotification('Test Complete!', 'All keys have been tested successfully.');
        }, delay + 500);
    }

    reset() {
        this.pressedKeys.clear();
        this.testedKeys.clear();
        this.keyStats = {
            totalPressed: 0,
            workingKeys: 0,
            letters: new Set(),
            numbers: new Set(),
            functions: new Set(),
            special: new Set()
        };
        this.startTime = Date.now();
        this.typingSpeed = 0;
        this.keySequence = [];
        
        // Reset visual state
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('pressed', 'tested', 'highlight');
        });
        
        // Reset key info
        document.getElementById('last-key').textContent = '-';
        document.getElementById('key-code').textContent = '-';
        document.getElementById('key-location').textContent = '-';
        document.getElementById('key-modifiers').textContent = '-';
        
        this.updateStats();
        this.updateProgress();
    }

    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            testDuration: Math.round((Date.now() - this.startTime) / 1000),
            keyboardLayout: document.getElementById('layout-select').value,
            statistics: {
                totalKeysPressed: this.keyStats.totalPressed,
                uniqueKeysWorking: this.keyStats.workingKeys,
                lettersPressed: this.keyStats.letters.size,
                numbersPressed: [...this.keyStats.numbers].length,
                functionKeysPressed: this.keyStats.functions.size,
                specialKeysPressed: this.keyStats.special.size,
                averageWPM: Math.round(this.typingSpeed)
            },
            keyDetails: {
                letters: [...this.keyStats.letters].sort(),
                numbers: [...this.keyStats.numbers].sort(),
                functions: [...this.keyStats.functions].sort(),
                special: [...this.keyStats.special].sort()
            },
            keySequence: this.keySequence.slice(-50) // Last 50 keys
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keyboard-test-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Export Complete!', 'Your keyboard test report has been downloaded.');
    }

    saveSettings() {
        const settings = {
            soundEnabled: this.soundEnabled,
            animationEnabled: this.animationEnabled,
            layout: document.getElementById('layout-select').value
        };
        localStorage.setItem('keyboardTesterSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = localStorage.getItem('keyboardTesterSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.soundEnabled = parsed.soundEnabled ?? true;
            this.animationEnabled = parsed.animationEnabled ?? true;
            
            document.getElementById('sound-toggle').checked = this.soundEnabled;
            document.getElementById('animation-toggle').checked = this.animationEnabled;
            document.getElementById('layout-select').value = parsed.layout || 'qwerty';
        }
    }

    switchKeyboardLayout(layout) {
        // This would implement different keyboard layouts
        // For now, it's just a placeholder
        console.log(`Switched to ${layout} layout`);
    }

    showNotification(title, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 15px 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
            z-index: 10000;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the keyboard tester
let keyboardTester;
document.addEventListener('DOMContentLoaded', () => {
    keyboardTester = new KeyboardTester();
});

// Prevent context menu on right click for better UX
document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('key')) {
        e.preventDefault();
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+R for reset
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (keyboardTester) keyboardTester.reset();
    }
    
    // Ctrl+E for export
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (keyboardTester) keyboardTester.exportReport();
    }
    
    // Ctrl+T for test all
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        if (keyboardTester) keyboardTester.testAllKeys();
    }
});

// Language Manager
class LanguageManager {
    constructor() {
        this.currentLanguage = 'en';
        this.supportedLanguages = ['en', 'vi', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ru'];
        this.loadLanguage();
        this.createLanguageSelector();
    }

    loadLanguage() {
        const savedLang = localStorage.getItem('keyboardTesterLanguage');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
        }
        this.applyTranslations();
    }

    createLanguageSelector() {
        const selector = document.createElement('div');
        selector.className = 'language-selector';
        selector.innerHTML = `
            <button class="language-btn" id="language-toggle">
                <span class="flag">${LANGUAGES[this.currentLanguage].flag}</span>
                <span class="lang-code">${this.currentLanguage.toUpperCase()}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="language-dropdown" id="language-dropdown">
                <div class="dropdown-menu">
                    ${this.supportedLanguages.map(lang => `
                        <div class="language-option" data-lang="${lang}">
                            <span class="flag">${LANGUAGES[lang].flag}</span>
                            <span class="lang-name">${LANGUAGES[lang].name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Insert at the beginning of the app container
        const appContainer = document.querySelector('.app-container');
        appContainer.insertBefore(selector, appContainer.firstChild);

        // Add event listeners
        document.getElementById('language-toggle').addEventListener('click', () => {
            document.getElementById('language-dropdown').classList.toggle('show');
        });

        document.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                this.changeLanguage(lang);
                document.getElementById('language-dropdown').classList.remove('show');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-selector')) {
                document.getElementById('language-dropdown').classList.remove('show');
            }
        });
    }

    changeLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) return;
        
        this.currentLanguage = lang;
        localStorage.setItem('keyboardTesterLanguage', lang);
        
        // Update selector button
        const toggle = document.getElementById('language-toggle');
        toggle.innerHTML = `
            <span class="flag">${LANGUAGES[lang].flag}</span>
            <span class="lang-code">${lang.toUpperCase()}</span>
            <i class="fas fa-chevron-down"></i>
        `;
        
        this.applyTranslations();
    }

    applyTranslations() {
        const translations = LANGUAGES[this.currentLanguage].translations;
        
        // Apply translations to elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });
        
        // Apply translations to title attributes
        document.querySelectorAll('[data-translate-title]').forEach(element => {
            const key = element.getAttribute('data-translate-title');
            if (translations[key]) {
                element.title = translations[key];
            }
        });
        
        // Update document title
        if (translations.title) {
            document.title = translations.title;
        }
        
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;
        
        // Apply RTL for Arabic languages if needed
        if (['ar', 'he', 'fa'].includes(this.currentLanguage)) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }
}

// Initialize language manager
let languageManager;
document.addEventListener('DOMContentLoaded', () => {
    languageManager = new LanguageManager();
}); 