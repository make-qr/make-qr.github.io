/**
 * Template Loader
 * Loads header and footer templates with proper path resolution
 */
let ROOT_PATH = '';

document.addEventListener('DOMContentLoaded', function() {
    // Prevent recursive loading
    if (document.querySelector('[data-template-loaded="true"]')) {
        return;
    }
    document.documentElement.setAttribute('data-template-loaded', 'true');

    const isRootPage = window.location.pathname.split('/').filter(Boolean).length === 0 || 
                       window.location.pathname.endsWith('index.html') ||
                       window.location.pathname.endsWith('copy-code.html');
    
    // Set root path based on current page location
    ROOT_PATH = isRootPage ? '' : '../';
    
    // Get current page filename without extension
    const currentPath = window.location.pathname;
    const filename = currentPath.split('/').pop().split('.')[0];
    
    // Generate page title based on filename
    let pageTitle = '';
    if (filename === 'index' || filename === '') {
        pageTitle = 'QR Code Generator';
    } else if (filename === 'scan-qr') {
        pageTitle = 'QR Code Scanner';
    } else if (filename === 'compress-jpg') {
        pageTitle = 'JPG Compressor';
    } else if (filename === 'compress-png') {
        pageTitle = 'PNG Compressor';
    } else if (filename === 'convert-to-webp') {
        pageTitle = 'Convert to WebP';
    } else if (filename === 'webp-to-png') {
        pageTitle = 'Convert WebP to PNG';
    } else if (filename === 'merge-pdf') {
        pageTitle = 'PDF Merger';
    } else if (filename === 'copy-code') {
        pageTitle = 'Code Copy Tool';
    } else {
        pageTitle = filename.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    
    // Set canonical path
    const CANONICAL_PATH = isRootPage ? '' : (filename === 'index' ? '' : filename + '.html');
    
    // Get page-specific scripts and styles for later use
    const headContent = document.head.innerHTML;
    
    Promise.all([
        // Load header
        fetch(ROOT_PATH + 'assets/shared/header.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch header: ${response.status} ${response.statusText}`);
                }
                return response.text();
            }),
            
        // Load footer
        fetch(ROOT_PATH + 'assets/shared/footer.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch footer: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
    ])
    .then(([headerHtml, footerHtml]) => {
        // Process header
        headerHtml = headerHtml.replace(/\{\{ROOT_PATH\}\}/g, ROOT_PATH)
                        .replace(/\{\{PAGE_TITLE\}\}/g, pageTitle)
                        .replace(/\{\{CANONICAL_PATH\}\}/g, CANONICAL_PATH);
        
        // Extract custom head content
        const customHead = getCustomHeadContent(headContent);
        headerHtml = headerHtml.replace('{{CUSTOM_HEAD}}', customHead);
        
        // Insert header at the beginning of the body
        const headerContainer = document.createElement('div');
        headerContainer.innerHTML = headerHtml;
        
        // Get only the navigation part
        const navElement = headerContainer.querySelector('nav');
        
        if (navElement) {
            // Find where to insert the header
            const targetElement = document.body.firstChild;
            document.body.insertBefore(navElement, targetElement);
        }
        
        // Process footer
        footerHtml = footerHtml.replace(/\{\{ROOT_PATH\}\}/g, ROOT_PATH);
        
        // Extract custom scripts
        const scriptElements = document.querySelectorAll('script');
        let customScripts = '';
        
        // Get the last script element
        if (scriptElements.length > 0) {
            // Get scripts after the template-loader.js
            let foundTemplateLoader = false;
            for (let i = 0; i < scriptElements.length; i++) {
                const script = scriptElements[i];
                if (script.src && script.src.includes('template-loader.js')) {
                    foundTemplateLoader = true;
                } else if (foundTemplateLoader) {
                    customScripts += script.outerHTML + '\n';
                }
            }
        }
        
        footerHtml = footerHtml.replace('{{CUSTOM_SCRIPTS}}', customScripts);
        
        // Insert footer at the end of the body
        const mainElement = document.querySelector('main');
        
        if (mainElement) {
            const footerContainer = document.createElement('div');
            footerContainer.innerHTML = footerHtml;
            
            // Get all elements from the footer
            while (footerContainer.firstChild) {
                document.body.insertBefore(footerContainer.firstChild, null);
            }
        } else {
            // Append to the end of the body if main not found
            const footerContainer = document.createElement('div');
            footerContainer.innerHTML = footerHtml;
            document.body.appendChild(footerContainer);
        }
        
        // Initialize navigation.js functionality
        loadNavigationScript();
    })
    .catch(error => console.error('Error loading templates:', error));
});

/**
 * Extract custom head content from the original page
 */
function getCustomHeadContent(headContent) {
    const scripts = [];
    
    // Find scripts that are not template-loader.js
    const scriptMatches = headContent.match(/<script[^>]*src=[^>]*>(?:<\/script>)?/g) || [];
    scriptMatches.forEach(script => {
        if (script.indexOf('template-loader.js') === -1) {
            scripts.push(script);
        }
    });
    
    // Find inline scripts
    const inlineMatches = headContent.match(/<script(?! src)[^>]*>([\s\S]*?)<\/script>/g) || [];
    scripts.push(...inlineMatches);
    
    return scripts.join('\n');
}

/**
 * Initialize navigation functionality after templates are loaded
 */
function loadNavigationScript() {
    const script = document.createElement('script');
    script.src = ROOT_PATH + 'assets/js/navigation.js';
    script.onload = function() {
        // Let the navigation.js handle initialization via its own DOMContentLoaded event
    };
    document.body.appendChild(script);
} 