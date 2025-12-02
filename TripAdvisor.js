const API_BASE_URL = "https://account-recovery-app.onrender.com"; // Check your port

const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("tripadvisor-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector(".submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading Proof...";

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Please log in to submit this request.");

            // 1. UPLOAD FILE TO S3
            const fileInput = document.getElementById("proofFileInput");
            let proofUrl = "";

            if (fileInput.files.length > 0) {
                proofUrl = await uploadFileToS3(fileInput.files[0], token);
            } else {
                throw new Error("Please upload the required proof file.");
            }

            submitBtn.textContent = "Submitting Request...";

            // 2. PREPARE JSON DATA
            const formData = {
                businessProfileUrl: form.querySelector('input[name="businessProfileUrl"]').value,
                reviewUrl: form.querySelector('input[name="reviewUrl"]').value,
                reviewerName: form.querySelector('input[name="reviewerName"]').value,
                reviewDate: form.querySelector('input[name="reviewDate"]').value || null,
                violationReason: form.querySelector('select[name="violationReason"]').value,
                violationExplanation: form.querySelector('textarea[name="violationExplanation"]').value,
                email: form.querySelector('input[name="email"]').value,
                budget: form.querySelector('input[name="budget"]').value,
                
                // Send the S3 URL, not the file
                proofFileUrl: proofUrl,

                // Radio Button
                appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value || "no",

                // Checkboxes (Combine into string)
                ref: Array.from(form.querySelectorAll('input[name="ref"]:checked'))
                          .map(cb => cb.value).join(","),
                
                // Meta
                terms: form.querySelector('input[name="terms"]').checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value
            };

            // 3. SEND TO BACKEND
            const response = await fetch(`${API_BASE_URL}/api/tripadvisor-review-removal`, {
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

            alert("Request Submitted Successfully! Reference ID: " + (json.id || "N/A"));
            form.reset();
            if (typeof loadCaptcha === 'function') loadCaptcha(); // Refresh Captcha

        } catch (error) {
            console.error(error);
            loadCaptcha();
            alert("Error: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});

// --- S3 UPLOAD HELPER FUNCTION ---
async function uploadFileToS3(file, token) {
    // A. Get Pre-Signed URL
    const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;

    const signedUrlResponse = await fetch(generateUrlEndpoint, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!signedUrlResponse.ok) {
        const txt = await signedUrlResponse.text();
        throw new Error(`Server Refused Upload: ${txt}`);
    }

    const { signedUrl, fileUrl } = await signedUrlResponse.json();

    // B. Upload to AWS
    const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
    });

    if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to AWS S3.");
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
            captchaTokenInput.value = data.captchaId;
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

if(reloadButton) reloadButton.addEventListener('click', loadCaptcha);
loadCaptcha();

document.addEventListener('contextmenu', (e) => e.preventDefault());
 
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

 