import React, { useState, useEffect, useCallback } from "react";

// On Vercel, frontend and API are on the same domain — use relative /api path
const API = "/api";

const TAG_PALETTE = {
  ai:       { bg: "#1a2e1a", text: "#4ade80", border: "#166534" },
  ml:       { bg: "#1a1f2e", text: "#60a5fa", border: "#1e3a5f" },
  nlp:      { bg: "#2e1a2a", text: "#f472b6", border: "#6b21a8" },
  data:     { bg: "#2e2210", text: "#fb923c", border: "#7c2d12" },
  web:      { bg: "#1e1a2e", text: "#a78bfa", border: "#4c1d95" },
  cv:       { bg: "#1a2a2e", text: "#22d3ee", border: "#164e63" },
  research: { bg: "#2a2010", text: "#fbbf24", border: "#78350f" },
  default:  { bg: "#1a1a1a", text: "#9ca3af", border: "#374151" },
};

const QUICK_TAGS = ["AI", "ML", "NLP", "Data", "Web", "CV", "Research"];

function tagColor(tag) {
  return TAG_PALETTE[tag?.toLowerCase()] || TAG_PALETTE.default;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function EditModal({ note, onClose, onSave }) {
  const [form, setForm] = useState({ title: note.title, description: note.description, tag: note.tag });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title || !form.description || !form.tag) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/notes/${note._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      onSave(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>Edit Note</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <Field label="Title">
            <input style={S.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea style={{ ...S.input, minHeight: 120, resize: "vertical" }}
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Tag">
            <input style={S.input} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.submitBtn, flex: 1 }} onClick={save} disabled={saving} className="submit-btn">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button style={{ ...S.submitBtn, background: "#1e1e1e", border: "1px solid #333" }} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

export default function App() {
  const [notes, setNotes]         = useState([]);
  const [tags, setTags]           = useState([]);
  const [activeTag, setActiveTag] = useState("all");
  const [search, setSearch]       = useState("");
  const [form, setForm]           = useState({ title: "", description: "", tag: "" });
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [toast, setToast]         = useState(null);
  const [editNote, setEditNote]   = useState(null);
  const [view, setView]           = useState("grid");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNotes = useCallback(async (tag = "all", q = "") => {
    setFetching(true);
    try {
      let url = `${API}/notes`;
      const params = [];
      if (tag !== "all") params.push(`tag=${tag}`);
      if (q) params.push(`search=${encodeURIComponent(q)}`);
      if (params.length) url += "?" + params.join("&");
      const res = await fetch(url);
      setNotes(await res.json());
    } catch {
      showToast("Cannot reach server.", "error");
    } finally {
      setFetching(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tags`);
      setTags(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchNotes(); fetchTags(); }, [fetchNotes, fetchTags]);

  useEffect(() => {
    const t = setTimeout(() => fetchNotes(activeTag, search), 300);
    return () => clearTimeout(t);
  }, [search, activeTag, fetchNotes]);

  const handleFilter = (tag) => { setActiveTag(tag); fetchNotes(tag, search); };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.tag.trim()) {
      showToast("All fields are required.", "error"); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm({ title: "", description: "", tag: "" });
      showToast("Note saved!");
      await fetchNotes(activeTag, search);
      await fetchTags();
    } catch {
      showToast("Failed to add note.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/notes/${id}`, { method: "DELETE" });
      setNotes(prev => prev.filter(n => n._id !== id));
      await fetchTags();
      showToast("Note deleted.");
    } catch {
      showToast("Delete failed.", "error");
    }
  };

  const handlePin = async (note) => {
    try {
      const res = await fetch(`${API}/notes/${note._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      const updated = await res.json();
      setNotes(prev => prev.map(n => n._id === updated._id ? updated : n));
    } catch {}
  };

  const handleEditSave = (updated) => {
    setNotes(prev => prev.map(n => n._id === updated._id ? updated : n));
    showToast("Note updated!");
    fetchTags();
  };

  const pinnedNotes  = notes.filter(n => n.pinned);
  const regularNotes = notes.filter(n => !n.pinned);

  return (
    <div style={S.root}>
      <div style={S.grain} />
      <div style={S.glow1} />
      <div style={S.glow2} />

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#2d1a1a" : "#1a2d1a", borderColor: toast.type === "error" ? "#7f1d1d" : "#14532d" }}>
          <span style={{ color: toast.type === "error" ? "#f87171" : "#4ade80" }}>{toast.type === "error" ? "⚠" : "✓"}</span>
          {toast.msg}
        </div>
      )}

      {editNote && <EditModal note={editNote} onClose={() => setEditNote(null)} onSave={handleEditSave} />}

      <div style={S.container}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>MongoDB · Serverless · React</div>
            <h1 style={S.title}>Research Notes</h1>
          </div>
          <div style={S.headerRight}>
            <div style={S.statPill}>{notes.length} {notes.length === 1 ? "note" : "notes"}</div>
            <div style={S.statPill}>{tags.length} {tags.length === 1 ? "tag" : "tags"}</div>
            <button style={{ ...S.viewToggle, background: view === "grid" ? "#222" : "transparent" }} onClick={() => setView("grid")}>⊞</button>
            <button style={{ ...S.viewToggle, background: view === "list" ? "#222" : "transparent" }} onClick={() => setView("list")}>☰</button>
          </div>
        </header>

        <div style={S.layout}>
          <aside style={S.sidebar}>
            <div style={S.panel}>
              <div style={S.panelLabel}>NEW NOTE</div>
              <Field label="Title">
                <input style={S.input} value={form.title} placeholder="e.g. Attention Is All You Need"
                  onChange={e => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Description">
                <textarea style={{ ...S.input, minHeight: 100, resize: "vertical" }}
                  value={form.description} placeholder="Key ideas, findings, links…"
                  onChange={e => setForm({ ...form, description: e.target.value })} />
                <div style={S.charCount}>{form.description.length} chars</div>
              </Field>
              <Field label="Tag">
                <input style={S.input} value={form.tag} placeholder="Custom tag…"
                  onChange={e => setForm({ ...form, tag: e.target.value })} />
                <div style={S.quickTags}>
                  {QUICK_TAGS.map(t => {
                    const c = tagColor(t);
                    return (
                      <button key={t} className="tag-quick"
                        style={{ ...S.quickTag, background: c.bg, color: c.text, borderColor: c.border }}
                        onClick={() => setForm({ ...form, tag: t })}>{t}</button>
                    );
                  })}
                </div>
              </Field>
              <button style={S.submitBtn} className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : "+ Save Note"}
              </button>
            </div>

            <div style={{ ...S.panel, marginTop: 16 }}>
              <div style={S.panelLabel}>FILTER BY TAG</div>
              <div style={S.tagList}>
                <button style={{ ...S.filterBtn, ...(activeTag === "all" ? S.filterBtnActive : {}) }}
                  className="filter-btn" onClick={() => handleFilter("all")}>
                  All notes <span style={S.filterCount}>{notes.length}</span>
                </button>
                {tags.map(tag => {
                  const c = tagColor(tag);
                  const count = notes.filter(n => n.tag === tag).length;
                  return (
                    <button key={tag} className="filter-btn"
                      style={{ ...S.filterBtn, ...(activeTag === tag ? { background: c.bg, color: c.text, borderColor: c.border } : {}) }}
                      onClick={() => handleFilter(tag)}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, display: "inline-block" }} />
                        {tag}
                      </span>
                      <span style={S.filterCount}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <main style={{ flex: 1, minWidth: 0 }}>
            <div style={S.searchWrap}>
              <span style={S.searchIcon}>⌕</span>
              <input style={S.searchInput} placeholder="Search notes…"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button style={S.clearSearch} onClick={() => setSearch("")}>✕</button>}
            </div>

            {fetching ? (
              <div style={S.empty}>
                <div style={{ animation: "pulse 1.4s ease infinite", fontSize: 32 }}>◌</div>
                <div style={{ marginTop: 12 }}>Loading…</div>
              </div>
            ) : notes.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>∅</div>
                <div style={{ color: "#555", fontSize: 15 }}>
                  {search ? `No results for "${search}"` : activeTag !== "all" ? `No notes tagged "${activeTag}"` : "No notes yet. Add your first one →"}
                </div>
              </div>
            ) : (
              <>
                {pinnedNotes.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={S.sectionLabel}>📌 Pinned</div>
                    <NoteGrid notes={pinnedNotes} view={view} onDelete={handleDelete} onPin={handlePin} onEdit={setEditNote} />
                  </div>
                )}
                {regularNotes.length > 0 && (
                  <div>
                    {pinnedNotes.length > 0 && <div style={S.sectionLabel}>Recent</div>}
                    <NoteGrid notes={regularNotes} view={view} onDelete={handleDelete} onPin={handlePin} onEdit={setEditNote} />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function NoteGrid({ notes, view, onDelete, onPin, onEdit }) {
  return (
    <div style={view === "grid" ? S.grid : S.listView}>
      {notes.map((note, i) => (
        <NoteCard key={note._id} note={note} listMode={view === "list"}
          style={{ animationDelay: `${i * 40}ms` }}
          onDelete={onDelete} onPin={onPin} onEdit={onEdit} />
      ))}
    </div>
  );
}

function NoteCard({ note, listMode, style, onDelete, onPin, onEdit }) {
  const c = tagColor(note.tag);
  return (
    <div className="note-card" style={{ ...S.card, ...(listMode ? S.cardList : {}), ...(note.pinned ? { borderColor: "#ffd70033" } : {}), ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ ...S.tag, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>#{note.tag}</span>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="pin-btn" title={note.pinned ? "Unpin" : "Pin"}
            style={{ ...S.iconBtn, color: note.pinned ? "#ffd700" : "#444" }} onClick={() => onPin(note)}>📌</button>
          <button className="edit-btn" title="Edit"
            style={{ ...S.iconBtn, color: "#555" }} onClick={() => onEdit(note)}>✎</button>
          <button className="delete-btn" title="Delete"
            style={{ ...S.iconBtn, color: "#444" }} onClick={() => onDelete(note._id)}>✕</button>
        </div>
      </div>
      <h3 style={S.cardTitle}>{note.title}</h3>
      <p style={S.cardDesc}>{note.description}</p>
      <div style={S.cardMeta}>{timeAgo(note.createdAt)}</div>
    </div>
  );
}

const S = {
  root: { minHeight: "100vh", background: "#0d0d0d", color: "#e5e5e5", fontFamily: "'JetBrains Mono', monospace", position: "relative", overflowX: "hidden" },
  grain: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")" },
  glow1: { position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,200,100,0.04), transparent 70%)", pointerEvents: "none", zIndex: 0 },
  glow2: { position: "fixed", bottom: -200, left: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,100,255,0.04), transparent 70%)", pointerEvents: "none", zIndex: 0 },
  toast: { position: "fixed", top: 20, right: 20, zIndex: 1000, padding: "12px 20px", borderRadius: 10, border: "1px solid", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, display: "flex", alignItems: "center", gap: 10, animation: "fadeSlideIn 0.3s ease" },
  container: { maxWidth: 1200, margin: "0 auto", padding: "36px 24px", position: "relative", zIndex: 1 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, borderBottom: "1px solid #1e1e1e", paddingBottom: 24 },
  eyebrow: { fontSize: 10, color: "#444", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, color: "#f5f0e8", letterSpacing: "-1px", margin: 0 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  statPill: { background: "#141414", border: "1px solid #222", borderRadius: 20, padding: "5px 14px", fontSize: 11, color: "#666" },
  viewToggle: { border: "1px solid #222", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#888", fontSize: 16, transition: "background 0.15s" },
  layout: { display: "flex", gap: 24, alignItems: "flex-start" },
  sidebar: { width: 280, flexShrink: 0 },
  panel: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 20 },
  panelLabel: { fontSize: 9, color: "#444", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16, borderBottom: "1px solid #1a1a1a", paddingBottom: 10 },
  label: { fontSize: 10, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase" },
  input: { background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, padding: "9px 12px", color: "#ddd", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", width: "100%", transition: "border-color 0.2s" },
  charCount: { fontSize: 10, color: "#333", textAlign: "right", marginTop: 4 },
  quickTags: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 },
  quickTag: { fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid", cursor: "pointer", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" },
  submitBtn: { width: "100%", padding: "11px", background: "#b8975a", color: "#0d0d0d", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", transition: "background 0.2s" },
  tagList: { display: "flex", flexDirection: "column", gap: 4 },
  filterBtn: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "1px solid #1a1a1a", borderRadius: 6, padding: "7px 10px", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s", textAlign: "left" },
  filterBtnActive: { background: "#1e1e1e", color: "#e5e5e5", borderColor: "#333" },
  filterCount: { background: "#1a1a1a", borderRadius: 10, padding: "1px 7px", fontSize: 10, color: "#444" },
  searchWrap: { position: "relative", marginBottom: 20, display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: 14, color: "#444", fontSize: 20, lineHeight: 1 },
  searchInput: { width: "100%", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 44px", color: "#ddd", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", transition: "border-color 0.2s" },
  clearSearch: { position: "absolute", right: 14, background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 13 },
  empty: { textAlign: "center", padding: "80px 20px", color: "#333", fontSize: 14, fontFamily: "'JetBrains Mono', monospace" },
  sectionLabel: { fontSize: 10, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  listView: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10 },
  cardList: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  tag: { fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 4, letterSpacing: "0.08em" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "3px 5px", borderRadius: 5, transition: "color 0.15s" },
  cardTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: "#e5e5e5", lineHeight: 1.4, fontFamily: "'Playfair Display', serif" },
  cardDesc: { margin: 0, fontSize: 11.5, color: "#555", lineHeight: 1.7, flex: 1 },
  cardMeta: { fontSize: 10, color: "#333" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#111", border: "1px solid #222", borderRadius: 16, width: "100%", maxWidth: 480, margin: 20, animation: "fadeSlideIn 0.25s ease" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #1e1e1e" },
  modalTitle: { fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#e5e5e5" },
  closeBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16 },
  modalBody: { padding: 20 },
};
