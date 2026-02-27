import { login } from "./auth.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btn = document.getElementById("btnLogin");

btn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;

  try {
    await login(email, password);
    location.href = "home.html";
  } catch (err) {
    alert(err.message || "Login failed");
    console.error(err);
  }
});