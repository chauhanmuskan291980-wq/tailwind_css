const API_BASE_URL = "https://account-recovery-app.onrender.com/"; 

const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    if (!form) return;

    // 1. Handle Platform URL Param (Visual Logic)
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");

    if (platform) {
        const formatted = platform.charAt(0).toUpperCase() + platform.slice(1);
        const heading = document.querySelector("main h2");
        if (heading) heading.innerText = `${formatted} Username Claim Request`;

        const input = document.getElementById("platformInput");
        if (input) {
            input.value = formatted;
            input.readOnly = true;
            input.style.backgroundColor = "#111"; 
            input.style.cursor = "not-allowed";
        }
        document.body.classList.add(platform.toLowerCase());
    }

    // 2. Form Submission Logic
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector(".submit-btn");
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = "Uploading Files...";

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Please log in to submit this request.");

            // --- STEP 1: UPLOAD FILE TO S3 ---
            const fileInput = form.querySelector('input[name="proofFile"]');
            let proofFileKey = null;

            // Check if file is selected
            if (fileInput.files.length > 0) {
                proofFileKey = await uploadFileToS3(fileInput.files[0], token);
            } 

            submitBtn.innerText = "Submitting Request...";

            // --- STEP 2: PREPARE JSON DATA ---
            
            // Handle "Ref" Checkboxes (Convert to Array)
            const refCheckboxes = form.querySelectorAll('input[name="ref"]:checked');
            const refValues = Array.from(refCheckboxes).map(cb => cb.value);

            // Construct the JSON Payload
            const payload = {
                platformInput: form.querySelector('input[name="platformInput"]').value,
                desiredUsername: form.querySelector('input[name="desiredUsername"]').value,
                usernameStatus: form.querySelector('select[name="usernameStatus"]').value,
                existingProfile: form.querySelector('input[name="existingProfile"]').value,
                brandName: form.querySelector('input[name="brandName"]').value,
                
                // The S3 Key we got from Step 1
                proofFile: proofFileKey,

                contactEmail: form.querySelector('input[name="contactEmail"]').value,
                maxBudget: form.querySelector('input[name="maxBudget"]').value,
                message: form.querySelector('textarea[name="message"]').value,
                
                appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value,
                ref: refValues,
                terms: form.querySelector('input[name="terms"]').checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value, 
            };

            // --- STEP 3: SEND TO BACKEND ---
            const response = await fetch(`${API_BASE_URL}/api/username-claim`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Submission failed");
            }

            alert("✅ " + (result.message || "Request Submitted Successfully!"));
            form.reset();
            if (typeof loadCaptcha === 'function') loadCaptcha();

        } catch (error) {
            console.error("Submission Error:", error);
            loadCaptcha();
            alert("❌ Error: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    });
});

 
async function uploadFileToS3(file, token) {
    const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;

    const signedUrlResponse = await fetch(generateUrlEndpoint, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!signedUrlResponse.ok) {
        const txt = await signedUrlResponse.text();
        throw new Error(`Server Refused Upload: ${txt}`);
    }

    const { signedUrl, fileUrl } = await signedUrlResponse.json();

    const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
    });

    if (!uploadResponse.ok) throw new Error("Failed to upload file to AWS S3.");

    return fileUrl;
}

// --- CAPTCHA LOGIC ---
const captchaCodeDisplay = document.getElementById('captchaCodeDisplay');
const captchaTokenInput = document.getElementById('captchaToken');
const reloadButton = document.getElementById('reloadCaptchaBtn');

async function loadCaptcha() {
    if (!captchaCodeDisplay) return;
    captchaCodeDisplay.textContent = 'Loading...';
    try {
        const response = await fetch(`${API_BASE_URL}/api/captcha`);
        const data = await response.json();
        if (data.success) {
            captchaCodeDisplay.textContent = data.captchaCode;
            if(captchaTokenInput) captchaTokenInput.value = data.captchaId;
            const input = document.getElementById('captcha_input');
            if(input) input.value = '';
        } else {
            captchaCodeDisplay.textContent = 'Error';
        }
    } catch (error) {
        console.error('Error loading CAPTCHA:', error);
        captchaCodeDisplay.textContent = 'Net Error';
    }
}
if (reloadButton) reloadButton.addEventListener('click', loadCaptcha);
loadCaptcha();

 
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
