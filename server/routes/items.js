import express from "express";
import { body, param, query } from "express-validator";
import xss from "xss";
import { db } from "../firebase.js";
import { validate } from "../middleware/validate.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();
const col = db.collection("items");
const counters = db.collection("counters");

// 生成 L-001 / F-001（用 transaction 保证不会重复）
async function nextRefCode(category) {
  const prefix = category === "Lost" ? "L" : "F";
  const counterDocId = category.toLowerCase(); // "lost" | "found"
  const ref = counters.doc(counterDocId);

  const n = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data().seq ?? 0) : 0;
    const next = current + 1;
    tx.set(ref, { seq: next }, { merge: true });
    return next;
  });

  return `${prefix}-${String(n).padStart(3, "0")}`;
}

function cleanText(v) {
  return xss(String(v ?? "").trim());
}

function pickPayload(req) {
  return {
    title: cleanText(req.body.title),
    description: cleanText(req.body.description),
    category: cleanText(req.body.category),
    location: cleanText(req.body.location),
    date: cleanText(req.body.date),
    contact: cleanText(req.body.contact),
    status: cleanText(req.body.status),
  };
}

// GET /api/items?category=Lost&status=Active&q=xxx
// GET /api/items?category=Lost&status=Active&q=xxx
router.get(
  "/",
  [
    query("category").optional().isIn(["Lost", "Found"]),
    query("status").optional().isIn(["Active", "Claimed", "Resolved"]),
    query("q").optional().isLength({ max: 80 }),
    validate,
  ],
  async (req, res) => {
    const { category, status, q } = req.query;

    let ref = col;
    if (category) ref = ref.where("category", "==", category);
    if (status) ref = ref.where("status", "==", status);

    const snap = await ref.get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // search (optional)
    if (q) {
      const qq = String(q).toLowerCase();
      items = items.filter(it => {
        const hay = `${it.referenceCode ?? ""} ${it.title ?? ""} ${it.location ?? ""} ${it.description ?? ""}`.toLowerCase();
        return hay.includes(qq);
      });
    }

    // sort newest first (by date then createdAt)
    items.sort((a, b) => {
      const da = String(a.date ?? "");
      const dbb = String(b.date ?? "");
      if (dbb !== da) return dbb.localeCompare(da);
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

    res.json({ ok: true, items });
  }
);

// GET /api/items/:id
router.get(
  "/:id",
  [param("id").isString().isLength({ min: 6, max: 64 }), validate],
  async (req, res) => {
    const doc = await col.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ ok: false, msg: "Not found" });
    return res.json({ ok: true, item: { id: doc.id, ...doc.data() } });
  }
);

// POST /api/items
router.post(
  "/",
   requireAuth,
  [
    body("title").isString().isLength({ min: 3, max: 60 }),
    body("description").isString().isLength({ min: 10, max: 500 }),
    body("category").isIn(["Lost", "Found"]),
    body("location").isString().isLength({ min: 3, max: 80 }),
    body("date").isString().isLength({ min: 8, max: 10 }),
    body("contact").isString().isLength({ min: 3, max: 120 }),
    body("status").isIn(["Active", "Claimed", "Resolved"]),
    validate,
  ],
  async (req, res) => {
    const payload = pickPayload(req);
    const now = Date.now();

    const referenceCode = await nextRefCode(payload.category);

    const docRef = col.doc(); // auto id
    const item = {
      ...payload,
      referenceCode,
      createdAt: now,
      updatedAt: now,

      ownerUid: req.user.uid,
      ownerEmail: req.user.email,
    };

    await docRef.set(item);
    res.status(201).json({ ok: true, item: { id: docRef.id, ...item } });
  }
);

// PUT /api/items/:id (edit whole item)
router.put(
  "/:id",
  requireAuth,
  [
    param("id").isString().isLength({ min: 6, max: 64 }),
    body("title").isString().isLength({ min: 3, max: 60 }),
    body("description").isString().isLength({ min: 10, max: 500 }),
    body("location").isString().isLength({ min: 3, max: 80 }),
    body("date").isString().isLength({ min: 8, max: 10 }),
    body("contact").isString().isLength({ min: 3, max: 120 }),
    body("status").isIn(["Active", "Claimed", "Resolved"]),
    validate,
  ],
  async (req, res) => {
    const id = req.params.id;
    const docRef = col.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ ok: false, msg: "Not found" });

    const existing = snap.data();

    if (existing.ownerUid !== req.user.uid) {
    return res.status(403).json({ ok: false, msg: "Forbidden" });
}
    const now = Date.now();

    // category / referenceCode 不允许被改（保持你要求的 Lost item 1 / Found item 1 逻辑）
    const update = {
      title: cleanText(req.body.title),
      description: cleanText(req.body.description),
      location: cleanText(req.body.location),
      date: cleanText(req.body.date),
      contact: cleanText(req.body.contact),
      status: cleanText(req.body.status),
      updatedAt: now,
      category: existing.category,
      referenceCode: existing.referenceCode,
      createdAt: existing.createdAt ?? now,
    };

    await docRef.set(update, { merge: true });
    res.json({ ok: true, item: { id, ...update } });
  }
);

// PATCH /api/items/:id/status
router.patch(
  "/:id/status",
   requireAuth,
  [
    param("id").isString().isLength({ min: 6, max: 64 }),
    body("status").isIn(["Active", "Claimed", "Resolved"]),
    validate,
  ],
  async (req, res) => {
    const id = req.params.id;
    const docRef = col.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ ok: false, msg: "Not found" });
    const existing = snap.data();

    if (existing.ownerUid !== req.user.uid) {
      return res.status(403).json({ ok: false, msg: "Forbidden" });
}

    await docRef.update({
      status: cleanText(req.body.status),
      updatedAt: Date.now(),
    });

    const after = await docRef.get();
    res.json({ ok: true, item: { id, ...after.data() } });
  }
);

// DELETE /api/items/:id
router.delete(
  "/:id",
  requireAuth,
  [param("id").isString().isLength({ min: 6, max: 64 }), validate],
  async (req, res) => {
    const id = req.params.id;
    const docRef = col.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ ok: false, msg: "Not found" });

    const existing = snap.data();

    if (existing.ownerUid !== req.user.uid) {
      return res.status(403).json({ ok: false, msg: "Forbidden" });
}

    await docRef.delete();
    res.json({ ok: true });
  }
);

export default router;