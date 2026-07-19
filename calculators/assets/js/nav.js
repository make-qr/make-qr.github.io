// Shared mobile navigation for all pages
document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (!mobileMenuToggle || !navMenu) return;

    function openMenu() {
        navMenu.style.display = 'flex';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '100%';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.background = 'white';
        navMenu.style.flexDirection = 'column';
        navMenu.style.padding = '1rem';
        navMenu.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        navMenu.style.borderRadius = '0 0 10px 10px';
        navMenu.style.zIndex = '1001';
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        navMenu.style.display = 'none';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
    }

    function resetDesktopMenu() {
        navMenu.style.display = '';
        navMenu.style.position = '';
        navMenu.style.top = '';
        navMenu.style.left = '';
        navMenu.style.right = '';
        navMenu.style.background = '';
        navMenu.style.flexDirection = '';
        navMenu.style.padding = '';
        navMenu.style.boxShadow = '';
        navMenu.style.borderRadius = '';
        navMenu.style.zIndex = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
    }

    mobileMenuToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (navMenu.style.display === 'flex') {
            closeMenu();
        } else {
            openMenu();
        }
    });

    document.addEventListener('click', function (event) {
        if (!mobileMenuToggle.contains(event.target) && !navMenu.contains(event.target)) {
            closeMenu();
        }
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            resetDesktopMenu();
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.length <= 1) return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });
});
