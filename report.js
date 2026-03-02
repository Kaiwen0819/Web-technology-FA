"use strict";

import { setActiveNav, setYear } from "./common.js";
import { authFetch } from "./common.js";
import { requireLogin } from "./auth.js";
import { uploadPhotoAndGetUrl } from "./firebase-web.js";

requireLogin();

setActiveNav("report");
setYear();

const el = (id) => document.getElementById(id);
const API_BASE = "https://web-technology-fa.onrender.com";

const formTitle = el("formTitle");
const toast = el("toast");

const inputs = {
  id: el("itemId"),
  title: el("title"),
  description: el("description"),
  category: el("category"),
  location: el("location"),
  date: el("date"),
  contact: el("contact"),
  status: el("status"),
  confirm: el("confirm"),

  // ✅ NEW
  photo: el("photo"),
};

const photoPreviewWrap = el("photoPreviewWrap");
const photoPreview = el("photoPreview");
const clearPhotoBtn = el("clearPhotoBtn");

const errors = {
  title: el("errTitle"),
  description: el("errDescription"),
  category: el("errCategory"),
  location: el("errLocation"),
  date: el("errDate"),
  contact: el("errContact"),
  status: el("errStatus"),
  confirm: el("errConfirm"),
};

function setToast(msg, type = "info") {
  toast.textContent = (type === "success" ? "✅ " : type === "error" ? "❌ " : "ℹ️ ") + msg;
}

function clearErrors() {
  Object.values(errors).forEach((e) => (e.textContent = ""));
}

function nowISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function showPreview(file) {
  if (!photoPreviewWrap || !photoPreview) return;

  if (!file) {
    photoPreviewWrap.style.display = "none";
    photoPreview.removeAttribute("src");
    return;
  }
  const url = URL.createObjectURL(file);
  photoPreview.src = url;
  photoPreviewWrap.style.display = "";
}

if (inputs.photo) {
  inputs.photo.addEventListener("change", () => {
    showPreview(inputs.photo.files?.[0] || null);
  });
}

if (clearPhotoBtn) {
  clearPhotoBtn.addEventListener("click", () => {
    if (inputs.photo) inputs.photo.value = "";
    showPreview(null);
  });
}

function validateForm() {
  clearErrors();
  let ok = true;

  const title = inputs.title.value.trim();
  const desc = inputs.description.value.trim();
  const category = inputs.category.value;
  const location = inputs.location.value.trim();
  const date = inputs.date.value;
  const contact = inputs.contact.value.trim();
  const status = inputs.status.value;
  const confirm = inputs.confirm.checked;

  if (title.length < 3) {
    errors.title.textContent = "Title must be at least 3 characters.";
    ok = false;
  }
  if (desc.length < 10) {
    errors.description.textContent = "Description must be at least 10 characters.";
    ok = false;
  }
  if (!category) {
    errors.category.textContent = "Please select Lost/Found.";
    ok = false;
  }
  if (location.length < 3) {
    errors.location.textContent = "Location must be at least 3 characters.";
    ok = false;
  }

  if (!date) {
    errors.date.textContent = "Please choose a date.";
    ok = false;
  } else {
    const today = nowISODate();
    if (date > today) {
      errors.date.textContent = "Date cannot be in the future.";
      ok = false;
    }
  }

  const phoneOk = /^[0-9+\-() ]{7,20}$/.test(contact);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  if (!phoneOk && !emailOk) {
    errors.contact.textContent = "Enter a valid phone or email.";
    ok = false;
  }

  if (!["Active", "Claimed", "Resolved"].includes(status)) {
    errors.status.textContent = "Invalid status.";
    ok = false;
  }

  if (!confirm) {
    errors.confirm.textContent = "You must confirm before submitting.";
    ok = false;
  }

  // ✅ optional photo size check
  const file = inputs.photo?.files?.[0];
  if (file && file.size > 2 * 1024 * 1024) {
    setToast("Image too large. Please use < 2MB.", "error");
    ok = false;
  }

  return ok;
}

function getQueryId() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

async function apiGetItem(id) {
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Failed to load item");
  return data.item;
}

async function apiCreateItem(payload) {
  const res = await authFetch(`${API_BASE}/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Create failed");
  return data.item;
}

async function apiUpdateItem(id, payload) {
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Update failed");
  return data.item;
}

async function loadEditIfAny() {
  inputs.date.value = nowISODate();

  const id = getQueryId();
  if (!id) return;

  try {
    const item = await apiGetItem(id);

    inputs.id.value = item.id;
    inputs.title.value = item.title ?? "";
    inputs.description.value = item.description ?? "";
    inputs.category.value = item.category ?? "";
    inputs.location.value = item.location ?? "";
    inputs.date.value = item.date ?? nowISODate();
    inputs.contact.value = item.contact ?? "";
    inputs.status.value = item.status ?? "Active";
    inputs.confirm.checked = true;

    inputs.category.disabled = true;

    formTitle.textContent = "Edit Report";
    el("submitBtn").textContent = "Update";
    setToast("Editing mode loaded.", "info");

    // edit 不自动显示旧照片（旧照片在 details 看）
    showPreview(null);
  } catch (err) {
    console.error(err);
    setToast("Item not found for editing.", "error");
  }
}

el("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    setToast("Please fix the errors and try again.", "error");
    return;
  }

  const isEdit = Boolean(inputs.id.value);

  const basePayload = {
    title: inputs.title.value.trim(),
    description: inputs.description.value.trim(),
    category: inputs.category.value,
    location: inputs.location.value.trim(),
    date: inputs.date.value,
    contact: inputs.contact.value.trim(),
    status: inputs.status.value,
  };

  try {
    let saved;

    // 1) create / update item first
    if (!isEdit) {
      saved = await apiCreateItem(basePayload);
      setToast("Report submitted successfully.", "success");
    } else {
      const id = inputs.id.value;
      saved = await apiUpdateItem(id, basePayload);
      setToast("Report updated successfully.", "success");
    }

    // 2) optional photo upload
    const file = inputs.photo?.files?.[0];
    if (file) {
      setToast("Uploading photo…", "info");
      const imageUrl = await uploadPhotoAndGetUrl(saved.id, file);

      // only update imageUrl if user selected a photo
      saved = await apiUpdateItem(saved.id, { ...basePayload, imageUrl });
      setToast("Photo uploaded.", "success");
    }

    // 3) go details
    window.location.href = `details.html?id=${encodeURIComponent(saved.id)}`;
  } catch (err) {
    console.error(err);
    setToast(err.message || "Submit failed.", "error");
  }
});

el("resetBtn").addEventListener("click", () => {
  el("reportForm").reset();
  inputs.date.value = nowISODate();
  inputs.category.disabled = false;
  clearErrors();
  showPreview(null);
  setToast("Form reset.", "info");
});

el("seedBtn").addEventListener("click", async () => {
  try {
    const today = nowISODate();
    const demo = [
      {
        title: "Blue Water Bottle",
        description: "Found at cafeteria table. Blue bottle with stickers.",
        category: "Found",
        location: "Cafeteria",
        date: today,
        contact: "demo@example.com",
        status: "Active",
      },
      {
        title: "AirPods Case",
        description: "Lost near lecture hall. White charging case only.",
        category: "Lost",
        location: "Lecture Hall A",
        date: today,
        contact: "+60123456789",
        status: "Active",
      },
    ];

    for (const item of demo) await apiCreateItem(item);

    setToast("Demo data added to database.", "success");
  } catch (err) {
    console.error(err);
    setToast(err.message || "Failed to add demo data.", "error");
  }
});

loadEditIfAny();