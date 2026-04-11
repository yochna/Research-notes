const { connectDB, Note } = require("./db");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: "DB connection failed: " + err.message });
  }

  if (req.method === "GET") {
    try {
      const tags = await Note.distinct("tag");
      return res.status(200).json(tags);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
