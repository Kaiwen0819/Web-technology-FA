"use strict";

const el = (id) => document.getElementById(id);

import { authFetch } from "./common.js";
import { getCurrentUser, waitForAuthReady, requireLogin } from "./auth.js";

const listEl = el("list");
const countEl = el("count");
const emptyEl = el("empty");

const filterStatus = el("filterStatus");
const sortBy = el("sortBy");
const searchInput = el("search");

const API_BASE = "https://web-technology-fa.onrender.com";

function safeText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pageCategory() {
  const name = location.pathname.split("/").pop().toLowerCase();
  if (name.includes("lost")) return "Lost";
  if (name.includes("found")) return "Found";
  return "All";
}

function badgeClass(text, type) {
  const t = String(text || "").toLowerCase();
  if (type === "category") return t === "lost" ? "lost" : "found";
  if (type === "status") {
    if (t === "active") return "active";
    if (t === "claimed") return "claimed";
    return "resolved";
  }
  return "";
}

function nextStatus(current) {
  return current === "Active" ? "Claimed" : current === "Claimed" ? "Resolved" : "Active";
}

async function apiGetItems() {
  const res = await authFetch(`${API_BASE}/api/items`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.msg || data.error || "Failed to load items");
  return data.items || [];
}

async function apiDeleteItem(id) {
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.msg || data.error || "Delete failed");
}

async function apiUpdateStatus(id, status) {
  const res = await authFetch(`${API_BASE}/api/items/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.msg || data.error || "Update status failed");
}

let allItems = [];

function getCurrentUid() {
  return getCurrentUser()?.uid || null;
}

function canEditItem(item) {
  const uid = getCurrentUid();
  return Boolean(uid && item?.ownerUid && item.ownerUid === uid);
}

function getFilteredSorted() {
  const category = pageCategory();
  const status = filterStatus.value;
  const q = searchInput.value.trim().toLowerCase();
  const sort = sortBy.value;

  let items = [...allItems];

  if (category !== "All") items = items.filter((x) => x.category === category);
  if (status !== "All") items = items.filter((x) => x.status === status);

  if (q) {
    items = items.filter((x) => {
      const hay = `${x.referenceCode || ""} ${x.title || ""} ${x.location || ""} ${x.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  items.sort((a, b) => {
    if (sort === "newest") return (b.date || "").localeCompare(a.date || "");
    if (sort === "oldest") return (a.date || "").localeCompare(b.date || "");
    if (sort === "titleAZ") return (a.title || "").localeCompare(b.title || "");
    if (sort === "titleZA") return (b.title || "").localeCompare(a.title || "");
    return 0;
  });

  return items;
}

function renderList() {
  const items = getFilteredSorted();
  listEl.innerHTML = "";

  countEl.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  emptyEl.hidden = items.length !== 0;

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "list-item";

    const allowEdit = canEditItem(item);

    li.innerHTML = `
      <div class="top">
        <div>
          <strong>${safeText(item.title)}</strong>
          <div class="muted">
            ${safeText(item.referenceCode)} • ${safeText(item.location)} • ${safeText(item.date)}
          </div>
          <div class="badges">
            <span class="badge ${badgeClass(item.category, "category")}">${safeText(item.category)}</span>
            <span class="badge ${badgeClass(item.status, "status")}">${safeText(item.status)}</span>
          </div>
        </div>

        <div class="actions">
          <a class="btn btn-ghost" href="details.html?id=${encodeURIComponent(item.id)}">Details</a>

          ${
            allowEdit
              ? `
                <button class="btn btn-ghost" data-act="status" data-id="${item.id}">Update Status</button>
                <button class="btn btn-danger" data-act="delete" data-id="${item.id}">Delete</button>
              `
              : ""
          }
        </div>
      </div>
    `;

    listEl.appendChild(li);
  }
}

async function refresh() {
  try {
    allItems = await apiGetItems();
    renderList();
  } catch (err) {
    console.error(err);
    alert(err.message || "Failed to load items");
  }
}

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const act = btn.dataset.act;

  // 双保险：就算别人用 devtools 硬插按钮，也挡掉
  const item = allItems.find((x) => x.id === id);
  if (!item) return;

  if (!canEditItem(item)) {
    alert("你没有权限修改这个 report（只有创建者可以）。");
    return;
  }

  try {
    if (act === "delete") {
      const yes = confirm("Delete this report?");
      if (!yes) return;
      await apiDeleteItem(id);
      await refresh();
    }

    if (act === "status") {
      const next = nextStatus(item.status);
      await apiUpdateStatus(id, next);
      alert(`Status updated to ${next}`);
      await refresh();
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Action failed");
  }
});

[filterStatus, sortBy].forEach((x) => x.addEventListener("change", renderList));
searchInput.addEventListener("input", renderList);

(async () => {
  requireLogin();           // 未登录踢回 login
  await waitForAuthReady(); // 等 Firebase 把 currentUser 填好
  await refresh();          // 再加载列表
})();