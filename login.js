import { login } from "./auth.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btn = document.getElementById("btnLogin");

function isQiuEmail(email) {
  return /^[^\s@]+@qiu\.edu\.my$/i.test(email);
}

btn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) {
    return alert("Please fill in all fields.");
  }

  if (!isQiuEmail(email)) {
    return alert("Only QIU email is allowed. Please use: yourname@qiu.edu.my");
  }

  try {
    await login(email, password);
    location.href = "home.html";
  } catch (err) {
    alert(err.message || "Login failed");
    console.error(err);
  }
});