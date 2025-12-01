const API_BASE_URL = "http://localhost:5000";
const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}


document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("youtubeRecoveryForm");
    const token = localStorage.getItem("token");

    // --- 1. Conditional Logic for Email Proof ---
    const emailRadios = document.getElementsByName("emailReceived");
    const emailProofSection = document.getElementById("emailProof");

    emailRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            if (e.target.value === "yes") {
                emailProofSection.style.display = "block";
            } else {
                emailProofSection.style.display = "none";
                // Clear the file input if hidden
                const fileInput = emailProofSection.querySelector("input[type='file']");
                if(fileInput) fileInput.value = ""; 
            }
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
                if(captchaTokenInput) captchaTokenInput.value = data.captchaId;
                const input = document.getElementById('captcha_input');
                if(input) input.value = '';
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

    // --- 3. Form Submission Logic ---
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector(".submit-btn");
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "Uploading Files...";

            try {
                if (!token) throw new Error("Please log in to submit this request.");

                // A. Upload Login Screenshot (Required)
                const loginInput = form.querySelector('input[name="loginScreenshot"]');
                let loginScreenshotUrl = null;
                
                if (loginInput.files.length > 0) {
                    loginScreenshotUrl = await uploadFileToS3(loginInput.files[0], token);
                } else {
                    throw new Error("Login Screenshot is required.");
                }

                // B. Upload Email Proof (Optional/Conditional)
                const emailInput = form.querySelector('input[name="emailProof"]');
                let emailProofUrl = null;
                if (emailInput && emailInput.files.length > 0) {
                    emailProofUrl = await uploadFileToS3(emailInput.files[0], token);
                }

                submitBtn.innerText = "Submitting Form...";

                // C. Prepare Data
                const countryCode = form.querySelector('select[name="countryCode"]').value;
                const phoneNumber = form.querySelector('input[name="phoneNumber"]').value;
                
                // Collect Checkboxes
                const heardFromChecks = form.querySelectorAll('input[name="heardFrom"]:checked');
                const heardFromValues = Array.from(heardFromChecks).map(cb => cb.value);

                const payload = {
                    channelName: form.querySelector('input[name="channelName"]').value,
                    channelURL: form.querySelector('input[name="channelURL"]').value,
                    verified: form.querySelector('input[name="verified"]:checked')?.value,
                    channelCreatedOn: form.querySelector('input[name="channelCreatedOn"]').value,
                    channelType: form.querySelector('select[name="channelType"]').value,
                    
                    // Combine phone
                    linkedPhoneNumber: `${countryCode} ${phoneNumber}`,
                    linkedEmail: form.querySelector('input[name="email"]').value,
                    subscribers: form.querySelector('input[name="subscribers"]').value,
                    banDate: form.querySelector('input[name="banDate"]').value,
                    
                    // S3 URLs
                    loginScreenshotUrl: loginScreenshotUrl,
                    emailReceived: form.querySelector('input[name="emailReceived"]:checked')?.value === "yes",
                    emailProofUrl: emailProofUrl,

                    appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value === "yes",
                    budget: form.querySelector('input[name="budget"]').value,
                    message: form.querySelector('textarea[name="message"]').value,
                    heardFrom: heardFromValues,
                    
                    terms: form.querySelector('input[name="terms"]').checked,
                    userCaptchAnswer: document.getElementById("captcha_input").value,
                    captchaId: document.getElementById("captchaToken").value
                };

                // D. Send to Backend
                const response = await fetch(`${API_BASE_URL}/api/youtube-recovery`, {
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

                alert("✅ " + (result.message || "YouTube Recovery Request Submitted!"));
                form.reset();
                document.getElementById("emailProof").style.display = "none"; // Reset conditional UI
                loadCaptcha();

            } catch (error) {
                console.error("Submission Error:", error);
                loadCaptcha();
                alert("Error: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }
});

// --- S3 Upload Helper ---
async function uploadFileToS3(file, token) {
    // 1. Get Presigned URL
    const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;
    
    const urlResponse = await fetch(generateUrlEndpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!urlResponse.ok) {
        const err = await urlResponse.json();
        throw new Error(err.message || "Server refused upload.");
    }

    const { signedUrl, fileUrl } = await urlResponse.json();

    // 2. Upload to S3
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
