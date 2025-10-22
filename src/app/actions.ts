"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

/* ============ Helpers ============ */
function normalizeDate(d: string | null): string | null {
  if (!d) return null;
  const s = d.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;           // YYYY-MM-DD
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);       // DD/MM/YYYY
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/* ============ DOC GROUPS (layer Dokumen) ============ */
export async function listDocYears() {
  // Tahan-banting jika kolom year belum ada
  const chk = await sql/*sql*/`
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='doc_groups' and column_name='year'
    ) as has;
  ` as Array<{has:boolean}>;
  if (!chk[0]?.has) return [];
  return (await sql/*sql*/`
    select distinct year from doc_groups where active=true and year is not null order by year desc
  `) as {year:number}[];
}

export async function listDocGroups(year?: number | null) {
  if (year) {
    return (await sql/*sql*/`
      select * from doc_groups where active=true and year=${year} order by name
    `) as any[];
  }
  return (await sql/*sql*/`
    select * from doc_groups where active=true order by name
  `) as any[];
}

export async function addDocGroup(name: string, year?: number | null) {
  const id = name.toUpperCase().replace(/\s+/g,"_").slice(0, 24);
  await sql/*sql*/`
    insert into doc_groups(id, name, active, year)
    values (${id}, ${name}, true, ${year ?? null})
    on conflict(id) do update set name=excluded.name, active=true, year=coalesce(excluded.year, doc_groups.year)
  `;
  revalidatePath("/dokumen");
}

export async function updateDocGroup(fd: FormData) {
  const id   = (fd.get("id") as string).trim();
  const name = (fd.get("name") as string).trim();
  const year = (fd.get("year") as string) ? Number(fd.get("year")) : null;
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

/* ============ DEPARTMENTS ============ */
export async function listYears() {
  const rows = await sql/*sql*/`
    select distinct year from departments where active=true and year is not null order by year desc
  `;
  return rows as { year: number }[];
}

export async function listDepartments(year?: number | null) {
  if (year) {
    return (await sql/*sql*/`
      select * from departments where active=true and year=${year} order by name
    `) as any[];
  }
  return (await sql/*sql*/`
    select * from departments where active=true order by name
  `) as any[];
}

export async function addDepartment(name: string, year?: number | null) {
  const id = name.toUpperCase().replace(/\s+/g, "").slice(0, 12);
  await sql/*sql*/`
    insert into departments(id,name,active,year)
    values (${id}, ${name}, true, ${year ?? null})
    on conflict(id) do update set name=excluded.name, active=true, year=coalesce(excluded.year, departments.year)
  `;
  revalidatePath("/");
}

export async function updateDepartment(fd: FormData) {
  const id   = (fd.get("id") as string).trim().toUpperCase();
  const name = (fd.get("name") as string).trim();
  const yearStr = (fd.get("year") as string) || "";
  const year = yearStr ? Number(yearStr) : null;
  const active = (fd.get("active") as string) === "true";

  await sql/*sql*/`
    update departments
       set name=${name},
           year=${year},
           active=${active}
     where id=${id}
  `;
  revalidatePath("/");
}

export async function deleteDepartment(id: string) {
  // soft delete
  await sql/*sql*/`update departments set active=false where id=${id}`;
  revalidatePath("/");
}

/* ============ DOCUMENTS (scoped by group & dept) ============ */
export async function listDocuments(deptId: string, groupId?: string | null) {
  const rows = await sql/*sql*/`
    select id, dept_id, group_id, title, file_url, file_mime, file_size, file_name,
           created_at, due_date, (file_data is not null) as has_file
      from documents
     where dept_id=${deptId}
       ${groupId ? sql`and group_id=${groupId}` : sql``}
     order by created_at desc
  `;
  return (rows as any[]).map(r => ({
    ...r,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    due_date:   r.due_date   ? new Date(r.due_date).toISOString()   : null,
  }));
}

export async function createDocument(fd: FormData) {
  const deptId  = ((fd.get("deptId") as string)  || "").trim().toUpperCase();
  const groupId = ((fd.get("groupId") as string) || "").trim(); // dokumen master
  const title   = ((fd.get("title")  as string)  || "").trim();
  const link    = ((fd.get("fileUrl")as string)  || "").trim();
  const date    = normalizeDate((fd.get("date") as string) || null);
  const due     = normalizeDate((fd.get("dueDate") as string) || null);
  const file    = (fd.get("file") as File) || null;

  if (!deptId || !title) throw new Error("deptId/title kosong");

  await sql/*sql*/`
    insert into departments(id,name,active)
    values (${deptId}, ${deptId}, true)
    on conflict(id) do nothing
  `;
  
  if (groupId) {
    await sql/*sql*/`
      insert into doc_groups(id,name,active)
      values (${groupId}, ${groupId}, true)
      on conflict(id) do nothing
    `;
  }

  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString("base64");
    await sql/*sql*/`
      insert into documents (dept_id, group_id, title, file_url, file_mime, file_size, file_name, file_data, created_at, due_date)
      values (
        ${deptId}, ${groupId || null}, ${title}, ${link || null},
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
        ${deptId}, ${groupId || null}, ${title}, ${link || null},
        coalesce(${date}::date::timestamptz, now()),
        ${due}::date::timestamptz
      )
    `;
  }

  revalidatePath(groupId ? `/g/${groupId}/dept/${deptId}` : `/dept/${deptId}`);
}

export async function updateDocument(fd: FormData) {
  const id      = ((fd.get("id") as string) || "").trim();
  const deptId  = ((fd.get("deptId") as string) || "").trim().toUpperCase();
  const groupId = ((fd.get("groupId") as string) || "").trim();
  const title   = ((fd.get("title") as string) || "").trim();
  const link    = ((fd.get("fileUrl") as string) || "").trim();
  const date    = normalizeDate((fd.get("date") as string) || null);
  const due     = normalizeDate((fd.get("dueDate") as string) || null);
  const file    = (fd.get("file") as File) || null;

  if (!id || !deptId || !title) throw new Error("id/deptId/title kosong");

  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString("base64");
    await sql/*sql*/`
      update documents set
        title=${title},
        file_url=${link || null},
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
        file_url=${link || null},
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

/* ============ META DOKUMEN & DUE DATE (halaman /doc/[id]) ============ */
export async function getDocumentMeta(docId: string) {
  const rows = await sql/*sql*/`
    select id, dept_id, group_id, title, file_url,
           (file_data is not null) as has_file,
           created_at, due_date
      from documents
     where id=${docId}
     limit 1
  `;
  if (!rows.length) return null;
  const r: any = rows[0];
  return {
    ...r,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    due_date:   r.due_date   ? new Date(r.due_date).toISOString()   : null,
  };
}

export async function setDocumentDueDate(fd: FormData) {
  const id  = (fd.get("id") as string) || "";
  const due = normalizeDate((fd.get("dueDate") as string) || null);
  if (!id) return;
  await sql/*sql*/`update documents set due_date=${due}::date::timestamptz where id=${id}`;
  revalidatePath(`/doc/${id}`);
}

/* ============ Comments ============ */
export async function listComments(docId: string) {
  const rows = await sql/*sql*/`
    SELECT c.*, 
           u.name as user_name,
           u.email as user_email
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.document_id = ${docId}
    ORDER BY c.status = 'Open' DESC, c.created_at DESC
  `;
  return rows as Array<{
    id: string;
    document_id: string;
    row_index: number;
    col_index: number;
    field: string;
    comment: string;
    status: 'Open' | 'Resolved';
    created_at: Date;
    user_id?: string;
    user_name?: string;
    user_email?: string;
  }>;
}

export async function addComment(fd: FormData) {
  const docId = (fd.get("docId") as string)?.trim();
  const row = parseInt(fd.get("row") as string);
  const col = parseInt(fd.get("col") as string);
  const field = (fd.get("field") as string)?.trim();
  const comment = (fd.get("comment") as string)?.trim();
  const userId = (fd.get("userId") as string)?.trim(); // Assuming you have user authentication

  if (!docId || isNaN(row) || isNaN(col) || !comment) {
    throw new Error("Missing required fields");
  }

  await sql/*sql*/`
    INSERT INTO comments (
      id, 
      document_id, 
      row_index, 
      col_index, 
      field, 
      comment, 
      status,
      user_id
    ) VALUES (
      gen_random_uuid()::text,
      ${docId},
      ${row},
      ${col},
      ${field || null},
      ${comment},
      'Open',
      ${userId || null}
    )
  `;

  revalidatePath(`/doc/${docId}`);
}

export async function toggleComment(commentId: string, docId: string) {
  await sql/*sql*/`
    UPDATE comments 
    SET status = CASE WHEN status = 'Open' THEN 'Resolved' ELSE 'Open' END
    WHERE id = ${commentId}
  `;
  
  revalidatePath(`/doc/${docId}`);
}
