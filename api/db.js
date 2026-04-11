const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}

const noteSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tag:         { type: String, required: true, trim: true, lowercase: true },
    pinned:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Note = mongoose.models.Note || mongoose.model("Note", noteSchema);

module.exports = { connectDB, Note };
