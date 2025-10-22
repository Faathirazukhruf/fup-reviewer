"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  listDepartments,
  listYears,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/app/actions";

export default function GroupDepartmentsPage() {
  const { gid } = useParams<{ gid: string }>();

  const [items, setItems] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [filterYear, setFilterYear] = useState<number | null>(null);

  // form tambah
  const [name, setName] = useState("");
  const [year, setYear] = useState("");

  // form edit
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eYear, setEYear] = useState("");

  async function refresh(y?: number | null) {
    setItems(await listDepartments(y ?? filterYear));
    setYears((await listYears()).map((x) => x.year));
  }
  useEffect(() => {
    refresh(null);
  }, []);
  useEffect(() => {
    refresh(filterYear);
  }, [filterYear]);

  async function onAdd() {
    if (!name.trim()) return;
    await addDepartment(name.trim(), year ? Number(year) : null);
    setName("");
    setYear("");
    refresh(filterYear);
  }

  function startEdit(d: any) {
    setEditId(d.id);
    setEName(d.name);
    setEYear(d.year?.toString() ?? "");
  }

  async function saveEdit() {
    if (!editId) return;
    const fd = new FormData();
    fd.set("id", editId);
    fd.set("name", eName.trim());
    if (eYear) fd.set("year", eYear);
    fd.set("active", "true");
    await updateDepartment(fd);
    setEditId(null);
    refresh(filterYear);
  }

  async function onDelete(id: string) {
    if (!confirm("Nonaktifkan departemen ini?")) return;
    await deleteDepartment(id);
    refresh(filterYear);
  }

  return (
    <div className="container">
      <div className="card">
        <Link href="/dokumen" className="small">
          ← Kembali
        </Link>
        <h2>Departemen • {gid}</h2>

        {/* Filter Tahun */}
        <div className="row" style={{ marginBottom: 12 }}>
          <select
            value={filterYear ?? ""}
            onChange={(e) =>
              setFilterYear(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Semua Tahun</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="small">Filter departemen berdasarkan tahun.</div>
        </div>

        {/* Tambah Departemen */}
        <div className="row" style={{ marginBottom: 10 }}>
          <input
            placeholder="Nama Departemen (mis. QA)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Tahun (opsional)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ maxWidth: 160 }}
          />
          <button className="btn" onClick={onAdd}>
            Tambah
          </button>
        </div>

        <hr />

        {/* List Departemen */}
        <div className="list">
          {items.map((d) => {
            const isEdit = editId === d.id;
            return (
              <div key={d.id} className="item">
                {!isEdit ? (
                  <div className="item__header">
                    <div>
                      <div className="item__title">{d.name}</div>
                      <div className="item__meta">
                        ({d.id}) {d.year ? `• Tahun ${d.year}` : ""}
                      </div>
                    </div>
                    <div className="actions actions--right">
                      <Link className="btn small" href={`/g/${gid}/dept/${d.id}`}>
                        Buka
                      </Link>
                      <button
                        className="btn small"
                        style={{ background: "#ff9bff", color: "#000" }}
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
                ) : (
                  <div className="row">
                    <input
                      value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      placeholder="Nama departemen"
                    />
                    <input
                      value={eYear}
                      onChange={(e) => setEYear(e.target.value)}
                      placeholder="Tahun"
                      style={{ maxWidth: 160 }}
                    />
                    <button className="btn small" onClick={saveEdit}>
                      Simpan
                    </button>
                    <button
                      className="btn small"
                      style={{ background: "#555" }}
                      onClick={() => setEditId(null)}
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {!items.length && (
            <div className="small">Belum ada departemen aktif.</div>
          )}
        </div>
      </div>
    </div>
  );
}
