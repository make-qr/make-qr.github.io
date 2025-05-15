/**
 * Navigation scripts for Document Tools
 * Handles mobile menu toggle and tab navigation
 */
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    initMobileMenu();
    
    // Tab Navigation
    initTabNavigation();
    
    // Update copyright year
    updateCopyrightYear();
});

/**
 * Initialize mobile menu functionality
 */
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            
            // Update aria-expanded attribute for accessibility
            const isExpanded = mobileMenu.classList.contains('hidden') ? 'false' : 'true';
            mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
        });
    }
}

/**
 * Initialize tab navigation if it exists on the page
 */
function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabButtons.length > 0 && tabContents.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('bg-blue-600', 'text-white'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to current button and content
                this.classList.add('bg-blue-600', 'text-white');
                document.getElementById(targetId).classList.add('active');
            });
        });
    }
}

/**
 * Update the copyright year in the footer to the current year
 */
function updateCopyrightYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
} 