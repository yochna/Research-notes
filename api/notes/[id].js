const { connectDB, Note } = require("../db");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: "DB connection failed: " + err.message });
  }

  const { id } = req.query;

  if (req.method === "PATCH") {
    try {
      const note = await Note.findByIdAndUpdate(id, req.body, { new: true });
      if (!note) return res.status(404).json({ error: "Note not found." });
      return res.status(200).json(note);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await Note.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: "Note not found." });
      return res.status(200).json({ message: "Deleted." });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
