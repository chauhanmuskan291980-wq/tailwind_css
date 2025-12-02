const form = document.getElementById('whatsappForm');

const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // ADD CAPTCHA VALUES
    data.captchaId = document.getElementById('captchaToken').value;
    data.userCaptchAnswer = document.getElementById('captcha_input').value;

    const token = localStorage.getItem("token");

    try {
        const response = await fetch('https://account-recovery-app.onrender.com/api/whatsapp-marketing', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (response.ok) {
            alert('Form submitted successfully!');
            form.reset();
            loadCaptcha();
        } else {
            alert(result.message || 'Submission failed. Try again.');
            loadCaptcha();
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again later.');
        loadCaptcha();
    }
});


const captchaCodeDisplay = document.getElementById('captchaCodeDisplay');
const captchaTokenInput = document.getElementById('captchaToken');
const reloadButton = document.getElementById('reloadCaptchaBtn');
async function loadCaptcha() {
    captchaCodeDisplay.textContent = 'Loading...';

    try {
        const response = await fetch(`https://account-recovery-app.onrender.com/api/captcha`);
        const data = await response.json();

        if (data.success) {
            // Display the actual code (WARNING: Insecure, as discussed)
            captchaCodeDisplay.textContent = data.captchaCode;
            captchaTokenInput.value = data.captchaId;
            document.getElementById('captcha_input').value = '';
        } else {
            captchaCodeDisplay.textContent = 'Error';
            alert('Failed to load CAPTCHA.');
        }
    } catch (error) {
        console.error('Error loading CAPTCHA:', error);
        captchaCodeDisplay.textContent = 'Network Error';
    }

}

// Attach to button and run on page load
reloadButton.addEventListener('click', loadCaptcha);
loadCaptcha();


document.addEventListener("keydown", function (e) {

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


