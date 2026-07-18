/**
 * Template Loader — loads shared header/footer with correct path depth
 */
let ROOT_PATH = '';

(function applyInitialTheme() {
    try {
        const savedTheme = localStorage.getItem('make-qr-theme');
        const useDark = savedTheme
            ? savedTheme === 'dark'
            : window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    'scan-qr': 'QR Code Scanner',
    'compress-jpg': 'JPG Compressor',
    'compress-png': 'PNG Compressor',
    'convert-to-webp': 'Convert to WebP',
    'webp-to-png': 'WebP to PNG',
    'merge-pdf': 'PDF Merger',
    'split-pdf': 'Split PDF',
    'rotate-pdf': 'Rotate PDF',
    'delete-pdf-pages': 'Delete PDF Pages',
    'extract-pdf-pages': 'Extract PDF Pages',
    'organize-pdf': 'Organize PDF',
    'microphone-test': 'Microphone Test',
    'webcam-test': 'Webcam Test',
    'speaker-test': 'Speaker Test',
    'mouse-test': 'Mouse Test',
    'dead-pixel-test': 'Dead Pixel Test',
    'controller-tester': 'Controller Test',
    'test-tools': 'Device Test Tools',
    'test-keyboard': 'Keyboard Tester Pro'
};

function getPageTitle(filename, currentPath) {
    if (filename === 'index' || filename === '') {
        if (currentPath.includes('test-tools')) return 'Device Test Tools';
        if (currentPath.includes('test-keyboard')) return 'Keyboard Tester Pro';
        return 'QR Code Generator';
    }
    if (PAGE_TITLES[filename]) return PAGE_TITLES[filename];
    return filename.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getCanonicalPath(isRootPage, filename, currentPath) {
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
        fetch(ROOT_PATH + 'assets/shared/header.html').then(r => {
            if (!r.ok) throw new Error('Failed to fetch header');
            return r.text();
        }),
        fetch(ROOT_PATH + 'assets/shared/footer.html').then(r => {
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
    script.src = ROOT_PATH + 'assets/js/navigation.js';
    script.setAttribute('data-nav-script', 'true');
    script.onload = function () {
        if (typeof initNavigation === 'function') initNavigation();
    };
    document.body.appendChild(script);
}

function loadSiteAppScript() {
    if (document.querySelector('script[data-site-app]')) return;
    const script = document.createElement('script');
    script.src = ROOT_PATH + 'assets/js/site-app.js?v=20260718-1';
    script.setAttribute('data-site-app', 'true');
    document.body.appendChild(script);
}
