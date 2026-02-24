"use strict";

const LF_STORAGE_KEY = "lf_items_v1";

export function safeText(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function nowISODate() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 10);
}

export function loadItems() {
  try { return JSON.parse(localStorage.getItem(LF_STORAGE_KEY)) ?? []; }
  catch { return []; }
}

export function saveItems(items) {
  localStorage.setItem(LF_STORAGE_KEY, JSON.stringify(items));
}

export function upsertItem(payload) {
  const items = loadItems();
  const idx = items.findIndex(x => x.id === payload.id);
  if (idx >= 0) items[idx] = payload;
  else items.unshift(payload);
  saveItems(items);
}

export function deleteItem(id) {
  saveItems(loadItems().filter(x => x.id !== id));
}

export function getItem(id) {
  return loadItems().find(x => x.id === id) ?? null;
}

export function cycleStatus(id) {
  const items = loadItems();
  const idx = items.findIndex(x => x.id === id);
  if (idx < 0) return null;

  const current = items[idx].status;
  const next =
    current === "Active" ? "Claimed" :
    current === "Claimed" ? "Resolved" :
    "Active";

  items[idx].status = next;
  items[idx].updatedAt = Date.now();
  saveItems(items);
  return next;
}

export function seedDemo() {
  const items = loadItems();
  const demo = [
    {
      id: crypto.randomUUID(),
      title: "Blue Water Bottle",
      description: "Transparent blue bottle with sticker 'QIU'. Found near cafeteria seats.",
      category: "Found",
      location: "Cafeteria",
      date: nowISODate(),
      contact: "012-3456789",
      status: "Active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      title: "Black Wallet",
      description: "Leather wallet, contains student card. Lost around library entrance.",
      category: "Lost",
      location: "Library Entrance",
      date: nowISODate(),
      contact: "student@example.com",
      status: "Active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  saveItems(demo.concat(items));
}