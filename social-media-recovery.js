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


document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("name");

  const loginContainer = document.getElementById("loginContainer");

  if (token) {
    // Replace Login button with user UI
    loginContainer.innerHTML = `
      <div class="user-menu" id="userMenu">
        <i class="fas fa-user-circle user-icon"></i>
        <div class="user-dropdown">
          <p>${username}</p>
          <button id="logoutBtn">Logout</button>
        </div>
      </div>
    `;

    // Dropdown toggle
    const userMenu = document.getElementById("userMenu");
    userMenu.addEventListener("click", () => {
      userMenu.classList.toggle("active");
    });

    // Logout button
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("name");
      window.location.reload();
    });
  }
})

document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
  });

   
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
