 /* ---------------- CAPTCHA LOADING ------------------ */
const captchaCodeDisplay = document.getElementById("captchaCodeDisplay");
const captchaTokenInput = document.getElementById("captchaToken");
const reloadButton = document.getElementById("reloadCaptchaBtn");

async function loadCaptcha() {
    captchaCodeDisplay.textContent = "Loading...";
    try {
        const response = await fetch("https://account-recovery-app.onrender.com//api/captcha");
        const data = await response.json();

        if (data.success) {
            captchaCodeDisplay.textContent = data.captchaCode;
            captchaTokenInput.value = data.captchaId;
            document.getElementById("captcha_input").value = "";
        } else {
            captchaCodeDisplay.textContent = "Error";
        }
    } catch (err) {
        captchaCodeDisplay.textContent = "Network Error";
    }
}

reloadButton.addEventListener("click", loadCaptcha);
loadCaptcha();

/* ----------- Block access without login ----------- */
const token = localStorage.getItem("token");
if (!token) {
    alert("Please log in before filling the form.");
    window.location.href = "login.html";
}

/* ---------------- FORM SUBMISSION ------------------ */
const fbForm = document.getElementById("fbRecoveryForm");
const submitBtn = document.getElementById("submitButton");

fbForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    /* 🛑 Disable the button */
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const token = localStorage.getItem("token");
    const fd = new FormData(e.target);

    /* -------- FILE INPUT REFERENCES -------- */
    const loginFile = document.getElementById("login_screenshot").files[0];
    const idFile = document.getElementById("valid_id_upload").files[0];
    const emailFile = document.getElementById("email_upload").files[0];

    /* Create progress indicators */
    const loginProgress = getOrCreateProgress("loginProgress", "login_screenshot");
    const idProgress = getOrCreateProgress("validIdProgress", "valid_id_upload");
    const emailProgress = getOrCreateProgress("emailProgress", "email_upload");

    /* -------- UPLOAD FILES TO S3 -------- */
    const loginScreenshotURL = await uploadToS3(loginFile, token, loginProgress, "Login Screenshot");
    const validIdURL = await uploadToS3(idFile, token, idProgress, "Valid ID");
    const emailURL = await uploadToS3(emailFile, token, emailProgress, "Email Proof");

    /* -------- APPEND S3 URLs INTO FORM -------- */
    fd.append("loginScreenshotFileRef", loginScreenshotURL);
    fd.append("validIdUploadFileRef", validIdURL);
    fd.append("emailUploadFileRef", emailURL);

    /* -------- FIX: Append CAPTCHA Values Correctly -------- */
    fd.append("userCaptchAnswer", document.getElementById("captcha_input").value);
    fd.append("captchaId", document.getElementById("captchaToken").value);

    /* Convert FormData → JSON */
    const bodyObject = Object.fromEntries(fd.entries());

    /* ------------------ SUBMIT TO BACKEND ------------------ */
    const res = await fetch("https://account-recovery-app.onrender.com//api/submit-fb-recovery", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyObject)
    });

    const result = await res.json();

    if (res.ok) {
        alert("Form Submitted Successfully!");
        fbForm.reset();
        loadCaptcha();
    } else {
        alert("Error: " + result.message);
        loadCaptcha();
    }

    /* 🟢 Re-enable button after finishing */
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
});

/* ------------------ S3 UPLOAD FUNCTION ------------------ */
async function uploadToS3(file, token, progressElement, description) {
    if (!file) return null;

    progressElement.textContent = `${description}: Uploading...`;

    const signedRes = await fetch(
        `https://account-recovery-app.onrender.com//api/generate-upload-url?filename=${file.name}&filetype=${file.type}`,
        { headers: { "Authorization": "Bearer " + token } }
    );

    const signedData = await signedRes.json();

    await fetch(signedData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
    });

    progressElement.textContent = `${description}: ✔ Uploaded`;

    const key = signedData.fileUrl.split(".com/")[1];

    const dlRes = await fetch(
        `https://account-recovery-app.onrender.com//api/generate-download-url?key=${encodeURIComponent(key)}`,
        { headers: { Authorization: "Bearer " + token } }
    );

    const dlData = await dlRes.json();
    return dlData.downloadUrl;
}

/* Helper to auto-create missing progress fields */
function getOrCreateProgress(id, inputName) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("p");
        el.id = id;
        document.getElementById(inputName).closest(".form-group").appendChild(el);
    }
    return el;
}
