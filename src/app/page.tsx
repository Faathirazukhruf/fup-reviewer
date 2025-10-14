"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DB, Dept, loadDB, saveDB } from "@/lib/storage";

export default function Home() {
  const [db, setDb] = useState<DB>();
  const [name, setName] = useState("");

  useEffect(() => { setDb(loadDB()); }, []);

  const addDept = () => {
    if (!db) return;
    const nm = name.trim(); if (!nm) return;
    const id = nm.toUpperCase().replace(/\s+/g, "").slice(0, 8);
    if (db.departments.some(d => d.id === id)) return alert("Departemen sudah ada");
    const next = { ...db, departments: [...db.departments, { id, name: nm, active: true }] };
    saveDB(next); setDb(next); setName("");
  };

  if (!db) return null;
  const active = db.departments.filter(d => d.active);

  return (
    <>
      <div className="row">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Tambah Departemen (mis. QA)" />
        <button className="btn btn--primary" onClick={addDept}>Tambah</button>
      </div>
      <hr />
      <div className="list">
        {active.map((d: Dept) => (
          <div key={d.id} className="item">
            <div className="item__header">
              <div>
                <div className="item__title">{d.name}</div>
                <div className="item__meta">({d.id})</div>
              </div>
              <div className="actions actions--right">
                <Link className="btn btn--primary btn--sm" href={`/dept/${d.id}`}>Buka</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
