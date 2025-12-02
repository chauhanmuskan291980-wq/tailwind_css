 const API_BASE_URL = "https://account-recovery-app.onrender.com/";

 const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const token = localStorage.getItem("token");

    // --- 1. Conditional UI Logic ---
    // Account Type -> Business Fields
    document.querySelectorAll('input[name="accountType"]').forEach(el => {
        el.addEventListener('change', () => {
            document.getElementById('businessFields').style.display = el.value === 'business' ? 'block' : 'none';
        });
    });

    // Verified -> Meta Type
    document.querySelectorAll('input[name="verified"]').forEach(el => {
        el.addEventListener('change', () => {
            document.getElementById('metaType').style.display = el.value === 'yes' ? 'block' : 'none';
        });
    });

    // Email Received -> Proof Upload
    document.querySelectorAll('input[name="emailReceived"]').forEach(el => {
        el.addEventListener('change', () => {
            document.getElementById('emailProof').style.display = el.value === 'yes' ? 'block' : 'none';
        });
    });

    // --- 2. Captcha Logic ---
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
                if (captchaTokenInput) captchaTokenInput.value = data.captchaId;
                const input = document.getElementById('captcha_input');
                if (input) input.value = '';
            } else {
                captchaCodeDisplay.textContent = 'Error';
            }
        } catch (error) {
            console.error('Captcha Error:', error);
            captchaCodeDisplay.textContent = 'Net Error';
        }
    }
    if (reloadButton) reloadButton.addEventListener('click', loadCaptcha);
    loadCaptcha();

    // --- 3. Main Submission Logic ---
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();

            const submitBtn = form.querySelector(".submit-btn");
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "Uploading Files...";

            try {
                if (!token) throw new Error("Please log in to submit this request.");

                // --- FILE UPLOADS ---
                
                // A. Login Screenshot (Mandatory)
                const screenshotInput = form.querySelector('input[name="screenshot"]');
                let screenshotUrl = null;
                if (screenshotInput.files.length > 0) {
                    screenshotUrl = await uploadFileToS3(screenshotInput.files[0], token);
                } else {
                    throw new Error("Login Screenshot is required.");
                }

                // B. Email Proof (Optional)
                const emailProofInput = form.querySelector('input[name="emailProof"]');
                let emailProofUrl = null;
                if (emailProofInput && emailProofInput.files.length > 0) {
                    emailProofUrl = await uploadFileToS3(emailProofInput.files[0], token);
                }

                // C. Business Document (Optional)
                const businessDocInput = form.querySelector('input[name="businessDoc"]');
                let businessDocUrl = null;
                if (businessDocInput && businessDocInput.files.length > 0) {
                    businessDocUrl = await uploadFileToS3(businessDocInput.files[0], token);
                }

                submitBtn.innerText = "Submitting Form...";

                // --- DATA PREPARATION ---
                const countryCode = form.querySelector('select[name="countryCode"]').value;
                const phoneNum = form.querySelector('input[name="phoneNumber"]').value;

                // Collect Checkboxes
                const heardFromChecks = form.querySelectorAll('input[name="heardFrom"]:checked');
                const heardFromValues = Array.from(heardFromChecks).map(cb => cb.value);

                const payload = {
                    accountType: form.querySelector('input[name="accountType"]:checked')?.value,
                    
                    // Business specific
                    businessName: form.querySelector('input[name="businessName"]').value,
                    verified: form.querySelector('input[name="verified"]:checked')?.value,
                    metaType: form.querySelector('input[name="metaType"]:checked')?.value,
                    businessDocUrl: businessDocUrl, // S3 URL

                    // Contact
                    fullPhoneNumber: `${countryCode} ${phoneNum}`,
                    email: form.querySelector('input[name="email"]').value,
                    
                    // Ban Info
                    dateOfBan: form.querySelector('input[name="dateOfBan"]').value,
                    screenshotUrl: screenshotUrl, // S3 URL
                    emailReceived: form.querySelector('input[name="emailReceived"]:checked')?.value === "yes",
                    emailProofUrl: emailProofUrl, // S3 URL

                    // Other
                    maxBudget: form.querySelector('input[name="maxBudget"]').value,
                    submittedBefore: form.querySelector('input[name="submittedBefore"]:checked')?.value,
                    comments: form.querySelector('textarea[name="comments"]').value,
                    heardFrom: heardFromValues,
                    
                    terms: form.querySelector('input[name="terms"]').checked,
                    userCaptchAnswer: document.getElementById("captcha_input").value,
                    captchaId: document.getElementById("captchaToken").value
                };

                // --- SEND TO BACKEND ---
                const response = await fetch(`${API_BASE_URL}/api/whatapp-recovery`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(payload),
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ' + (result.message || 'Form submitted successfully!'));
                    form.reset();
                    // Hide conditional sections
                    document.getElementById('businessFields').style.display = 'none';
                    document.getElementById('emailProof').style.display = 'none';
                    loadCaptcha();
                } else {
                    loadCaptcha();
                    throw new Error(result.message || 'Failed to submit form.');
                }


            } catch (error) {
                console.error('Submission Error:', error);
                alert('❌ Error: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }
});

// --- S3 Upload Helper ---
async function uploadFileToS3(file, token) {
    // Using Query Params to prevent Body Parsing issues
    const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;
    
    const urlResponse = await fetch(generateUrlEndpoint, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!urlResponse.ok) {
        const err = await urlResponse.json();
        throw new Error(err.message || "Server refused upload.");
    }

    const { signedUrl, fileUrl } = await urlResponse.json();

    const s3Response = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
    });

    if (!s3Response.ok) throw new Error("Failed to upload file to AWS S3.");

    return fileUrl;
}

document.addEventListener('contextmenu', e => e.preventDefault());
 
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
