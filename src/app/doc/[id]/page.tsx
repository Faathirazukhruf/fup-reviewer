"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addComment,
  getDocumentMeta,
  listComments,
  toggleComment,
  setDocumentDueDate,
} from "@/app/actions";

// helpers tanggal
function toDate(v: any): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function toYMD(v: any): string {
  const d = toDate(v);
  return d ? d.toISOString().slice(0, 10) : "";
}
function toLocal(v: any): string {
  const d = toDate(v);
  return d ? d.toLocaleString() : "-";
}
function dayDiff(from?: any, to?: any) {
  const a = toDate(from);
  const b = toDate(to ?? new Date());
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86400000);
}

export default function DocPage() {
  const { id } = useParams<{ id: string }>();

  // meta dokumen (judul, dept, due date, dll)
  const [meta, setMeta] = useState<{
    id: string;
    dept_id: string;
    title: string;
    file_url: string | null;
    has_file: boolean;
    created_at: string | null;
    due_date: string | null;
  } | null>(null);

  // sheet & komentar (punyamu)
  const [sheet, setSheet] = useState<{ headers: string[]; rows: string[][] }>({
    headers: [],
    rows: [],
  });
  const [comments, setComments] = useState<any[]>([]);
  const [sel, setSel] = useState<{ row: number; col: number } | null>(null);
  const [field, setField] = useState("");
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("");

  // form due date
  const [editDue, setEditDue] = useState("");

  useEffect(() => {
    (async () => {
      const m = await getDocumentMeta(id);
      setMeta(m);
      setEditDue(toYMD(m?.due_date));
      setSheet(m); // Using the same data from getDocumentMeta since it contains the document info
      setComments(await listComments(id));
    })();
  }, [id]);

  const isOverdue = useMemo(() => {
    if (!meta?.due_date) return false;
    const diff = dayDiff(meta.due_date, new Date());
    return diff !== null && diff > 0 && new Date(meta.due_date) < new Date();
  }, [meta?.due_date]);

  const daysLeft = useMemo(() => {
    if (!meta?.due_date) return null;
    const diff = dayDiff(new Date(), meta.due_date);
    return diff !== null ? -diff : null; // negatif kalau masa depan
  }, [meta?.due_date]);

  const hasOpen = (r: number, c: number) =>
    comments.some(
      (x) => x.row_index === r && x.col_index === c && x.status === "Open"
    );

  async function submitComment() {
    if (!sel || !comment.trim()) return;
    const fd = new FormData();
    fd.set("docId", id);
    fd.set("row", String(sel.row));
    fd.set("col", String(sel.col));
    fd.set("field", field);
    fd.set("comment", comment);
    fd.set("reviewer", reviewer);
    await addComment(fd);
    setComment("");
    setReviewer("");
    setField("");
    setComments(await listComments(id));
  }

  async function onToggle(cid: string) {
    await toggleComment(cid, id);
    setComments(await listComments(id));
  }

  async function saveDue() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("dueDate", editDue);
    await setDocumentDueDate(fd);
    const m = await getDocumentMeta(id);
    setMeta(m);
    setEditDue(toYMD(m?.due_date));
  }

  return (
    <div>
      <Link
        href={meta?.dept_id ? `/dept/${meta.dept_id}` : "/"}
        className="small"
      >
        ← Kembali
      </Link>
      <h2>Review Dokumen</h2>

      {/* Header meta dokumen */}
      <div className="item" style={{ marginBottom: 12 }}>
        <div className="item__header">
          <div>
            <div className="item__title">{meta?.title || "—"}</div>
            <div className="item__meta">
              Dept: {meta?.dept_id || "—"} • Dibuat: {toLocal(meta?.created_at)}
              {meta?.file_url && (
                <>
                  {" "}
                  •{" "}
                  <a href={meta.file_url} target="_blank">
                    Open Link
                  </a>
                </>
              )}
              {meta?.has_file && (
                <>
                  {" "}
                  •{" "}
                  <a href={`/api/doc-file/${id}`} target="_blank">
                    Open File
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Status due-date */}
          <div className="actions">
            <span
              className="badge"
              style={{
                borderColor: isOverdue ? "#ff9e9e" : "#61e1a1",
                color: isOverdue ? "#ff9e9e" : "#61e1a1",
              }}
              title={
                meta?.due_date
                  ? isOverdue
                    ? "Sudah lewat tenggat"
                    : daysLeft !== null
                    ? `${daysLeft} hari lagi`
                    : ""
                  : "Belum ada due date"
              }
            >
              {meta?.due_date
                ? isOverdue
                  ? "Overdue"
                  : `${toYMD(meta.due_date)}`
                : "No Due"}
            </span>
          </div>
        </div>

        {/* Edit due-date */}
        <div className="row" style={{ marginTop: 10 }}>
          <input
            type="date"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <button className="btn btn--secondary btn--sm" onClick={saveDue}>
            Simpan Due Date
          </button>
        </div>
      </div>

      {/* SHEET + KOMENTAR */}
      {sheet.headers.length === 0 ? (
        <>
          <hr />
          <div className="item">
            <div className="small">
              Belum ada sheet. Import CSV di halaman Dokumen.
            </div>
          </div>
        </>
      ) : (
        <>
          <hr />
          <div className="small">
            Klik sel untuk beri komentar. Titik merah = komentar Open.
          </div>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  {sheet.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, r) => (
                  <tr key={r}>
                    <td>{r + 1}</td>
                    {sheet.headers.map((_, c) => {
                      const v = row[c] ?? "";
                      const selected = sel && sel.row === r && sel.col === c;
                      return (
                        <td
                          key={c}
                          className={`cell ${selected ? "selected" : ""}`}
                          onClick={() => setSel({ row: r, col: c })}
                        >
                          {v || (
                            <span className="small" style={{ opacity: 0.6 }}>
                              -
                            </span>
                          )}
                          {hasOpen(r, c) && <span className="dot" />}
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
              Sel:{" "}
              {sel
                ? `Row ${sel.row + 1} • Col ${sel.col + 1} (${
                    sheet.headers[sel.col] || "-"
                  })`
                : "-"}
            </div>
            <div className="grid2">
              <input
                placeholder="Kolom (opsional)"
                value={field}
                onChange={(e) => setField(e.target.value)}
              />
              <input
                placeholder="Nama/Email (opsional)"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
              />
            </div>
            <textarea
              placeholder="Tulis komentar…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="actions">
              <button className="btn btn--success" onClick={submitComment}>
                Kirim
              </button>
            </div>
          </div>

          <hr />
          <h3>Semua Komentar</h3>
          <div className="list">
            {comments.length === 0 && (
              <div className="small">Belum ada komentar.</div>
            )}
            {comments.map((c) => (
              <div key={c.id} className="item">
                <div className="small">
                  {new Date(c.created_at).toLocaleString()} •{" "}
                  {c.reviewer || "—"} • Row {c.row_index + 1}, Col{" "}
                  {c.col_index + 1} {c.field ? `(${c.field})` : ""}
                </div>
                <div style={{ margin: "6px 0" }}>
                  <b>{c.comment}</b>
                </div>
                <div className="actions">
                  <span
                    className="badge"
                    style={{
                      borderColor:
                        c.status === "Open" ? "#ff9e9e" : "#61e1a1",
                      color: c.status === "Open" ? "#ff9e9e" : "#61e1a1",
                    }}
                  >
                    {c.status}
                  </span>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => onToggle(c.id)}
                  >
                    {c.status === "Open" ? "Mark Resolved" : "Reopen"}
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
