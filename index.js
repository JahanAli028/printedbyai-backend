const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("PrintedByAI backend is running");
});

// ✅ ADD THIS ROUTE TO FIX THE PROXY:
app.post("/api/proxy-image", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return res.status(400).json({ error: "Invalid imageUrl" });
  }

  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Image fetch failed");

    const buffer = await imageRes.arrayBuffer();
    res.set("Content-Type", "image/png");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy fetch failed:", err);
    res.status(500).json({ error: "Proxy fetch failed" });
  }
});

app.listen(3000, () => {
  console.log("Backend running on port 3000");
});
