"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { addDocGroup, deleteDocGroup, listDocGroups, listDocYears, updateDocGroup } from "@/app/actions";

export default function DocGroupsPage(){
  const [items,setItems]=useState<any[]>([]);
  const [years,setYears]=useState<number[]>([]);
  const [filterYear,setFilterYear]=useState<number|null>(null);

  const [name,setName]=useState("");
  const [year,setYear]=useState("");

  const [editId,setEditId]=useState<string|null>(null);
  const [eName,setEName]=useState(""); const [eYear,setEYear]=useState("");

  async function refresh(y?:number|null){
    setItems(await listDocGroups(y ?? filterYear));
    setYears((await listDocYears()).map(x=>x.year));
  }
  useEffect(()=>{ refresh(null); },[]);
  useEffect(()=>{ refresh(filterYear); },[filterYear]);

  async function onAdd(){
    if(!name.trim()) return;
    await addDocGroup(name.trim(), year? Number(year): null);
    setName(""); setYear(""); refresh(filterYear);
  }
  function startEdit(g:any){ setEditId(g.id); setEName(g.name); setEYear(g.year?.toString() ?? ""); }
  async function saveEdit(){
    if(!editId) return;
    const fd=new FormData();
    fd.set("id", editId); fd.set("name", eName.trim());
    if(eYear) fd.set("year", eYear);
    fd.set("active","true");
    await updateDocGroup(fd);
    setEditId(null); refresh(filterYear);
  }
  async function onDelete(id:string){
    if(!confirm("Nonaktifkan dokumen ini?")) return;
    await deleteDocGroup(id); refresh(filterYear);
  }

  return (
    <div className="container">
      <div className="card">
        <h1>FUP Reviewer</h1>
        <h2>Daftar Dokumen</h2>

        <div className="row" style={{marginBottom:12}}>
          <select value={filterYear ?? ""} onChange={(e)=>setFilterYear(e.target.value? Number(e.target.value): null)}>
            <option value="">Semua Tahun</option>
            {years.map(y=> <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="small">Filter dokumen berdasarkan tahun.</div>
        </div>

        <div className="row">
          <input placeholder="Nama Dokumen (mis. FUP, SOP, WI)" value={name} onChange={e=>setName(e.target.value)} />
          <input placeholder="Tahun (opsional)" value={year} onChange={e=>setYear(e.target.value)} style={{maxWidth:160}} />
          <button className="btn" onClick={onAdd}>Tambah</button>
        </div>

        <hr/>

        <div className="list">
          {items.map(g=>{
            const isEdit = editId===g.id;
            return (
              <div key={g.id} className="item">
                {!isEdit ? (
                  <div className="item__header">
                    <div>
                      <div className="item__title">{g.name}</div>
                      <div className="item__meta">({g.id}) {g.year? `• Tahun ${g.year}`:""}</div>
                    </div>
                    <div className="actions actions--right">
                      <Link className="btn small" href={`/g/${g.id}`}>Buka</Link>
                      <button className="btn small" style={{background:"#ff9bff", color:"#000"}} onClick={()=>startEdit(g)}>Edit</button>
                      <button className="btn small btn--danger" onClick={()=>onDelete(g.id)}>Hapus</button>
                    </div>
                  </div>
                ) : (
                  <div className="row">
                    <input value={eName} onChange={e=>setEName(e.target.value)} placeholder="Nama dokumen" />
                    <input value={eYear} onChange={e=>setEYear(e.target.value)} placeholder="Tahun" style={{maxWidth:160}} />
                    <button className="btn small" onClick={saveEdit}>Simpan</button>
                    <button className="btn small" style={{background:"#555"}} onClick={()=>setEditId(null)}>Batal</button>
                  </div>
                )}
              </div>
            );
          })}
          {!items.length && <div className="small">Belum ada dokumen.</div>}
        </div>
      </div>
    </div>
  );
}
