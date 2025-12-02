const API_BASE_URL = "https://account-recovery-app.onrender.com/"; // Check your backend port


const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

// --- CAPTCHA & UTILS (Copied from previous example) ---
const captchaCodeDisplay = document.getElementById('captchaCodeDisplay');
const captchaTokenInput = document.getElementById('captchaToken');
const reloadButton = document.getElementById('reloadCaptchaBtn');

async function loadCaptcha() {
    if(!captchaCodeDisplay) return;
    captchaCodeDisplay.textContent = 'Loading...';
    try {
        const response = await fetch(`${API_BASE_URL}/api/captcha`);
        const data = await response.json();
        if (data.success) {
            captchaCodeDisplay.textContent = data.captchaCode;
            if(captchaTokenInput) captchaTokenInput.value = data.captchaId;
            const inp = document.getElementById('captcha_input');
            if(inp) inp.value = '';
        } else {
            captchaCodeDisplay.textContent = 'Error';
        }
    } catch (error) {
        console.error('Captcha Error:', error);
        captchaCodeDisplay.textContent = 'Net Error';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Load initial captcha and attach reload listener
    if(reloadButton) reloadButton.addEventListener('click', loadCaptcha);
    loadCaptcha();
    
    // Disable right-click for security (as requested in original script)
    document.addEventListener('contextmenu', (e) => e.preventDefault());


    const form = document.getElementById("ig-collab-form");
    if (!form) return console.error("Form element not found.");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector(".submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing Request...";

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Please log in to submit this request.");

            // Combine Checkboxes (collabType & heardFrom)
            const collabTypes = Array.from(form.querySelectorAll('input[name="collabType"]:checked')).map(cb => cb.value);
            const heardFromSources = Array.from(form.querySelectorAll('input[name="heardFrom"]:checked')).map(cb => cb.value);

            if (collabTypes.length === 0) {
                throw new Error("Please select at least one Type of Collaboration Requested.");
            }
            if (heardFromSources.length === 0) {
                throw new Error("Please select how you heard about us.");
            }

            // --- DATA PREPARATION (JSON Payload) ---
            const payload = {
                // 1. Account Details
                username: form.querySelector('input[name="username"]').value,
                profileUrl: form.querySelector('input[name="profileUrl"]').value,
                followerCount: form.querySelector('input[name="followerCount"]').value,
                niche: form.querySelector('select[name="niche"]').value,

                // 2. Collaboration Goals & Strategy
                collabType: collabTypes.join(" | "), // Store as pipe-separated string
                targetLocation: form.querySelector('input[name="targetLocation"]').value,
                maxBudget: form.querySelector('input[name="maxBudget"]').value,
                campaignDetails: form.querySelector('textarea[name="campaignDetails"]').value,

                // 3. Contact & Common Fields
                contactEmail: form.querySelector('input[name="contactEmail"]').value,
                purchasedBefore: form.querySelector('input[name="purchasedBefore"]:checked')?.value || "no",
                heardFrom: heardFromSources.join(" | "),
                
                // Meta
                terms: form.querySelector('input[name="terms"]').checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value
            };
            
            // 3. SEND TO BACKEND
            const response = await fetch(`${API_BASE_URL}/api/instagram-collaboration`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.message || json.error || "Submission failed");
            }

            alert("✅ Collaboration Request Submitted Successfully! We will review your details and be in touch.");
            form.reset();
            if (typeof loadCaptcha === 'function') loadCaptcha(); 

        } catch (error) {
            console.error(error);
            loadCaptcha();
            alert("❌ Error: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
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
