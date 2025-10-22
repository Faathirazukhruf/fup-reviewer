"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createDocument, deleteDocument, listDocuments, updateDocument, DocumentRow } from "@/app/actions";

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function toYMD(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d ? d.toISOString().slice(0, 10) : "";
}
function toLocal(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d ? d.toLocaleString() : "-";
}

export default function DeptPage() {
  const { id, gid } = useParams<{ id: string; gid: string }>();
  const deptId = id;
  const groupId = gid;

  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const list = await listDocuments(deptId, groupId);
    setDocs(list);
  }, [deptId, groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function startEdit(d: DocumentRow) {
    setEditing(d.id);
    setTitle(d.title || "");
    setFileUrl(d.file_url || "");
    setDate(toYMD(d.created_at));
    setDueDate(toYMD(d.due_date));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSave() {
    const fd = new FormData();
    fd.set("deptId", deptId);
    fd.set("groupId", groupId);
    fd.set("title", title.trim());
    fd.set("fileUrl", fileUrl.trim());
    fd.set("date", date);
    fd.set("dueDate", dueDate);
    const f = fileRef.current?.files?.[0];
    if (f) fd.set("file", f);

    if (editing) {
      fd.set("id", editing);
      await updateDocument(fd);
    } else {
      await createDocument(fd);
    }

    setEditing(null);
    setTitle("");
    setFileUrl("");
    setDate("");
    setDueDate("");
    if (fileRef.current) fileRef.current.value = "";
    void refresh();
  }

  async function onDelete(docId: string) {
    if (!confirm("Hapus dokumen ini?")) return;
    await deleteDocument(docId, deptId, groupId);
    void refresh();
  }

  return (
    <div className="container">
      <div className="card">
        <Link href={`/g/${groupId}`} className="small">
          ← Kembali
        </Link>
        <h2>
          Dokumen • {deptId} • {groupId}
        </h2>

        {/* FORM */}
        <div className="grid" style={{ marginBottom: 16 }}>
          <input
            placeholder="Judul dokumen"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid2">
            <input
              placeholder="(Opsional) Link PDF/Drive/GSheet"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label className="small" style={{ marginBottom: 4 }}>
                Tanggal Dibuat
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid2">
            <input type="file" ref={fileRef} accept=".xls,.xlsx,.pdf" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label className="small" style={{ marginBottom: 4 }}>
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="actions">
            <button className="btn" onClick={onSave}>
              {editing ? "Simpan Perubahan" : "Simpan"}
            </button>
            {editing && (
              <button
                className="btn btn--secondary"
                onClick={() => {
                  setEditing(null);
                  setTitle("");
                  setFileUrl("");
                  setDate("");
                  setDueDate("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Batal
              </button>
            )}
          </div>
        </div>

        <hr />

        {/* LIST */}
        <div className="list">
          {docs.map((d) => {
            const overdue = !!(d.due_date && new Date(d.due_date) < new Date());
            return (
              <div key={d.id} className="item">
                <div className="item__header">
                  <div>
                    <div className="item__title">{d.title}</div>
                    <div className="item__meta">
                      Dibuat: {toLocal(d.created_at)}
                      {d.due_date && (
                        <>
                          {" • "}Tenggat:{" "}
                          <span
                            style={{
                              color: overdue ? "#ff7b7b" : "#61e1a1",
                              fontWeight: 500,
                            }}
                          >
                            {toYMD(d.due_date)}
                            {overdue ? " (Overdue)" : ""}
                          </span>
                        </>
                      )}
                      {d.file_url && (
                        <>
                          {" • "}
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Link
                          </a>
                        </>
                      )}
                      {d.has_file && (
                        <>
                          {" • "}
                          <a
                            href={`/api/doc-file/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open File
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="actions actions--right">
                    <Link
                      href={`/doc/${d.id}`}
                      className="btn small"
                      style={{ background: "#ffb0ff", color: "#000" }}
                    >
                      Review
                    </Link>
                    <button
                      className="btn small"
                      style={{ background: "#ffd966", color: "#000" }}
                      onClick={() => startEdit(d)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn small btn--danger"
                      onClick={() => onDelete(d.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!docs.length && (
            <div className="small">Belum ada dokumen untuk departemen ini.</div>
          )}
        </div>
      </div>
    </div>
  );
}
