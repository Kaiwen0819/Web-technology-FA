"use strict";

import { setYear, setActiveNav } from "./common.js";
import { authFetch } from "./common.js";
import { getCurrentUser } from "./auth.js";

setYear();
setActiveNav(""); // details页不高亮也可以

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
  // 读取可以不需要 token，但用 authFetch 也没问题（有登录就带 token）
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Failed to load item");
  return data.item;
}

async function apiUpdateStatus(id, status) {
  // 必须带 token（后端 requireAuth）:contentReference[oaicite:2]{index=2}
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
  // 必须带 token（后端 requireAuth）:contentReference[oaicite:3]{index=3}
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
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

  // Back link: go back to category list
  el("backLink").href = item.category === "Lost" ? "lost.html" : "found.html";

  // Edit goes to report page with id
  el("editLink").href = `report.html?id=${encodeURIComponent(item.id)}`;

  // ✅ 权限：只有 owner 才能看到 Edit/Update/Delete
  const allowEdit = canEditItem(item);
  actionsEl.hidden = false;

  // 直接隐藏按钮（UI）
  el("editLink").style.display = allowEdit ? "" : "none";
  el("statusBtn").style.display = allowEdit ? "" : "none";
  el("deleteBtn").style.display = allowEdit ? "" : "none";

  // 双保险：非 owner 即使硬点也挡
  el("statusBtn").addEventListener("click", async () => {
    if (!canEditItem(item)) return alert("你没有权限修改这个 report（只有创建者可以）。");

    try {
      const next = nextStatus(item.status);
      item = await apiUpdateStatus(item.id, next);
      alert(`Status updated to ${next}`);

      subtitleEl.textContent = `${item.referenceCode ?? ""} • ${item.category} • ${item.status} • ${item.date}`;
      // 更新 UI
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
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update status");
    }
  });

  el("deleteBtn").addEventListener("click", async () => {
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