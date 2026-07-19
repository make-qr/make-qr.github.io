(function () {
    'use strict';

    const themeKey = 'make-qr-theme';
    const financeTools = new Set([
        'finance-calculator.html', 'mortgage-calculator.html', 'loan-calculator.html',
        'auto-loan-calculator.html', 'compound-interest-calculator.html',
        'investment-calculator.html', 'retirement-calculator.html',
        '401k-calculator.html', 'amortization-calculator.html',
        'mortgage-payoff-calculator.html', 'payment-calculator.html',
        'interest-calculator.html', 'inflation-calculator.html', 'tax-calculator.html',
        'salary-calculator.html', 'debt-calculator.html', 'credit-card-calculator.html',
        'currency-calculator.html'
    ]);
    const healthTools = new Set([
        'bmi-calculator.html', 'calorie-calculator.html', 'body-fat-calculator.html',
        'bmr-calculator.html', 'pregnancy-calculator.html',
        'pregnancy-weight-gain-calculator.html', 'target-heart-rate-calculator.html',
        'protein-calculator.html', 'ideal-weight-calculator.html',
        'macro-calculator.html', 'pace-calculator.html', 'water-calculator.html',
        'height-calculator.html'
    ]);

    function preferredTheme() {
        const saved = localStorage.getItem(themeKey);
        if (saved === 'dark' || saved === 'light') return saved;
        return 'light';
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        document.querySelectorAll('[data-calculator-theme]').forEach(button => {
            const dark = theme === 'dark';
            button.textContent = dark ? '☀' : '☾';
            button.setAttribute('aria-label', dark ? 'Use light mode' : 'Use dark mode');
            button.setAttribute('aria-pressed', String(dark));
        });
    }

    function addAccuracyNotice() {
        const filename = location.pathname.split('/').pop() || 'index.html';
        let message = '';

        if (filename === 'currency-calculator.html') {
            message = 'Reference only: this calculator uses built-in exchange rates, not live market data. Confirm the current rate before a transaction.';
        } else if (financeTools.has(filename)) {
            message = 'Estimate only: financial results depend on the values and assumptions entered. Verify important decisions with current official information or a qualified professional.';
        } else if (healthTools.has(filename)) {
            message = 'General information only: this result is not a medical diagnosis or a substitute for advice from a qualified healthcare professional.';
        }

        if (!message) return;
        const notice = document.createElement('aside');
        notice.className = 'makeqr-calculator-notice';
        notice.setAttribute('role', 'note');
        notice.textContent = message;
        const footer = document.querySelector('footer');
        (footer || document.body).insertAdjacentElement(footer ? 'beforebegin' : 'beforeend', notice);
    }

    applyTheme(preferredTheme());

    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(preferredTheme());
        document.querySelectorAll('[data-calculator-theme]').forEach(button => {
            button.addEventListener('click', function () {
                const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                localStorage.setItem(themeKey, next);
                applyTheme(next);
            });
        });
        addAccuracyNotice();
    });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', {scope: '/'})
                .catch(error => console.warn('Service worker registration failed:', error));
        });
    }
})();
