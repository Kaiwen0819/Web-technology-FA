"use strict";

const API_BASE = "https://web-technology-fa.onrender.com";

export function setActiveNav(page) {
  document.querySelectorAll("[data-nav]").forEach(a => {
    a.classList.toggle("active", a.dataset.nav === page);
  });
}

export function setYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

export async function renderQuickStats() {
  const totalEl = document.getElementById("statTotal");
  if (!totalEl) return;

  const lostEl = document.getElementById("statLost");
  const foundEl = document.getElementById("statFound");
  const activeEl = document.getElementById("statActive");

  try {
    const res = await fetch(`${API_BASE}/items`);
    const data = await res.json();

    if (!res.ok || !data.ok) return;

    const items = data.items ?? [];

    totalEl.textContent = String(items.length);
    lostEl.textContent = String(items.filter(x => x.category === "Lost").length);
    foundEl.textContent = String(items.filter(x => x.category === "Found").length);
    activeEl.textContent = String(items.filter(x => x.status === "Active").length);

  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}