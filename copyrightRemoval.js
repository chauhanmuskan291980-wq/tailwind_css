const API_BASE_URL = "http://localhost:5000"; // Ensure this matches your backend port
// ---------------------------------------------------------
// 1. UI & LOGIC HANDLERS
// ---------------------------------------------------------

// Show/Hide fields based on Removal Type
const removalTypeSelect = document.getElementById('removalType');
const socialMediaFields = document.getElementById('social_media_fields');

if (removalTypeSelect) {
    removalTypeSelect.addEventListener('change', () => {
        const val = removalTypeSelect.value;
        // Hide social media specific fields if it's a Google or Other request
        if (val.startsWith('google') || val === 'other_reason') {
            socialMediaFields.style.display = 'none';
            // Remove 'required' attributes from hidden fields
            socialMediaFields.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
        } else {
            socialMediaFields.style.display = 'block';
            // Re-add 'required' attributes
            socialMediaFields.querySelectorAll('input').forEach(input => input.setAttribute('required', ''));
        }
    });

    // Run once on load
    if (removalTypeSelect.value === '' || removalTypeSelect.value.startsWith('google') || removalTypeSelect.value === 'other_reason') {
         // If defaulted to empty or non-social, ensure requirements are correct
         if(removalTypeSelect.value !== '') socialMediaFields.style.display = 'none';
    }
}


const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html"; // change path to your login page
}


// Auto-fill Platform Name from URL
document.addEventListener("DOMContentLoaded", function () {
     if (!localStorage.getItem("token")) {
        return;
    }
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");

    if (platform) {
        const formatted = platform.charAt(0).toUpperCase() + platform.slice(1);
        const heading = document.querySelector("main h2");
        if (heading) heading.innerText = `${formatted} Digital Content Removal Form`;

        const input = document.getElementById("platformInput");
        if (input) {
            input.value = formatted;
            input.readOnly = true;
            input.style.backgroundColor = "#000000";
            input.style.cursor = "not-allowed";
        }
    }
});

// ---------------------------------------------------------
// 2. MAIN SUBMIT HANDLER (S3 INTEGRATION)
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("removalForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector(".submit-btn");
        const originalText = submitBtn.textContent;
        
        // Disable button to prevent double clicks
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading Files...";

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("You must be logged in to submit this request.");

            // --- A. FILE UPLOAD PHASE ---
            
            // 1. Get File Elements
            const offensiveInput = document.getElementById("offensiveContentFile");
            const proofInput = document.getElementById("proofFile");

            let offensiveUrl = "";
            let proofUrl = "";

            // 2. Upload Offensive Content Screenshot
            if (offensiveInput.files.length > 0) {
                console.log("Uploading Offensive Content Proof...");
                offensiveUrl = await uploadFileToS3(offensiveInput.files[0], token);
            } else {
                throw new Error("Please upload a screenshot of the offensive content.");
            }

            // 3. Upload Proof of Ownership
            if (proofInput.files.length > 0) {
                console.log("Uploading Ownership Proof...");
                proofUrl = await uploadFileToS3(proofInput.files[0], token);
            } else {
                throw new Error("Please upload your proof of ownership/ID.");
            }

            submitBtn.textContent = "Submitting Data...";

            // --- B. FORM DATA PREPARATION (JSON) ---

            const dataPayload = {
                removalType: document.getElementById("removalType").value,
                platformInput: document.getElementById("platformInput").value,
                targetUsername: document.getElementById("targetUsername").value,
                targetUrl: document.getElementById("targetUrl").value,
                reason: document.getElementById("reason").value,
                accountUrl: document.getElementById("accountUrl").value,
                contactEmail: document.getElementById("contactEmail").value,
                maxBudget: document.getElementById("maxBudget").value || null,
                message: document.getElementById("message").value || null,
                
                // Send the S3 URLs we just got
                offensiveContentUrl: offensiveUrl,
                proofUrl: proofUrl,

                // Radio Button
                appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value || "no",

                // Checkboxes (Joined as string)
                ref: Array.from(form.querySelectorAll('input[name="ref"]:checked'))
                          .map(cb => cb.value).join(","),
                
                // Terms & Captcha
                terms: document.getElementById("terms").checked,
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value, 
            };

            // --- C. SEND TO BACKEND ---

            const response = await fetch(`${API_BASE_URL}/api/removal`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // Sending JSON now
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(dataPayload)
            });

            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.error || json.message || "Submission failed");
            }

            alert("Removal request submitted! Reference ID: " + (json.id || "N/A"));
            form.reset();
            if(typeof loadCaptcha === 'function') loadCaptcha(); // Refresh captcha

        } catch (err) {
            console.error("Submit error", err);
            loadCaptcha();
            alert("Submission failed: " + (err.message || err));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});

// ---------------------------------------------------------
// 3. AWS S3 HELPER FUNCTION (Reusable)
// ---------------------------------------------------------

async function uploadFileToS3(file, token) {
    // 1. Get Pre-Signed URL
    const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;
    
    const signedUrlResponse = await fetch(generateUrlEndpoint, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!signedUrlResponse.ok) {
        const errorText = await signedUrlResponse.text();
        throw new Error(`Server Refused Upload: ${signedUrlResponse.status} - ${errorText}`);
    }
    
    const { signedUrl, fileUrl } = await signedUrlResponse.json();

    // 2. Upload to S3
    const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
    });

    if (!uploadResponse.ok) {
        throw new Error(`AWS S3 Upload Failed. Status: ${uploadResponse.status}`);
    }

    return fileUrl; // Return the permanent URL
}

// ---------------------------------------------------------
// 4. CAPTCHA LOGIC
// ---------------------------------------------------------

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
            const captchaInput = document.getElementById('captcha_input');
            if(captchaInput) captchaInput.value = '';
        } else {
            captchaCodeDisplay.textContent = 'Error';
        }
    } catch (error) {
        console.error('Error loading CAPTCHA:', error);
        captchaCodeDisplay.textContent = 'Net Error';
    }
}

if(reloadButton) reloadButton.addEventListener('click', loadCaptcha);
loadCaptcha();

// Disable Context Menu
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
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
