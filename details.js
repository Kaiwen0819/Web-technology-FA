"use strict";

import { setYear } from "./common.js";

setYear();

const el = (id) => document.getElementById(id);

const API_BASE = "http://localhost:3000/api";

function safeText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getId() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

function nextStatus(current) {
  return current === "Active" ? "Claimed" : current === "Claimed" ? "Resolved" : "Active";
}

async function apiGetItem(id) {
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Failed to load item");
  return data.item;
}

async function apiUpdateStatus(id, status) {
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.msg || data.error || "Update status failed");
  return data.item;
}

async function apiDeleteItem(id) {
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.msg || data.error || "Delete failed");
}

async function main() {
  const id = getId();

  const titleEl = el("title");
  const subtitleEl = el("subtitle");
  const contentEl = el("content");
  const actionsEl = el("actions");
  const emptyEl = el("empty");

  if (!id) {
    emptyEl.hidden = false;
    return;
  }

  let item;
  try {
    item = await apiGetItem(id);
  } catch (err) {
    console.error(err);
    emptyEl.hidden = false;
    return;
  }

  titleEl.textContent = item.title ?? "Details";
  subtitleEl.textContent = `${item.referenceCode ?? ""} • ${item.category} • ${item.status} • ${item.date}`;

  contentEl.innerHTML = `
    <div class="kv" aria-label="Item details">
      <div>Reference</div><div>${safeText(item.referenceCode)}</div>
      <div>Category</div><div>${safeText(item.category)}</div>
      <div>Status</div><div>${safeText(item.status)}</div>
      <div>Date</div><div>${safeText(item.date)}</div>
      <div>Location</div><div>${safeText(item.location)}</div>
      <div>Contact</div><div>${safeText(item.contact)}</div>
      <div>Description</div><div>${safeText(item.description)}</div>
    </div>
  `;

  actionsEl.hidden = false;

  // Back link: go back to category list
  el("backLink").href = item.category === "Lost" ? "lost.html" : "found.html";

  // Edit goes to report page with id
  el("editLink").href = `report.html?id=${encodeURIComponent(item.id)}`;

  el("statusBtn").addEventListener("click", async () => {
    try {
      const next = nextStatus(item.status);
      item = await apiUpdateStatus(item.id, next);
      alert(`Status updated to ${next}`);
      // refresh UI quickly
      subtitleEl.textContent = `${item.referenceCode ?? ""} • ${item.category} • ${item.status} • ${item.date}`;
      contentEl.querySelector(".kv").innerHTML = `
        <div>Reference</div><div>${safeText(item.referenceCode)}</div>
        <div>Category</div><div>${safeText(item.category)}</div>
        <div>Status</div><div>${safeText(item.status)}</div>
        <div>Date</div><div>${safeText(item.date)}</div>
        <div>Location</div><div>${safeText(item.location)}</div>
        <div>Contact</div><div>${safeText(item.contact)}</div>
        <div>Description</div><div>${safeText(item.description)}</div>
      `;
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update status");
    }
  });

  el("deleteBtn").addEventListener("click", async () => {
    const yes = confirm("Delete this report?");
    if (!yes) return;

    try {
      await apiDeleteItem(item.id);
      alert("Deleted.");
      window.location.href = item.category === "Lost" ? "lost.html" : "found.html";
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete");
    }
  });
}

main();