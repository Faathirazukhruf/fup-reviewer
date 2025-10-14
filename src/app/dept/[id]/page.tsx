"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DB, Doc, loadDB, nowISO, saveDB, uid } from "@/lib/storage";

export default function DeptPage() {
  const { id } = useParams<{ id: string }>();
  const [db, setDb] = useState<DB>();

  // create form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");

  // edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editDate, setEditDate] = useState("");

  useEffect(() => { setDb(loadDB()); }, []);

  const docs = useMemo(() => {
    if (!db) return [];
    return db.documents
      .filter(d => d.deptId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db, id]);

  /** CREATE */
  const addDoc = () => {
    if (!db) return;
    const t = title.trim(); if (!t) return;

    const nextDoc: Doc = {
      id: uid("doc_"),
      deptId: id,
      title: t,
      fileUrl: url.trim() || undefined,
      createdAt: date || nowISO()
    };

    const next: DB = { ...db, documents: [nextDoc, ...db.documents] };
    saveDB(next); setDb(next);
    setTitle(""); setUrl(""); setDate("");
  };

  /** EDIT */
  const startEdit = (d: Doc) => {
    setEditingId(d.id);
    setEditTitle(d.title);
    setEditUrl(d.fileUrl || "");
    setEditDate((d.createdAt || "").slice(0, 10));
  };
  const cancelEdit = () => { setEditingId(null); setEditTitle(""); setEditUrl(""); setEditDate(""); };
  const saveEdit = () => {
    if (!db || !editingId) return;
    const next: DB = {
      ...db,
      documents: db.documents.map(doc =>
        doc.id === editingId
          ? {
              ...doc,
              title: editTitle.trim() || doc.title,
              fileUrl: editUrl.trim() || undefined,
              createdAt: editDate || doc.createdAt
            }
          : doc
      )
    };
    saveDB(next); setDb(next); cancelEdit();
  };

  /** DELETE (remove sheet + comments too) */
  const removeDoc = (docId: string) => {
    if (!db) return;
    if (!confirm("Hapus dokumen ini? (sheet & komentar juga akan dihapus)")) return;
    const next: DB = {
      ...db,
      documents: db.documents.filter(d => d.id !== docId),
      comments: db.comments.filter(c => c.docId !== docId),
      sheets: { ...db.sheets }
    };
    delete next.sheets[docId];
    saveDB(next); setDb(next);
    if (editingId === docId) cancelEdit();
  };

  /** IMPORT CSV */
  const importCSV = async (file: File, docId: string) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.length);
    const rows = lines.map(l => l.split(",").map(x => x.trim()));
    const headers = rows.shift() || [];
    const next = { ...db! };
    next.sheets[docId] = { headers, rows };
    saveDB(next); setDb(next);
    alert(`CSV diimport ke dokumen ${docId} • ${rows.length} baris`);
  };

  if (!db) return null;

  return (
    <div>
      <Link href="/" className="small">← Kembali</Link>
      <h2>Dokumen • {id}</h2>

      {/* CREATE */}
      <div className="grid">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul dokumen (mis. Protap 700-019)" />
        <div className="grid2">
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="(Opsional) Link PDF/Drive/GSheet" />
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} placeholder="Tanggal dokumen" />
        </div>
        <button className="btn btn--primary" onClick={addDoc}>Simpan</button>
      </div>

      <hr />

      {/* LIST */}
      <div className="list">
        {docs.map(d => {
          const isEditing = editingId === d.id;
          return (
            <div key={d.id} className="item">
              {!isEditing ? (
                <>
                  <div className="item__header">
                    <div>
                      <div className="item__title">{d.title}</div>
                      <div className="item__meta">Tanggal: {new Date(d.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="actions actions--right">
                      {d.fileUrl && <a className="btn btn--secondary btn--sm" target="_blank" href={d.fileUrl}>Open File</a>}
                      <Link className="btn btn--primary btn--sm" href={`/doc/${d.id}`}>Review</Link>
                      <button className="btn btn--secondary btn--sm" onClick={()=>startEdit(d)}>Edit</button>
                      <button className="btn btn--danger btn--sm" onClick={()=>removeDoc(d.id)}>Delete</button>
                    </div>
                  </div>

                  <div className="row" style={{marginTop:10}}>
                    <span className="small">Import CSV ke dokumen ini:</span>
                    <label className="input-file">
                      <input type="file" accept=".csv" onChange={e=>{
                        const f = e.target.files?.[0]; if(!f) return;
                        importCSV(f, d.id);
                        (e.currentTarget as HTMLInputElement).value = "";
                      }} />
                      <span>Pilih file…</span>
                    </label>
                  </div>
                </>
              ) : (
                <div className="grid">
                  <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Judul dokumen" />
                  <div className="grid2">
                    <input value={editUrl} onChange={e=>setEditUrl(e.target.value)} placeholder="(Opsional) Link PDF/Drive/GSheet" />
                    <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} />
                  </div>
                  <div className="actions">
                    <button className="btn btn--primary" onClick={saveEdit}>Simpan Perubahan</button>
                    <button className="btn btn--secondary" onClick={cancelEdit}>Batal</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
