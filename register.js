import { register } from "./auth.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const confirmEl = document.getElementById("confirm");
const btn = document.getElementById("btnRegister");

btn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;
  const confirm = confirmEl.value;      

  if (!email || !password || !confirm) {
    return alert("Please fill in all fields.");
  }

  if (password !== confirm) {
    return alert("Passwords do not match.");
  }

  try {
    await register(email, password);
    alert("Registration successful!");
    location.href = "home.html";
  } catch (err) {
    alert(err.message || "Registration failed");
    console.error(err);
  }
}); 