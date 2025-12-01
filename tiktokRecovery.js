

const API_BASE_URL = "http://localhost:5000"; // Ensure this matches your backend port

// --- S3 UPLOAD HELPER FUNCTION ---
async function uploadFileToS3(file, token) {
    if (!file) return null; // Handle null file gracefully

    // A. Get Pre-Signed URL
    const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;

    const signedUrlResponse = await fetch(generateUrlEndpoint, {
        method: "POST", // Use POST for generating the URL (convention)
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!signedUrlResponse.ok) {
        const err = await signedUrlResponse.json();
        throw new Error(err.message || "Server refused upload.");
    }

    const { signedUrl, fileUrl } = await signedUrlResponse.json();

    // B. Upload to AWS
    const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file ${file.name} to AWS S3.`);
    }

    return fileUrl; // Return the permanent URL
}

// --- CAPTCHA & UTILS ---
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

const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Conditional UI Logic from HTML
    document.querySelectorAll('input[name="emailReceived"]').forEach(el => {
        el.addEventListener('change', () => {
            document.getElementById('tiktokEmailProof').style.display = el.value === 'yes' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('input[name="twofa"]').forEach(el => {
        el.addEventListener('change', () => {
            document.getElementById('tiktok2fa').style.display = el.value === 'yes' ? 'block' : 'none';
        });
    });

    // Load initial captcha and attach reload listener
    if(reloadButton) reloadButton.addEventListener('click', loadCaptcha);
    loadCaptcha();

    // 2. Form Submission Logic
    const form = document.getElementById("tiktok-recovery-form");
    if (!form) return console.error("Form element not found.");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector(".submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading Files...";

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Please log in to submit this request.");

            // --- FILE UPLOAD SECTION ---
            
            // Mandatory File: Login Screenshot
            const loginScreenshotFile = form.querySelector('input[name="loginScreenshot"]').files[0];
            if (!loginScreenshotFile) throw new Error("Login Screenshot is required.");
            const loginScreenshotUrl = await uploadFileToS3(loginScreenshotFile, token);

            // Optional File: Email Proof
            const emailProofFile = form.querySelector('input[name="emailProof"]')?.files[0];
            const emailProofUrl = await uploadFileToS3(emailProofFile, token);

            // Optional File: ID Proof
            const idProofFile = form.querySelector('input[name="idProof"]')?.files[0];
            const idProofUrl = await uploadFileToS3(idProofFile, token);


            submitBtn.textContent = "Submitting Request...";
            
            // --- DATA PREPARATION (JSON Payload) ---

            const countryCode = form.querySelector('select[name="countryCode"]').value;
            const phoneNum = form.querySelector('input[name="phoneNumber"]').value;
            const fullPhoneNumber = `${countryCode} ${phoneNum}`;

            // Combine Checkboxes (twofaMethod & heardFrom)
            const twofaMethod = Array.from(form.querySelectorAll('input[name="twofaMethod"]:checked')).map(cb => cb.value);
            const heardFrom = Array.from(form.querySelectorAll('input[name="heardFrom"]:checked')).map(cb => cb.value);

            const payload = {
                // 1. Account Details
                username: form.querySelector('input[name="username"]').value,
                profileName: form.querySelector('input[name="profileName"]').value,
                registeredEmail: form.querySelector('input[name="registeredEmail"]').value,
                phoneNumber: fullPhoneNumber,
                country: form.querySelector('select[name="country"]').value,
                accountType: form.querySelector('select[name="accountType"]').value,
                followers: form.querySelector('input[name="followers"]').value,
                creationDate: form.querySelector('input[name="creationDate"]').value || null,
                banDate: form.querySelector('input[name="banDate"]').value,
                banReason: form.querySelector('textarea[name="banReason"]').value,

                // 2. Access & Proof (S3 URLs here)
                verified: form.querySelector('input[name="verified"]:checked')?.value,
                seeReason: form.querySelector('input[name="seeReason"]:checked')?.value,
                loginScreenshotUrl: loginScreenshotUrl, // S3 URL
                emailReceived: form.querySelector('input[name="emailReceived"]:checked')?.value,
                emailProofUrl: emailProofUrl, // S3 URL
                twofa: form.querySelector('input[name="twofa"]:checked')?.value,
                twofaMethod: twofaMethod.join(", "),
                idProofUrl: idProofUrl, // S3 URL

                // 3. Additional Details
                accVisibility: form.querySelector('input[name="accVisibility"]:checked')?.value,
                appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value,
                maxBudget: form.querySelector('input[name="maxBudget"]').value,
                heardFrom: heardFrom.join(", "),
                comments: form.querySelector('textarea[name="comments"]').value,
                
                // Meta
                terms: form.querySelector('input[name="terms"]').checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value
            };
            
            // 3. SEND TO BACKEND
            const response = await fetch(`${API_BASE_URL}/api/tiktok-recovery`, {
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

            alert("✅ Request Submitted Successfully! We will contact you shortly.");
            form.reset();
            // Reset conditional displays
            document.getElementById('tiktokEmailProof').style.display = 'none';
            document.getElementById('tiktok2fa').style.display = 'none';
            if (typeof loadCaptcha === 'function') loadCaptcha(); 

        } catch (error) {
            console.error(error);
            loadCaptcha()
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
