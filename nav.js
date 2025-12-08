// Mobile hamburger menu toggle
(function() {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW registered:', registration.scope);
                })
                .catch((error) => {
                    console.log('SW registration failed:', error);
                });
        });
    }

    function initNav() {
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('nav-links');
        
        // Mobile nav elements
        const mobileDivider = document.getElementById('mobile-divider');
        const mobileUserInfo = document.getElementById('mobile-user-info');
        const mobileUserAvatar = document.getElementById('mobile-user-avatar');
        const mobileUserName = document.getElementById('mobile-user-name');
        const mobileSettings = document.getElementById('mobile-settings');
        const mobileLogout = document.getElementById('mobile-logout');
        const mobileLogin = document.getElementById('mobile-login');
        
        if (!hamburger) {
            console.log('Hamburger not found');
            return;
        }
        
        console.log('Nav.js: Hamburger menu initialized');
        
        // Function to update mobile nav based on login state
        window.updateMobileNav = function(isLoggedIn, user) {
            if (isLoggedIn && user) {
                // Show logged-in items
                if (mobileDivider) mobileDivider.classList.add('visible');
                if (mobileUserInfo) {
                    mobileUserInfo.classList.add('visible');
                    if (mobileUserAvatar) mobileUserAvatar.src = user.avatar;
                    if (mobileUserName) mobileUserName.textContent = user.username;
                }
                if (mobileSettings) mobileSettings.classList.add('visible');
                if (mobileLogout) mobileLogout.classList.add('visible');
                if (mobileLogin) mobileLogin.classList.remove('visible');
            } else {
                // Show login button
                if (mobileDivider) mobileDivider.classList.add('visible');
                if (mobileUserInfo) mobileUserInfo.classList.remove('visible');
                if (mobileSettings) mobileSettings.classList.remove('visible');
                if (mobileLogout) mobileLogout.classList.remove('visible');
                if (mobileLogin) mobileLogin.classList.add('visible');
            }
        };
        
        // Handle mobile login click
        if (mobileLogin) {
            mobileLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.packBotAPI) {
                    window.packBotAPI.login();
                }
            });
        }
        
        // Handle mobile logout click
        if (mobileLogout) {
            mobileLogout.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.packBotAPI) {
                    window.packBotAPI.logout();
                }
            });
        }
        
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hamburger.classList.toggle('active');
            if (navLinks) navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking a link
        if (navLinks) {
            navLinks.querySelectorAll('.nav-link, .mobile-nav-item, .mobile-login-btn').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const isHamburger = hamburger.contains(e.target);
            const isNavLinks = navLinks && navLinks.contains(e.target);
            
            if (!isHamburger && !isNavLinks) {
                hamburger.classList.remove('active');
                if (navLinks) navLinks.classList.remove('active');
            }
        });

        // Handle responsive text logo swap
        const textLogo = document.querySelector('img.text');
        if (textLogo) {
            function updateTextLogo() {
                const isMobile = window.innerWidth <= 768;
                // Use cache-busted URLs
                const newSrc = isMobile ? '/img/text-centred.svg' : '/img/text.svg';
                textLogo.setAttribute('src', newSrc);
            }
            
            // Initial update
            updateTextLogo();
            window.addEventListener('resize', updateTextLogo);
            
            // Also update on load in case image wasn't ready
            window.addEventListener('load', updateTextLogo);
            
            // Force update after a short delay for mobile browsers
            setTimeout(updateTextLogo, 100);
        }
        // Note: Text logo may not exist on all pages (e.g., dashboard) - this is fine
    }
    
    // Run on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();
