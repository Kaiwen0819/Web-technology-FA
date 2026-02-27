import admin from "firebase-admin";

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, msg: "Missing token" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    };

    next();
  } catch (err) {
    return res.status(401).json({ ok: false, msg: "Invalid token" });
  }
}

export default requireAuth;