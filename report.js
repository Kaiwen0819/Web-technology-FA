"use strict";

import { setActiveNav, setYear } from "./common.js";

setActiveNav("report");
setYear();

const el = (id) => document.getElementById(id);

const API_BASE = "http://localhost:3000/api";

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
};

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
  // yyyy-mm-dd (local)
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  return ok;
}

function getQueryId() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

async function apiGetItem(id) {
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Failed to load item");
  return data.item;
}

async function apiCreateItem(payload) {
  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Create failed");
  return data.item; // includes id + referenceCode
}

async function apiUpdateItem(id, payload) {
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
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

    // category 不建议编辑（后端也不允许改 referenceCode 逻辑）
    inputs.category.disabled = true;

    formTitle.textContent = "Edit Report";
    el("submitBtn").textContent = "Update";
    setToast("Editing mode loaded.", "info");
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

  // 注意：后端 POST 会自己加 referenceCode / createdAt / updatedAt
  // PUT 需要你提供 title/description/location/date/contact/status（category 不改）
  const basePayload = {
    title: inputs.title.value.trim(),
    description: inputs.description.value.trim(),
    category: inputs.category.value, // POST 需要；PUT 虽然不允许改但传也没关系（后端会覆盖回原本）
    location: inputs.location.value.trim(),
    date: inputs.date.value,
    contact: inputs.contact.value.trim(),
    status: inputs.status.value,
  };

  try {
    let saved;
    if (!isEdit) {
      saved = await apiCreateItem(basePayload);
      setToast("Report submitted successfully.", "success");
    } else {
      const id = inputs.id.value;
      saved = await apiUpdateItem(id, basePayload);
      setToast("Report updated successfully.", "success");
    }

    // go to details after submit/update
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
  setToast("Form reset.", "info");
});

el("seedBtn").addEventListener("click", async () => {
  // Demo data: 连续 POST 2 条（Lost + Found）
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

    for (const item of demo) {
      await apiCreateItem(item);
    }

    setToast("Demo data added to database.", "success");
  } catch (err) {
    console.error(err);
    setToast(err.message || "Failed to add demo data.", "error");
  }
});

loadEditIfAny();