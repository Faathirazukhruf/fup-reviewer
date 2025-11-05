"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  createDocument, deleteDocument, listDocuments, updateDocument
} from "@/app/actions";

function toDate(v:any){ const d = v ? new Date(v) : null; return (d && !isNaN(d.getTime()))? d : null; }
function toYMD(v:any){ const d=toDate(v); return d? d.toISOString().slice(0,10): ""; }
function toLocal(v:any){ const d=toDate(v); return d? d.toLocaleString(): "-"; }

export default function DeptPage(){
  const { id } = useParams<{id:string}>();
  const deptId = id;

  const [docs, setDocs] = useState<any[]>([]);
  // create/edit form
  const [editing, setEditing] = useState<string|null>(null);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh(){ setDocs(await listDocuments(deptId)); }
  useEffect(()=>{ refresh(); },[deptId]);

  function startEdit(d:any){
    setEditing(d.id);
    setTitle(d.title || "");
    setFileUrl(d.file_url || "");
    setDate(toYMD(d.created_at));
    setDueDate(toYMD(d.due_date));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSave(){
    const fd = new FormData();
    fd.set("deptId", deptId);
    fd.set("title", title.trim());
    fd.set("fileUrl", fileUrl.trim());
    fd.set("date", date);
    fd.set("dueDate", dueDate);
    const f = fileRef.current?.files?.[0]; if (f) fd.set("file", f);

    if (editing){ fd.set("id", editing); await updateDocument(fd); }
    else { await createDocument(fd); }

    setEditing(null); setTitle(""); setFileUrl(""); setDate(""); setDueDate("");
    if (fileRef.current) fileRef.current.value = "";
    await refresh();
  }

  async function onDelete(docId:string){
    if(!confirm("Hapus dokumen ini?")) return;
    await deleteDocument(docId, deptId); await refresh();
  }

  return (
    <div className="container">
      <div className="card">
        <Link href="/" className="small">← Kembali</Link>
        <h2>Dokumen • {deptId}</h2>

        {/* Form */}
        <div className="grid2">
  <input
    placeholder="(Opsional) Link PDF/Drive/GSheet"
    value={fileUrl}
    onChange={(e) => setFileUrl(e.target.value)}
  />
  <div style={{display:"flex", flexDirection:"column"}}>
    <label className="small" style={{marginBottom:4}}>Tanggal Dibuat</label>
    <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
  </div>
</div>

<div className="grid2">
  <input type="file" ref={fileRef} accept=".xls,.xlsx,.pdf" />
  <div style={{display:"flex", flexDirection:"column"}}>
    <label className="small" style={{marginBottom:4}}>Due Date</label>
    <input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} />
  </div>
</div>

        <hr />

        {/* List */}
        <div className="list">
          {docs.map(d=>(
            <div key={d.id} className="item">
              <div className="item__header">
                <div>
                  <div className="item__title">{d.title}</div>
                  <div className="item__meta">Tanggal: {toLocal(d.created_at)} {d.due_date? `• Due: ${toLocal(d.due_date)}`: ""}</div>
                </div>
                <div className="actions actions--right">
                  {d.has_file
                    ? <a className="btn small" href={`/api/doc-file/get-file?id=${d.id}`} target="_blank">Open File</a>
                    : (d.file_url && <a className="btn small" href={d.file_url} target="_blank">Open Link</a>)
                  }
                  <button className="btn small" style={{background:"#ff9bff", color:"#000"}} onClick={()=>startEdit(d)}>Edit</button>
                  <button className="btn small btn--danger" onClick={()=>onDelete(d.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!docs.length && <div className="small">Belum ada dokumen.</div>}
        </div>
      </div>
    </div>
  );
}
