/**
 * Template Loader — loads shared header/footer with correct path depth
 */
let ROOT_PATH = '';

(function applyInitialTheme() {
    try {
        const savedTheme = localStorage.getItem('make-qr-theme');
        const useDark = savedTheme === 'dark';
        document.documentElement.dataset.theme = useDark ? 'dark' : 'light';
        document.documentElement.style.colorScheme = useDark ? 'dark' : 'light';
    } catch (error) {
        document.documentElement.dataset.theme = 'light';
    }
})();

function computeRootPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length && /\.[a-z0-9]+$/i.test(parts[parts.length - 1])) {
        parts.pop();
    }
    return parts.length === 0 ? '' : '../'.repeat(parts.length);
}

const PAGE_TITLES = {
    'scan-qr': "QR Code Scanner",
    'compress-jpg': "JPG Compressor",
    'compress-png': "PNG Compressor",
    'convert-to-webp': "Convert to WebP",
    'webp-to-png': "WebP to PNG",
    'merge-pdf': "PDF Merger",
    'split-pdf': "Split PDF",
    'rotate-pdf': "Rotate PDF",
    'delete-pdf-pages': "Delete PDF Pages",
    'extract-pdf-pages': "Extract selected PDF pages into a new file",
    'organize-pdf': "Organize PDF",
    'microphone-test': "Microphone Test",
    'webcam-test': "Webcam Test",
    'speaker-test': "Speaker Test",
    'mouse-test': "Mouse Test",
    'dead-pixel-test': "Dead Pixel Test",
    'controller-tester': "Controller Test",
    'test-tools': "Device Test Tools",
    'test-keyboard': "Keyboard Tester Pro",
    'how-to-create-wifi-qr-code': "How to create a WiFi QR code guests can scan in seconds",
    'static-vs-dynamic-qr-codes': "Static vs dynamic QR codes",
    'merge-pdf-without-signup': "Merge PDF files in your browser without signup",
    'how-to-scan-qr-code-on-pc': "How to scan a QR code on PC (camera, paste, upload)",
    'how-to-make-qr-code-with-logo': "How to make a QR code with a logo that still scans",
    'best-qr-code-size-for-print': "Best QR code size for print (business card, A4, poster)",
    'how-to-create-vcard-qr-code': "How to create a vCard QR code for business cards",
    'how-to-split-pdf': "Split a PDF into separate files (step-by-step)",
    'compress-jpg-without-ruining-quality': "Compress JPG without ruining quality",
    'convert-images-to-webp': "Convert images to WebP for faster websites",
    'how-to-test-microphone-in-browser': "How to test your microphone in the browser",
    'how-to-rotate-pdf-pages': "How to rotate PDF pages that scanned sideways",
    'delete-pdf-pages-without-acrobat': "Delete pages from a PDF without Acrobat",
    'reorder-pdf-pages': "Reorder PDF pages before you send a contract",
    'png-vs-jpg-vs-webp': "PNG vs JPG vs WebP: which format should you use?",
    'how-to-create-email-sms-qr-code': "How to create an email or SMS QR code",
    'qr-code-color-mistakes': "QR code color mistakes that break scanning",
    'keyboard-test-checklist': "Keyboard test checklist before buying a used laptop",
    'percentage-calculator-discounts-tips': "How to use a percentage calculator for discounts and tips",
    'loan-mortgage-payment-calculator': "Mortgage and loan payments explained with a free calculator",
    'bmi-calculator-meaning': "BMI calculator",
    'scientific-calculator-deg-rad-tips': "Scientific calculator online",
    'device-checks-before-meeting': "Webcam, speaker and dead-pixel checks before a meeting",
};
};

function getPageTitle(filename, currentPath) {
    if (currentPath.includes('/blog')) {
        if (filename === 'index' || filename === '') return 'Guides';
        if (PAGE_TITLES[filename]) return PAGE_TITLES[filename];
        return filename.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    if (filename === 'index' || filename === '') {
        if (currentPath.includes('test-tools')) return 'Device Test Tools';
        if (currentPath.includes('test-keyboard')) return 'Keyboard Tester Pro';
        return 'QR Code Generator';
    }
    if (PAGE_TITLES[filename]) return PAGE_TITLES[filename];
    return filename.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getCanonicalPath(isRootPage, filename, currentPath) {
    if (currentPath.includes('/blog')) {
        return (filename === 'index' || filename === '') ? 'blog/' : 'blog/' + filename + '.html';
    }
    if (isRootPage && (filename === 'index' || filename === '')) return '';
    if (currentPath.includes('test-keyboard')) return 'pages/test-keyboard/';
    if (currentPath.includes('test-tools')) {
        return filename === 'index' ? 'pages/test-tools/' : 'pages/test-tools/' + filename + '.html';
    }
    return filename === 'index' ? '' : 'pages/' + filename + '.html';
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.documentElement.getAttribute('data-template-loaded') === 'true') return;
    document.documentElement.setAttribute('data-template-loaded', 'true');

    ROOT_PATH = computeRootPath();
    const currentPath = window.location.pathname;
    const filename = currentPath.split('/').pop().split('.')[0];
    const isRootPage = ROOT_PATH === '';
    const pageTitle = getPageTitle(filename, currentPath);
    const canonicalPath = getCanonicalPath(isRootPage, filename, currentPath);
    const headContent = document.head.innerHTML;

    Promise.all([
        fetch(ROOT_PATH + 'assets/shared/header.html?v=20260724-1').then(r => {
            if (!r.ok) throw new Error('Failed to fetch header');
            return r.text();
        }),
        fetch(ROOT_PATH + 'assets/shared/footer.html?v=20260724-1').then(r => {
            if (!r.ok) throw new Error('Failed to fetch footer');
            return r.text();
        })
    ])
    .then(([headerHtml, footerHtml]) => {
        headerHtml = headerHtml
            .replace(/\{\{ROOT_PATH\}\}/g, ROOT_PATH)
            .replace(/\{\{PAGE_TITLE\}\}/g, pageTitle)
            .replace(/\{\{CANONICAL_PATH\}\}/g, canonicalPath)
            .replace('{{CUSTOM_HEAD}}', getCustomHeadContent(headContent));

        const headerContainer = document.createElement('div');
        headerContainer.innerHTML = headerHtml;
        const navElement = headerContainer.querySelector('nav');
        if (navElement) {
            document.body.insertBefore(navElement, document.body.firstChild);
        }

        footerHtml = footerHtml.replace(/\{\{ROOT_PATH\}\}/g, ROOT_PATH);
        footerHtml = footerHtml.replace('{{CUSTOM_SCRIPTS}}', getCustomScripts());

        const footerContainer = document.createElement('div');
        footerContainer.innerHTML = footerHtml;
        while (footerContainer.firstChild) {
            document.body.appendChild(footerContainer.firstChild);
        }

        loadNavigationScript();
        loadSiteAppScript();
        document.dispatchEvent(new CustomEvent('templatesLoaded'));
    })
    .catch(error => console.error('Error loading templates:', error));
});

function getCustomHeadContent(headContent) {
    const scripts = [];
    const scriptMatches = headContent.match(/<script[^>]*src=[^>]*>(?:<\/script>)?/g) || [];
    scriptMatches.forEach(script => {
        if (script.indexOf('template-loader.js') === -1) scripts.push(script);
    });
    const inlineMatches = headContent.match(/<script(?! src)[^>]*>([\s\S]*?)<\/script>/g) || [];
    scripts.push(...inlineMatches);
    return scripts.join('\n');
}

function getCustomScripts() {
    let customScripts = '';
    let foundTemplateLoader = false;
    document.querySelectorAll('script').forEach(script => {
        if (script.src && script.src.includes('template-loader.js')) {
            foundTemplateLoader = true;
        } else if (foundTemplateLoader) {
            customScripts += script.outerHTML + '\n';
        }
    });
    return customScripts;
}

function loadNavigationScript() {
    if (document.querySelector('script[data-nav-script]')) return;
    const script = document.createElement('script');
    script.src = ROOT_PATH + 'assets/js/navigation.js?v=20260719-2';
    script.setAttribute('data-nav-script', 'true');
    script.onload = function () {
        if (typeof initNavigation === 'function') initNavigation();
    };
    document.body.appendChild(script);
}

function loadSiteAppScript() {
    if (document.querySelector('script[data-site-app]')) return;
    const script = document.createElement('script');
    script.src = ROOT_PATH + 'assets/js/site-app.js?v=20260719-1';
    script.setAttribute('data-site-app', 'true');
    document.body.appendChild(script);
}
