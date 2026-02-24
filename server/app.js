import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { db } from "./firebase.js";
import itemsRouter from "./routes/items.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/ping", async (req, res) => {
  const snap = await db.collection("items").limit(1).get();
  res.json({ ok: true, itemsCount: snap.size });
});

app.use("/api/items", itemsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`));