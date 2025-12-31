import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { NextRequest } from 'next/server';

type FileRow = {
  b64: string;
  mime: string; 
  name: string;
  file_size: number | null;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const rows = (await sql/*sql*/`
      select encode(file_data, 'base64') as b64,
             coalesce(file_mime,'application/octet-stream') as mime,
             coalesce(file_name,'file.bin') as name,
             file_size
        from documents
       where id=${id} and file_data is not null
       limit 1
    `) as FileRow[];

    if (!rows.length) {
      return new NextResponse("File not found", { status: 404 });
    }

    const { b64, mime, name, file_size } = rows[0];
    const buf = Buffer.from(b64, "base64");
    const headers = new Headers();
    headers.set("Content-Type", mime);
    headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(name)}"`);
    if (file_size) headers.set("Content-Length", String(file_size));
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");

    return new NextResponse(buf, { 
      status: 200, 
      headers: Object.fromEntries(headers.entries()) 
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
