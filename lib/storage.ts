// src/lib/storage.ts
export type Dept = { id: string; name: string; active: boolean };
export type Doc  = { id: string; deptId: string; title: string; fileUrl?: string; createdAt: string };
export type Sheet = { headers: string[]; rows: string[][] };
export type CellComment = {
  id: string; docId: string; row: number; col: number;
  field?: string; comment: string; reviewer?: string;
  status: "Open" | "Resolved"; createdAt: string;
};

export type DB = {
  departments: Dept[];
  documents: Doc[];
  sheets: Record<string, Sheet>;
  comments: CellComment[];
};

const KEY = "fup_local_db_v1";

const defaultDB: DB = {
  departments: [
    { id: "QA",   name: "QA", active: true },
    { id: "PROD", name: "Produksi", active: true },
    { id: "PPIC", name: "PPIC", active: true },
    { id: "RA",   name: "RA", active: true },
    { id: "LOG",  name: "Logistik", active: true },
  ],
  documents: [],
  sheets: {},
  comments: [],
};

export function loadDB(): DB {
  if (typeof window === "undefined") return defaultDB;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DB) : defaultDB;
  } catch { return defaultDB; }
}

export function saveDB(db: DB) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(db));
}

export const uid = (p = "") => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const nowISO = () => new Date().toISOString();
