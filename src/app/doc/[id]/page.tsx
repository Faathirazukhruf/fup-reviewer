"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DB, loadDB, saveDB, nowISO, uid, CellComment } from "@/lib/storage";

export default function DocPage(){
  const { id } = useParams<{id:string}>();
  const [db, setDb] = useState<DB>();
  const [selected, setSelected] = useState<{row:number; col:number} | null>(null);
  const [field, setField] = useState("");
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("");

  useEffect(()=>{ setDb(loadDB()); }, []);

  const doc = useMemo(()=> db?.documents.find(d=>d.id===id), [db, id]);
  const sheet = useMemo(()=> (db && id) ? db.sheets[id] : undefined, [db, id]);
  const cellComments = useMemo(()=> (db && id) ? db.comments.filter(c=>c.docId===id) : [] , [db, id]);

  const cellHasOpen = (r:number,c:number) =>
    cellComments.some(cc => cc.row===r && cc.col===c && cc.status==="Open");

  const addComment = () => {
    if (!db || !doc || !sheet || !selected) return alert("Pilih sel dulu");
    if (!comment.trim()) return;
    const colName = sheet.headers[selected.col] ?? "";
    const payload: CellComment = {
      id: uid("rv_"),
      docId: id!,
      row: selected.row,
      col: selected.col,
      field: field.trim() || colName,
      comment: comment.trim(),
      reviewer: reviewer.trim() || undefined,
      status: "Open",
      createdAt: nowISO()
    };
    const next = { ...db, comments: [payload, ...db.comments] };
    saveDB(next); setDb(next); setComment(""); setReviewer("");
  };

  const toggleStatus = (cid: string) => {
    if (!db) return;
    const next = { 
      ...db, 
      comments: db.comments.map(c => 
        c.id === cid 
          ? { ...c, status: (c.status === "Open" ? "Resolved" : "Open") as "Open" | "Resolved" } 
          : c
      ) 
    };
    saveDB(next); 
    setDb(next);
  };

  if (!db || !doc) return null;

  return (
    <div>
      <Link href={`/dept/${doc.deptId}`} className="small">← Kembali</Link>
      <h2>{doc.title}</h2>
      {!!doc.fileUrl && <a className="btn btn--secondary btn--sm" style={{marginTop:6}} target="_blank" href={doc.fileUrl}>Open File</a>}

      {!sheet && (
        <>
          <hr />
          <div className="item">
            <div className="small">Belum ada data sheet. Kembali ke halaman Dokumen dan <b>Import CSV</b> untuk dokumen ini.</div>
          </div>
        </>
      )}

      {sheet && (
        <>
          <hr />
          <div className="small">Klik sel untuk memberi komentar. Titik merah = ada komentar Open.</div>
          <div style={{overflowX:"auto",marginTop:8}}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  {sheet.headers.map((h, i)=>(<th key={i}>{h}</th>))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, rIdx)=>(
                  <tr key={rIdx}>
                    <td>{rIdx+1}</td>
                    {sheet.headers.map((_, cIdx)=>{
                      const val = row[cIdx] ?? "";
                      const sel = selected && selected.row===rIdx && selected.col===cIdx;
                      return (
                        <td
                          key={cIdx}
                          className={`cell ${sel ? "selected" : ""}`}
                          onClick={()=> setSelected({row:rIdx, col:cIdx})}
                        >
                          {val || <span className="small" style={{opacity:.6}}>-</span>}
                          {cellHasOpen(rIdx,cIdx) && <span className="dot" title="Open comments" />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr />
          <h3>Tambah Komentar (per-sel)</h3>
          <div className="grid">
            <div className="small">
              Sel terpilih: {selected ? `Row ${selected.row+1} • Col ${selected.col+1} (${sheet.headers[selected.col]||"-"})` : "-"}
            </div>
            <div className="grid2">
              <input placeholder="Kolom (opsional)" value={field} onChange={e=>setField(e.target.value)} />
              <input placeholder="Nama/Email (opsional)" value={reviewer} onChange={e=>setReviewer(e.target.value)} />
            </div>
            <textarea placeholder="Tulis komentar…" value={comment} onChange={e=>setComment(e.target.value)} />
            <div className="actions">
              <button className="btn btn--success" onClick={addComment}>Kirim</button>
            </div>
          </div>

          <hr />
          <h3>Semua Komentar</h3>
          <div className="list">
            {cellComments.length===0 && <div className="small">Belum ada komentar.</div>}
            {cellComments.map(c=>(
              <div key={c.id} className="item">
                <div className="small">
                  {new Date(c.createdAt).toLocaleString()} • {c.reviewer||"—"} • Row {c.row+1}, Col {c.col+1} {c.field?`(${c.field})`:""}
                </div>
                <div style={{margin:"6px 0"}}><b>{c.comment}</b></div>
                <div className="actions">
                  <span className="badge" style={{
                    borderColor: c.status==="Open"?"#ff9e9e":"#61e1a1",
                    color: c.status==="Open"?"#ff9e9e":"#61e1a1"
                  }}>{c.status}</span>
                  <button className="btn btn--secondary btn--sm" onClick={()=>toggleStatus(c.id)}>
                    {c.status==="Open"?"Mark Resolved":"Reopen"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
