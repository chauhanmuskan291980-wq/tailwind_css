
const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";
}



document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENT SELECTORS ---
    const form = document.querySelector('form');
    const submitButton = document.getElementById('submitButton');
    const requiredFields = form.querySelectorAll('[required]');
    const termsCheckbox = document.getElementById('terms');

    // --- CAPTCHA Selectors ---
    const captchaCodeDisplay = document.getElementById('captchaCodeDisplay');
    const captchaTokenInput = document.getElementById('captchaToken');
    const reloadButton = document.getElementById('reloadCaptchaBtn');
    const API_BASE_URL = 'https://account-recovery-app.onrender.com/';

    // ✅ NEW: List of all file input names (must match the 'name' attribute in HTML)
    const FILE_INPUT_NAMES = [
        'valid_id_upload',
        'login_screenshot',
        'username_ss',
        'followers_ss',
        'email_upload',
        'profile_pic_upload'
    ];

    // --- (All toggle functions remain the same) ---
    const verifiedNo = document.getElementById('verified_no');
    const verifiedYes = document.getElementById('verified_yes');
    const verificationOptions = document.getElementById('verification_type_options');
    function toggleVerificationOptions() {
        verificationOptions.style.display = verifiedYes.checked ? 'block' : 'none';
    }
    verifiedNo.addEventListener('change', toggleVerificationOptions);
    verifiedYes.addEventListener('change', toggleVerificationOptions);
    toggleVerificationOptions();

    const fbLinkedYes = document.getElementById('fb_linked_yes');
    const fbLinkedNo = document.getElementById('fb_linked_no');
    const fbUrlOption = document.getElementById('fb_url_option');
    const fbProfileUrl = document.getElementById('fb_profile_url');
    function toggleFbUrlOption() {
        if (fbLinkedYes.checked) {
            fbUrlOption.style.display = 'block';
            fbProfileUrl.setAttribute('required', 'required');
        } else {
            fbUrlOption.style.display = 'none';
            fbProfileUrl.removeAttribute('required');
            fbProfileUrl.value = '';
        }
    }
    fbLinkedYes.addEventListener('change', toggleFbUrlOption);
    fbLinkedNo.addEventListener('change', toggleFbUrlOption);
    toggleFbUrlOption();

    const twoFaYes = document.getElementById('2fa_yes');
    const twoFaNo = document.getElementById('2fa_no');
    const twoFaMethods = document.getElementById('2fa_methods');
    function toggleTwoFaMethods() {
        twoFaMethods.style.display = twoFaYes.checked ? 'block' : 'none';
    }
    twoFaYes.addEventListener('change', toggleTwoFaMethods);
    twoFaNo.addEventListener('change', toggleTwoFaMethods);
    toggleTwoFaMethods();

    const banDateYes = document.getElementById('ban_date_yes');
    const banDateNo = document.getElementById('ban_date_no');
    const banDateOptions = document.getElementById('ban_date_options');
    function toggleBanDateOptions() {
        banDateOptions.style.display = banDateYes.checked ? 'block' : 'none';
    }
    banDateYes.addEventListener('change', toggleBanDateOptions);
    banDateNo.addEventListener('change', toggleBanDateOptions);
    toggleBanDateOptions();

    // --- Form Validation and Button Toggle Logic (Remains the same) ---
    function checkFormValidity() {
        let allRequiredFilled = true;
        requiredFields.forEach(field => {
            if (field.type === 'radio' && document.querySelector(`input[name="${field.name}"]:checked`) === null) {
                allRequiredFilled = false;
            } else if (!field.value.trim() && field.type !== 'radio' && field.type !== 'checkbox') {
                allRequiredFilled = false;
            }
        });
        if (allRequiredFilled && termsCheckbox.checked) {
            submitButton.disabled = false;
        } else {
            submitButton.disabled = true;
        }
    }

    form.addEventListener('input', checkFormValidity);
    form.addEventListener('change', checkFormValidity);
    checkFormValidity(); // Initial check

    // --- CAPTCHA Loading Function (Remains the same) ---
    async function loadCaptcha() {
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
                alert('Failed to load CAPTCHA.');
            }
        } catch (error) {
            console.error('Error loading CAPTCHA:', error);
            captchaCodeDisplay.textContent = 'Network Error';
        }
        checkFormValidity();
    }
    reloadButton.addEventListener('click', loadCaptcha);
    loadCaptcha();

    // -----------------------------------------------------------------
    // ✅ NEW UTILITY: Function to handle the S3 pre-signed upload
    // -----------------------------------------------------------------

    async function uploadFileToS3(fileInputName, token) {
        const fileInput = document.querySelector(`input[name="${fileInputName}"]`);
        const file = fileInput.files[0];

        if (!file) return null; // No file selected, return null

        console.log(`[S3] Starting upload for: ${file.name}`);

        // 1. Request Pre-Signed URL from Backend
        const generateUrlEndpoint = `${API_BASE_URL}/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;

        const signedUrlResponse = await fetch(generateUrlEndpoint, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!signedUrlResponse.ok) {
            const errorText = await signedUrlResponse.text();
            throw new Error(`Failed to get pre-signed URL. Status: ${signedUrlResponse.status}. ${errorText}`);
        }

        const { signedUrl, fileUrl } = await signedUrlResponse.json();

        // 2. Direct Upload to S3 using the signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: file // The raw File object is sent directly to S3
        });

        if (!uploadResponse.ok) {
            throw new Error(`Direct upload to S3 failed for ${file.name}. Status: ${uploadResponse.status}`);
        }

        console.log(`[S3] Upload successful. URL: ${fileUrl}`);
        return fileUrl; // This is the permanent URL to save in the DB
    }


    // -----------------------------------------------------------------
    // 🛑 MAJOR CHANGE: Form Submission Overhaul 
    // -----------------------------------------------------------------

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (submitButton.disabled) return; // Prevent submission if validation failed

        submitButton.disabled = true;
        submitButton.textContent = 'Uploading files...';

        const token = localStorage.getItem("token");
        const formData = new FormData(form);
        const uploadedFileUrls = {};

        try {
            // --- STEP 1: Process and Upload Files to S3 ---
            for (const name of FILE_INPUT_NAMES) {
                // Determine the correct field name for Prisma (e.g., 'valid_id_upload' -> 'validIdUploadFileRef')
                // This is a rough guess based on your backend code structure
                const prismaFieldName = name.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) + 'FileRef';

                // Upload the file and get the S3 URL
                uploadedFileUrls[prismaFieldName] = await uploadFileToS3(name, token);

                // Remove the file object from the original FormData
                formData.delete(name);
            }

            // --- STEP 2: Submit Main Form Data (with S3 URLs) ---
            submitButton.textContent = 'Submitting form...';

            // Append the permanent S3 URLs to the FormData
            Object.entries(uploadedFileUrls).forEach(([key, url]) => {
                if (url) {
                    // Send the S3 URL as a string value in the FormData
                    formData.append(key, url);
                }
            });

            // Ensure names (if HTML can't be changed)
            formData.set('userCaptchAnswer', document.getElementById('captcha_input').value);
            formData.set('captchaId', document.getElementById('captchaToken').value);


            const response = await fetch(`${API_BASE_URL}/api/submit-recovery`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData // Contains text fields + S3 URLs
            });

            const result = await response.json();

            if (response.ok) {
                alert(`SUCCESS! ${result.message}`);
                form.reset();

                // Re-run checks/toggles after reset
                toggleVerificationOptions();
                toggleFbUrlOption();
                toggleTwoFaMethods();
                toggleBanDateOptions();
                loadCaptcha();
            } else {
                alert(`Error: ${result.message}`);
                loadCaptcha();
            }

        } catch (error) {
            console.error('Submission or S3 error:', error);
            alert(`An error occurred during submission: ${error.message}`);
            loadCaptcha();
        } finally {
            submitButton.textContent = 'Submit';
            checkFormValidity(); // Re-check state after finishing
        }
    });
});




document.addEventListener("keydown", function (e) {

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
