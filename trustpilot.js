const API_BASE_URL = "http://localhost:5000"; 

const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";  
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("trustpilot-form");
    if (!form) return;

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
            const fileInput = document.getElementById("uploadFileInput");
            let proofUrl = "";

            if (fileInput && fileInput.files.length > 0) {
                proofUrl = await uploadFileToS3(fileInput.files[0], token);
            } else {
                throw new Error("Please upload the required proof file.");
            }

            submitBtn.textContent = "Submitting Request...";

            // 2. PREPARE JSON DATA
            // We match these keys exactly to what your Backend Controller expects
            const formData = {
                businessProfile: form.querySelector('input[name="businessProfile"]').value,
                
                // 🔴 FIX 1: Matched HTML name="reviewLink"
                reviewLink: form.querySelector('input[name="reviewLink"]').value,
                
                reviewerName: form.querySelector('input[name="reviewerName"]').value,
                invitationId: form.querySelector('input[name="invitationId"]').value || null,
                violationReason: form.querySelector('select[name="violationReason"]').value,
                violationDetails: form.querySelector('textarea[name="violationDetails"]').value,
                
                // Backend expects 'contactEmail' based on your controller logic
                contactEmail: form.querySelector('input[name="contactEmail"]').value,
                budget: form.querySelector('input[name="budget"]').value,
                
                // S3 URL
                proofFileUrl: proofUrl,

                // Radio Button
                appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value || "no",

                // 🔴 FIX 2: Matched HTML name="heardAboutUs" and Key "heardAboutUs"
                heardAboutUs: Array.from(form.querySelectorAll('input[name="heardAboutUs"]:checked'))
                          .map(cb => cb.value).join(","),
                
                // Meta
                terms: form.querySelector('input[name="terms"]').checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value
            };

            // 3. SEND TO BACKEND (Added /api/)
            const response = await fetch(`${API_BASE_URL}/trustpilot-review-removal`, {
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

            alert("Request Submitted Successfully!");
            form.reset();
            if (typeof loadCaptcha === 'function') loadCaptcha(); 

        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
            loadCaptcha();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});

// --- S3 UPLOAD HELPER FUNCTION ---
async function uploadFileToS3(file, token) {
    // 🔴 FIX 3: Added /api/ prefix
    const generateUrlEndpoint = `${API_BASE_URL}/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;

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

    if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to AWS S3.");
    }

    return fileUrl;
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
