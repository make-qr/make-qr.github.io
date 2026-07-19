/**
 * Navigation scripts for Make QR
 */
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            mobileMenu.classList.toggle('hidden');
            const isExpanded = mobileMenu.classList.contains('hidden') ? 'false' : 'true';
            mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
        });
    }
}

function initNavDropdowns() {
    document.querySelectorAll('.nav-dropdown-btn').forEach(btn => {
        btn.setAttribute('type', 'button');
    });

    document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
        const btn = dropdown.querySelector('.nav-dropdown-btn');
        if (!btn) return;
        let closeTimer;

        function setOpen(open) {
            dropdown.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', String(open));
        }

        dropdown.addEventListener('mouseenter', function () {
            clearTimeout(closeTimer);
            setOpen(true);
        });

        dropdown.addEventListener('mouseleave', function () {
            clearTimeout(closeTimer);
            closeTimer = setTimeout(() => setOpen(false), 180);
        });

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const wasOpen = dropdown.classList.contains('is-open');
            closeAllDropdowns();
            if (!wasOpen) setOpen(true);
        });
    });

    document.addEventListener('click', closeAllDropdowns);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAllDropdowns();
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.nav-dropdown.is-open').forEach(dropdown => {
        dropdown.classList.remove('is-open');
        const btn = dropdown.querySelector('.nav-dropdown-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    });
}

function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn[data-target]');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabButtons.length === 0 || tabContents.length === 0) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;

            tabButtons.forEach(btn => btn.classList.remove('bg-blue-600', 'text-white'));
            tabContents.forEach(content => content.classList.remove('active'));

            this.classList.add('bg-blue-600', 'text-white');
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
        });
    });
}

function updateCopyrightYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

function initNavigation() {
    if (initNavigation.initialized) return;
    initNavigation.initialized = true;
    initMobileMenu();
    initNavDropdowns();
    initTabNavigation();
    updateCopyrightYear();
}
initNavigation.initialized = false;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}
