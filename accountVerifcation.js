const API_BASE_URL = "https://account-recovery-app.onrender.com/"; // Adjust if needed
// Redirect if user not logged in
const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html"; // change path to your login page
}




document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('main.form-container form');
    if (!form) return;
    if (!localStorage.getItem("token")) {
        return;
    }
     

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading File...';

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("User not authenticated");

            // 1. HANDLE FILE UPLOAD TO S3
            const fileInput = document.getElementById('idFileInput');
            const file = fileInput?.files[0];
            let uploadedFileUrl = "";

            if (file) {
                // Call helper function to upload
                uploadedFileUrl = await uploadFileToS3(file, token);
            } else {
                throw new Error("Please select a valid ID file.");
            }

            submitBtn.textContent = 'Submitting Form...';

            // 2. PREPARE FORM DATA (As JSON)
            // Since we aren't sending binary files to backend, JSON is cleaner than FormData
            const formData = {
                platform: document.getElementById('platformInput')?.value,
                profileUrl: form.querySelector('input[placeholder*="https://"]')?.value,
                accType: form.querySelector('input[name="accType"]:checked')?.value,
                visibility: form.querySelector('input[name="visibility"]:checked')?.value,
                badge: form.querySelector('input[name="badge"]:checked')?.value,
                nameOnId: form.querySelector('input[placeholder*="Full name"]')?.value,
                idFileUrl: uploadedFileUrl, // 🌟 Send the S3 URL here
                publicRecognition: form.querySelector('textarea[placeholder*="notable articles"]')?.value,
                maxBudget: form.querySelector('input[type="number"]')?.value,
                message: Array.from(form.querySelectorAll('textarea')).slice(-1)[0]?.value,
                appliedBefore: form.querySelector('input[name="appliedBefore"]:checked')?.value,
                ref: Array.from(form.querySelectorAll('input[name="ref"]:checked')).map(cb => cb.value),
                userCaptchAnswer: document.getElementById("captcha_input").value,
                captchaId: document.getElementById("captchaToken").value,
                terms: form.querySelector('input#terms')?.checked ? "on" : "off"
            };
            
            // Hidden captcha token
            const captchaToken = document.getElementById('captchaToken')?.value;
            // You might want to add this to formData if your backend expects it

            // 3. SEND DATA TO BACKEND
            const resp = await fetch(`${API_BASE_URL}/api/verification`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const json = await resp.json();
            if (!resp.ok) {
                throw new Error(json.error || json.message || 'Submission failed');
            }

            alert('Verification request submitted! Reference ID: ' + (json.id || 'N/A'));
            form.reset();
            // Reload captcha for next use
            if(typeof loadCaptcha === 'function') loadCaptcha();

        } catch (err) {
            console.error('Submit error', err);
            loadCaptcha();
            alert('Submission failed: ' + (err.message || err));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});

// 🌟 HELPER: Upload to S3
async function uploadFileToS3(file, token) {
    console.log(`[S3] Requesting URL for: ${file.name}`);

    // A. Get Pre-Signed URL from Backend
    // Ensure filename is encoded to handle spaces/special chars
    const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;

    const signedUrlResponse = await fetch(generateUrlEndpoint, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!signedUrlResponse.ok) {
    // Read the text sent back by the server (e.g., "Bucket not found", "Unauthorized")
    const errorText = await signedUrlResponse.text(); 
    throw new Error(`Server Refused: ${signedUrlResponse.status} - ${errorText}`);
}

    const { signedUrl, fileUrl } = await signedUrlResponse.json();

    // B. Upload Direct to S3
    console.log(`[S3] Uploading binary to AWS...`);
    const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type // Must match what was sent to backend
        },
        body: file // Send raw file object
    });

    if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage server.");
    }

    console.log(`yOUR FORM IS SUBMITTED SUCCESSFULLY.`);
    return fileUrl;
}

 


     const captchaCodeDisplay = document.getElementById('captchaCodeDisplay');
    const captchaTokenInput = document.getElementById('captchaToken');
    const reloadButton = document.getElementById('reloadCaptchaBtn');
    async function loadCaptcha() {
        captchaCodeDisplay.textContent = 'Loading...';

        try {
            const response = await fetch(`https://account-recovery-app.onrender.com//api/captcha`);
            const data = await response.json();

            if (data.success) {
                // Display the actual code (WARNING: Insecure, as discussed)
                captchaCodeDisplay.textContent = data.captchaCode;
                captchaTokenInput.value = data.captchaId;
                document.getElementById('captcha_input').value = '';
            } else {
                captchaCodeDisplay.textContent = 'Error';
                alert('Failed to load CAPTCHA.');
            }
        } catch (error) {
            console.error('Error loading CAPTCHA:', error);
            captchaCodeDisplay.textContent = 'Network Error';
        }
        
    }

    // Attach to button and run on page load
    reloadButton.addEventListener('click', loadCaptcha);
    loadCaptcha();



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

 