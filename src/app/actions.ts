"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

/* ===================== Types ===================== */

export type DocGroup = {
  id: string;
  name: string;
  active: boolean;
  year: number | null;
};

export type Department = {
  id: string;
  name: string;
  active: boolean;
  year: number | null;
};

export type DocumentRow = {
  id: string;
  dept_id: string;
  group_id: string | null;
  title: string;
  file_url: string | null;
  file_mime: string | null;
  file_size: number | null;
  file_name: string | null;
  created_at: string | null; // ISO string
  due_date: string | null;   // ISO string
  has_file: boolean;
};

export type CommentRow = {
  id: string;
  doc_id: string;
  row_index: number;
  col_index: number;
  field: string | null;
  comment: string;
  reviewer: string | null;
  status: "Open" | "Resolved";
  created_at: string; // ISO
};

/* ===================== Helpers ===================== */

function normalizeDate(d: string | null): string | null {
  if (!d) return null;
  const s = d.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // YYYY-MM-DD
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/YYYY
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function isoOrNull(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/* ===================== DOC GROUPS ===================== */

export async function listDocYears(): Promise<{ year: number }[]> {
  const chk = (await sql/*sql*/`
    select exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='doc_groups' and column_name='year'
    ) as has
  `) as Array<{ has: boolean }>;
  if (!chk[0]?.has) return [];
  const rows = (await sql/*sql*/`
    select distinct year from doc_groups
    where active=true and year is not null
    order by year desc
  `) as Array<{ year: number }>;
  return rows;
}

export async function listDocGroups(year?: number | null): Promise<DocGroup[]> {
  const rows = year
    ? ((await sql/*sql*/`
        select id, name, active, year
        from doc_groups
        where active=true and year=${year}
        order by name
      `) as DocGroup[])
    : ((await sql/*sql*/`
        select id, name, active, year
        from doc_groups
        where active=true
        order by name
      `) as DocGroup[]);
  return rows;
}

export async function addDocGroup(name: string, year?: number | null) {
  const id = name.toUpperCase().replace(/\s+/g, "_").slice(0, 24);
  await sql/*sql*/`
    insert into doc_groups(id, name, active, year)
    values (${id}, ${name}, true, ${year ?? null})
    on conflict(id) do update
      set name=excluded.name,
          active=true,
          year=coalesce(excluded.year, doc_groups.year)
  `;
  revalidatePath("/dokumen");
}

export async function updateDocGroup(fd: FormData) {
  const id = (fd.get("id") as string).trim();
  const name = (fd.get("name") as string).trim();
  const yearRaw = (fd.get("year") as string) || "";
  const year = yearRaw ? Number(yearRaw) : null;
  const active = (fd.get("active") as string) === "true";

  await sql/*sql*/`
    update doc_groups set name=${name}, year=${year}, active=${active}
    where id=${id}
  `;
  revalidatePath("/dokumen");
}

export async function deleteDocGroup(id: string) {
  await sql/*sql*/`update doc_groups set active=false where id=${id}`;
  revalidatePath("/dokumen");
}

/* ===================== DEPARTMENTS ===================== */

export async function listYears(): Promise<{ year: number }[]> {
  const chk = (await sql/*sql*/`
    select exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='departments' and column_name='year'
    ) as has
  `) as Array<{ has: boolean }>;
  if (!chk[0]?.has) return [];
  const rows = (await sql/*sql*/`
    select distinct year
    from departments
    where active=true and year is not null
    order by year desc
  `) as Array<{ year: number }>;
  return rows;
}

export async function listDepartments(year?: number | null): Promise<Department[]> {
  const rows = year
    ? ((await sql/*sql*/`
        select id, name, active, year
        from departments
        where active=true and year=${year}
        order by name
      `) as Department[])
    : ((await sql/*sql*/`
        select id, name, active, year
        from departments
        where active=true
        order by name
      `) as Department[]);
  return rows;
}

export async function addDepartment(name: string, year?: number | null) {
  const id = name.toUpperCase().replace(/\s+/g, "").slice(0, 12);
  await sql/*sql*/`
    insert into departments(id, name, active, year)
    values (${id}, ${name}, true, ${year ?? null})
    on conflict(id) do update
      set name=excluded.name,
          active=true,
          year=coalesce(excluded.year, departments.year)
  `;
  revalidatePath("/");
}

export async function updateDepartment(fd: FormData) {
  const id = (fd.get("id") as string).trim().toUpperCase();
  const name = (fd.get("name") as string).trim();
  const yearRaw = (fd.get("year") as string) || "";
  const year = yearRaw ? Number(yearRaw) : null;
  const active = (fd.get("active") as string) === "true";

  await sql/*sql*/`
    update departments set name=${name}, year=${year}, active=${active}
    where id=${id}
  `;
  revalidatePath("/");
}

export async function deleteDepartment(id: string) {
  await sql/*sql*/`update departments set active=false where id=${id}`;
  revalidatePath("/");
}

/* ===================== DOCUMENTS ===================== */

export async function listDocuments(
  deptId: string,
  groupId?: string | null
): Promise<DocumentRow[]> {
  const rows = (await sql/*sql*/`
    select id, dept_id, group_id, title, file_url, file_mime, file_size, file_name,
           created_at, due_date, (file_data is not null) as has_file
      from documents
     where dept_id=${deptId}
       ${groupId ? sql`and group_id=${groupId}` : sql``}
     order by created_at desc
  `) as Array<{
    id: string;
    dept_id: string;
    group_id: string | null;
    title: string;
    file_url: string | null;
    file_mime: string | null;
    file_size: number | null;
    file_name: string | null;
    created_at: unknown;
    due_date: unknown;
    has_file: boolean;
  }>;

  return rows.map((r) => ({
    ...r,
    created_at: isoOrNull(r.created_at),
    due_date: isoOrNull(r.due_date),
  }));
}

export async function createDocument(fd: FormData) {
  const deptId = ((fd.get("deptId") as string) || "").trim().toUpperCase();
  const groupId = ((fd.get("groupId") as string) || "").trim() || null;
  const title = ((fd.get("title") as string) || "").trim();
  const link = ((fd.get("fileUrl") as string) || "").trim() || null;
  const date = normalizeDate((fd.get("date") as string) || null);
  const due = normalizeDate((fd.get("dueDate") as string) || null);
  const file = (fd.get("file") as File) || null;

  if (!deptId || !title) throw new Error("deptId/title kosong");

  await sql/*sql*/`
    insert into departments(id, name, active)
    values (${deptId}, ${deptId}, true)
    on conflict(id) do nothing
  `;
  if (groupId) {
    await sql/*sql*/`
      insert into doc_groups(id, name, active)
      values (${groupId}, ${groupId}, true)
      on conflict(id) do nothing
    `;
  }

  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString("base64");
    await sql/*sql*/`
      insert into documents (
        dept_id, group_id, title, file_url,
        file_mime, file_size, file_name, file_data,
        created_at, due_date
      )
      values (
        ${deptId}, ${groupId}, ${title}, ${link},
        ${file.type || "application/octet-stream"}, ${file.size || null}, ${file.name},
        decode(${b64}, 'base64'),
        coalesce(${date}::date::timestamptz, now()),
        ${due}::date::timestamptz
      )
    `;
  } else {
    await sql/*sql*/`
      insert into documents (dept_id, group_id, title, file_url, created_at, due_date)
      values (
        ${deptId}, ${groupId}, ${title}, ${link},
        coalesce(${date}::date::timestamptz, now()),
        ${due}::date::timestamptz
      )
    `;
  }

  revalidatePath(groupId ? `/g/${groupId}/dept/${deptId}` : `/dept/${deptId}`);
}

export async function updateDocument(fd: FormData) {
  const id = ((fd.get("id") as string) || "").trim();
  const deptId = ((fd.get("deptId") as string) || "").trim().toUpperCase();
  const groupId = ((fd.get("groupId") as string) || "").trim() || null;
  const title = ((fd.get("title") as string) || "").trim();
  const link = ((fd.get("fileUrl") as string) || "").trim() || null;
  const date = normalizeDate((fd.get("date") as string) || null);
  const due = normalizeDate((fd.get("dueDate") as string) || null);
  const file = (fd.get("file") as File) || null;

  if (!id || !deptId || !title) throw new Error("id/deptId/title kosong");

  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString("base64");
    await sql/*sql*/`
      update documents set
        title=${title},
        file_url=${link},
        file_mime=${file.type || "application/octet-stream"},
        file_size=${file.size || null},
        file_name=${file.name},
        file_data=decode(${b64}, 'base64'),
        created_at=coalesce(${date}::date::timestamptz, created_at),
        due_date=${due}::date::timestamptz
      where id=${id}
    `;
  } else {
    await sql/*sql*/`
      update documents set
        title=${title},
        file_url=${link},
        created_at=coalesce(${date}::date::timestamptz, created_at),
        due_date=${due}::date::timestamptz
      where id=${id}
    `;
  }

  revalidatePath(groupId ? `/g/${groupId}/dept/${deptId}` : `/dept/${deptId}`);
}

export async function deleteDocument(docId: string, deptId: string, groupId?: string | null) {
  await sql/*sql*/`delete from documents where id=${docId}`;
  revalidatePath(groupId ? `/g/${groupId}/dept/${deptId}` : `/dept/${deptId}`);
}

/* ===================== META DOKUMEN & DUE DATE ===================== */

export async function getDocumentMeta(docId: string): Promise<{
  id: string;
  dept_id: string;
  group_id: string | null;
  title: string;
  file_url: string | null;
  has_file: boolean;
  created_at: string | null;
  due_date: string | null;
} | null> {
  const rows = (await sql/*sql*/`
    select id, dept_id, group_id, title, file_url,
           (file_data is not null) as has_file,
           created_at, due_date
      from documents
     where id=${docId}
     limit 1
  `) as Array<{
    id: string;
    dept_id: string;
    group_id: string | null;
    title: string;
    file_url: string | null;
    created_at: unknown;
    due_date: unknown;
    has_file: boolean;
  }>;

  if (!rows.length) return null;
  const r = rows[0];
  return {
    ...r,
    created_at: isoOrNull(r.created_at),
    due_date: isoOrNull(r.due_date),
  };
}

export async function setDocumentDueDate(fd: FormData) {
  const id = (fd.get("id") as string) || "";
  const due = normalizeDate((fd.get("dueDate") as string) || null);
  if (!id) return;
  await sql/*sql*/`
    update documents set due_date=${due}::date::timestamptz where id=${id}
  `;
  revalidatePath(`/doc/${id}`);
}

/* ===================== KOMENTAR / SHEET ===================== */
/* Pastikan tabel komentar/sheet sudah ada di DB-mu.
   Typing disediakan kalau kamu sudah punya fungsi ini.
   Kalau belum, hapus import di page yang tidak dipakai. */

export async function addComment(fd: FormData) {
  // Implementation placeholder
  console.log('addComment called with:', fd);
  return { success: true };
}

export async function listComments(docId: string): Promise<CommentRow[]> {
  // Implementation placeholder
  console.log('listComments called for docId:', docId);
  return [];
}

export async function toggleComment(commentId: string, docId: string) {
  // Implementation placeholder
  console.log('toggleComment called with:', { commentId, docId });
  return { success: true };
}

export async function getSheet(docId: string): Promise<{ headers: string[]; rows: string[][] }> {
  // Implementation placeholder
  console.log('getSheet called for docId:', docId);
  return { headers: [], rows: [] };
}
