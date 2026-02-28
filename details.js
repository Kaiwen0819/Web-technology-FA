"use strict";

import { setYear, setActiveNav } from "./common.js";
import { authFetch } from "./common.js";
import { getCurrentUser } from "./auth.js";

setYear();
setActiveNav("");

const el = (id) => document.getElementById(id);
const API_BASE = "https://web-technology-fa.onrender.com";

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

function getCurrentUid() {
  return getCurrentUser()?.uid || null;
}

function canEditItem(item) {
  const uid = getCurrentUid();
  return Boolean(uid && item?.ownerUid && item.ownerUid === uid);
}

async function apiGetItem(id) {
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Failed to load item");
  return data.item;
}

async function apiUpdateStatus(id, status) {
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.msg || data.error || "Update status failed");
  return data.item;
}

async function apiDeleteItem(id) {
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.msg || data.error || "Delete failed");
}

function showEmpty({ contentEl, actionsEl, emptyEl }) {
  contentEl.innerHTML = "";
  actionsEl.hidden = true;
  emptyEl.hidden = false;
}

function renderDetails({ titleEl, subtitleEl, contentEl }, item) {
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
}

async function main() {
  const id = getId();

  const titleEl = el("title");
  const subtitleEl = el("subtitle");
  const contentEl = el("content");
  const actionsEl = el("actions");
  const emptyEl = el("empty");

  const backLink = el("backLink");
  const editLink = el("editLink");
  const statusBtn = el("statusBtn");
  const deleteBtn = el("deleteBtn");

  if (!id) {
    showEmpty({ contentEl, actionsEl, emptyEl });
    return;
  }

  let item;
  try {
    item = await apiGetItem(id);
  } catch (err) {
    console.error(err);
    showEmpty({ contentEl, actionsEl, emptyEl });
    return;
  }

  // ✅ 关键：拿到 item 后一定隐藏 empty
  emptyEl.hidden = true;

  renderDetails({ titleEl, subtitleEl, contentEl }, item);

  // Back link
  backLink.href = item.category === "Lost" ? "lost.html" : "found.html";
  editLink.href = `report.html?id=${encodeURIComponent(item.id)}`;

  // ✅ 权限
  const allowEdit = canEditItem(item);

  actionsEl.hidden = false;
  editLink.style.display = allowEdit ? "" : "none";
  statusBtn.style.display = allowEdit ? "" : "none";
  deleteBtn.style.display = allowEdit ? "" : "none";

  statusBtn.addEventListener("click", async () => {
    if (!canEditItem(item)) return alert("你没有权限修改这个 report（只有创建者可以）。");

    try {
      const next = nextStatus(item.status);
      item = await apiUpdateStatus(item.id, next);
      renderDetails({ titleEl, subtitleEl, contentEl }, item);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update status");
    }
  });

  deleteBtn.addEventListener("click", async () => {
    if (!canEditItem(item)) return alert("你没有权限删除这个 report（只有创建者可以）。");

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