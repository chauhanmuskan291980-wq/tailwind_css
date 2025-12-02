 const API_BASE_URL = "https://account-recovery-app.onrender.com/";
const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("snapchatRecoveryForm");

    // --- A. HANDLE CONDITIONAL DISPLAY LOGIC ---
    const emailRadios = document.getElementsByName("emailReceived");
    const emailProofSection = document.getElementById("snapEmailProof");

    const twoFaRadios = document.getElementsByName("twofa");
    const twoFaSection = document.getElementById("snap2fa");

    // Toggle Email Proof Upload
    emailRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            if (radio.value === "yes") {
                emailProofSection.style.display = "block";
            } else {
                emailProofSection.style.display = "none";
            }
        });
    });

    // Toggle 2FA Options
    twoFaRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            if (radio.value === "yes") {
                twoFaSection.style.display = "block";
            } else {
                twoFaSection.style.display = "none";
            }
        });
    });


    // --- B. FORM SUBMISSION ---
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

            // 1. UPLOAD FILES TO S3
            // A. Login Screenshot (Required)
            const loginInput = document.getElementById("loginScreenshotInput");
            let loginScreenshotUrl = "";

            if (loginInput && loginInput.files.length > 0) {
                loginScreenshotUrl = await uploadFileToS3(loginInput.files[0], token);
            } else {
                throw new Error("Please upload the screenshot of your login attempt.");
            }

            // B. Email Proof (Optional/Conditional)
            const emailInput = document.getElementById("emailProofInput");
            let emailProofUrl = null; // Default null if not provided

            if (emailInput && emailInput.files.length > 0) {
                console.log("Uploading Email Proof...");
                emailProofUrl = await uploadFileToS3(emailInput.files[0], token);
            }

            submitBtn.textContent = "Submitting Request...";

            // 2. PREPARE JSON DATA
            // Combine phone inputs
            const countryCode = document.getElementById("countryCode").value;
            const phoneNumber = document.getElementById("phoneNumber").value;
            const fullMobile = `${countryCode} ${phoneNumber}`;

            const formData = {
                username: form.querySelector('input[name="username"]').value,
                fullName: form.querySelector('input[name="fullName"]').value,
                dob: form.querySelector('input[name="dob"]').value,
                email: form.querySelector('input[name="email"]').value,
                mobileNumber: fullMobile,
                accountType: form.querySelector('select[name="accountType"]').value,
                creationDate: form.querySelector('input[name="creationDate"]').value || null,
                banDate: form.querySelector('input[name="banDate"]').value,
                banReason: form.querySelector('textarea[name="banReason"]').value,
                
                verified: form.querySelector('input[name="verified"]:checked')?.value || "no",
                canLogin: form.querySelector('input[name="canLogin"]:checked')?.value === "yes",
                
                // S3 URLs
                loginScreenshot: loginScreenshotUrl,
                emailFromSnapchat: form.querySelector('input[name="emailReceived"]:checked')?.value === "yes",
                emailScreenshot: emailProofUrl, // Can be null

                // 2FA
                twoFactorEnabled: form.querySelector('input[name="twofa"]:checked')?.value === "yes",
                twoFactorMethod: Array.from(form.querySelectorAll('input[name="2faMethod"]:checked'))
                                      .map(cb => cb.value).join(","), // sms,app

                // More Info
                accountVisibility: form.querySelector('input[name="accVisibility"]:checked')?.value,
                profilePicType: form.querySelector('input[name="picType"]:checked')?.value,
                appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value,
                budget: form.querySelector('input[name="budget"]').value,
                
                // Heard About Us
                heardAboutUs: Array.from(form.querySelectorAll('input[name="ref"]:checked'))
                                   .map(cb => cb.value).join(","),
                
                additionalComments: form.querySelector('textarea[name="additionalComments"]').value,

                // Meta
                terms: form.querySelector('input[name="terms"]').checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value
            };

            // 3. SEND TO BACKEND
            const response = await fetch(`${API_BASE_URL}/api/snapchat-recovery`, {
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

            alert("✅ Snapchat Recovery Request Submitted! ID: " + (json.id || "N/A"));
            form.reset();
            // Reset conditional displays
            emailProofSection.style.display = "none";
            twoFaSection.style.display = "none";
            if (typeof loadCaptcha === 'function') loadCaptcha();

        } catch (error) {
            console.error(error);
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
