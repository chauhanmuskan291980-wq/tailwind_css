

const list = document.getElementById("platformList");
const scrollAmount = 325 + 30; // 349px

document.querySelector(".next").addEventListener("click", () => {
    list.scrollBy({ left: scrollAmount, behavior: "smooth" });
});

document.querySelector(".prev").addEventListener("click", () => {
    list.scrollBy({ left: -scrollAmount, behavior: "smooth" });
});


// JavaScript for mobile menu toggle and dropdown accordion
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

// 1. Toggle the mobile menu when the hamburger is clicked
hamburger.addEventListener("click", () => {
    navMenu.classList.toggle("active");
    // Toggle the icon (optional but nice)
    const icon = hamburger.querySelector('i');
    if (navMenu.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times'); // 'X' icon for close
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// 2. Mobile dropdown accordion logic
document.querySelectorAll(".dropdown-trigger > a").forEach(link => {
    // Check if the link has a dropdown menu associated with it
    const parentLi = link.closest('.dropdown-trigger');
    const dropdown = parentLi.querySelector('.dropdown-menu');

    if (dropdown) {
        link.addEventListener("click", (e) => {
            // Only activate accordion behavior on mobile screens (<= 768px)
            if (window.innerWidth <= 768) {
                e.preventDefault(); // Prevent navigating to '#'
                parentLi.classList.toggle("active");
            }
            // On desktop, default hover/click behavior allows navigation
        });
    }
});

// Optional: Close menu when a link is clicked on mobile
document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 768 && navMenu.classList.contains("active")) {
            // Check if it's not a dropdown trigger link itself (to avoid closing menu when opening accordion)
            if (!link.closest('.dropdown-trigger') || link.closest('.dropdown-menu')) {
                // Only close if it's an end link (within a dropdown or a standalone link)
                navMenu.classList.remove("active");
                hamburger.querySelector('i').classList.remove('fa-times');
                hamburger.querySelector('i').classList.add('fa-bars');
            }
        }
    });
});

document.addEventListener('click', (e) => {
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("navMenu");

    // Check if the menu is active AND
    // if the click target is NOT the hamburger button, AND
    // if the click target is NOT inside the navMenu itself.
    const isClickInsideMenu = navMenu.contains(e.target);
    const isClickOnHamburger = hamburger.contains(e.target);

    // 🎯 New Logic: Close menu if active and click is outside both the menu and the button
    if (navMenu.classList.contains('active') && !isClickInsideMenu && !isClickOnHamburger) {

        // 1. Close the menu
        navMenu.classList.remove('active');

        // 2. Reset the hamburger icon to 'bars'
        const icon = hamburger.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});



document.addEventListener('DOMContentLoaded', function () {

    // =========================================================
    // SECTION A: USER AUTHENTICATION & UI LOGIC 
    // =========================================================

    const token = localStorage.getItem("token");
    const username = localStorage.getItem("name");
    const loginContainer = document.getElementById("loginContainer");
    let userRole = null;
    let isAuthenticated = false; // New flag to track status

    if (token) {
        try {
            const decoded = jwt_decode(token); // Use jwt_decode (v3.1.2)

            // 1. CHECK FOR TOKEN EXPIRATION
            const currentTime = Date.now() / 1000; // Convert ms to seconds

            if (decoded.exp < currentTime) {
                console.warn("Token is expired. Clearing storage.");
                throw new Error("Token expired"); // Jump to catch block
            }

            // If not expired, authentication is successful
            userRole = decoded.role;
            isAuthenticated = true;

        } catch (error) {
            console.error("Authentication failed:", error.message || error);

            // If decoding fails OR token is expired, clear storage and proceed to render Login
            localStorage.removeItem("token");
            localStorage.removeItem("name");

            // Note: We avoid window.location.reload() here to let the Login UI render instantly.
        }
    }


    // --- CONDITIONAL RENDERING ---

    if (isAuthenticated) {
        // 2. RENDER THE LOGGED-IN USER UI (Admin check is nested here)

        let adminLinksHtml = '';

        if (userRole === "admin") {
            adminLinksHtml = `
            <hr style="margin: 5px 0;">
            <div class="admin-links">
                 <a href="createAdmin.html" class="admin-link" style="display: inline-block; margin-bottom: 15px;">
    <i class="fas fa-users"></i> Manage Users
</a>
            </div>
        `;
        }

        // Inject the User Menu HTML
        loginContainer.innerHTML = `
        <div class="user-menu" id="userMenu">
            <i class="fas fa-user-circle user-icon"></i>
            <div class="user-dropdown">
                <p>Welcome, <strong>${username}</strong></p>
                ${adminLinksHtml}
                <button id="logoutBtn">Logout</button>
            </div>
        </div>
    `;

        // 3. ATTACH EVENT LISTENERS (ONLY if logged in)
        const userMenu = document.getElementById("userMenu");
        userMenu.addEventListener("click", (event) => {
            event.stopPropagation();
            userMenu.classList.toggle("active");
        });

        document.getElementById("logoutBtn").addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("name");
            window.location.reload();
        });

    } else {
        // 4. RENDER THE LOGIN BUTTON (No token, Invalid token, or Expired token)
        loginContainer.innerHTML = `
        <button class="login-btn"><a href="login.html">Login</a></button>
    `;
    }

    // ---------------------------------------------------------
    // SECTION B: SCROLL TO CARD LOGIC (UNMODIFIED)
    // ---------------------------------------------------------

    const scrollToCardLinks = document.querySelectorAll('.dropdown-menu .scroll-to-card');
    const SCROLL_PAUSE_DURATION = 3000;
    const smListContainer = document.querySelector('.SM-list');

    scrollToCardLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                if (smListContainer) {
                    smListContainer.classList.add('animation-paused');
                }

                targetElement.classList.add('highlight-card');

                setTimeout(() => {
                    targetElement.classList.remove('highlight-card');
                }, 2000);

                setTimeout(() => {
                    if (smListContainer) {
                        smListContainer.classList.remove('animation-paused');
                    }
                }, SCROLL_PAUSE_DURATION);
            }
        });
    });

    // --- END OF DOMContentLoaded ---
});




// document.addEventListener('contextmenu', function(e) {
//       e.preventDefault();
//   });

   
   document.addEventListener("keydown", function(e) {

    // Block Ctrl+C, V, X
    if (e.ctrlKey && ["c", "v", "x"].includes(e.key.toLowerCase())) {
        alert("Copy, paste and cut are disabled!");
        e.preventDefault();
    }

    // Block Ctrl+U (view source)
    if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
    }

    // Block Ctrl+S (save)
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
    }

    // Block DevTools (Ctrl+Shift+I)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
    }

    // Block F12
    if (e.key === "F12") {
        e.preventDefault();
    }
});

