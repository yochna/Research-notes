const { connectDB, Note } = require("./db");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: "DB connection failed: " + err.message });
  }

  if (req.method === "GET") {
    const { tag, search } = req.query;
    try {
      let filter = {};
      if (tag) filter.tag = tag.toLowerCase();
      if (search) filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
      const notes = await Note.find(filter).sort({ pinned: -1, createdAt: -1 });
      return res.status(200).json(notes);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    const { title, description, tag } = req.body;
    if (!title || !description || !tag)
      return res.status(400).json({ error: "All fields required." });
    try {
      const note = await Note.create({ title, description, tag });
      return res.status(201).json(note);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
