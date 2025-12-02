 const BASE_URL = "https://account-recovery-app.onrender.com/";

// Elements
const signupForm = document.getElementById("signupForm");
const otpForm = document.getElementById("otpForm");
const verifyMessage = document.getElementById("verifyMessage");

// Handle Signup & Send OTP
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("reg_name").value;
  const email = document.getElementById("reg_email").value;
  const password = document.getElementById("reg_password").value;
  const phone = document.getElementById("reg_number").value;
  const countryCode = document.getElementById("country_code").value;

  try {
    const response = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone, countryCode })
    });

    const data = await response.json();

    if (response.ok) {
      alert("OTP sent! Check WhatsApp & SMS.");

      // Store phone & both OTP verification IDs
      localStorage.setItem("phone", phone);
      localStorage.setItem("whatsappVerificationId", data.whatsappVerificationId);
      localStorage.setItem("smsVerificationId", data.smsVerificationId);

      signupForm.style.display = "none";
      otpForm.style.display = "block";
    } else {
      alert(data.message || "Signup failed. Please try again.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Server error. Please try again.");
  }
});

// Handle OTP Verification
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = document.getElementById("otp").value;
  const phone = localStorage.getItem("phone");

  try {
    const res = await fetch(`${BASE_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp })  // NO verificationId needed
    });

    const data = await res.json();

    if (res.ok) {
      verifyMessage.style.color = "green";
      verifyMessage.textContent = "OTP Verified Successfully!";
      setTimeout(() => {
        alert("Account created successfully!");
        window.location.href = "login.html";
      }, 1500);
    } else {
      verifyMessage.style.color = "red";
      verifyMessage.textContent = data.message || "Invalid OTP. Try again.";
    }
  } catch (error) {
    verifyMessage.style.color = "red";
    verifyMessage.textContent = "Server error. Please try again.";
  }
});
