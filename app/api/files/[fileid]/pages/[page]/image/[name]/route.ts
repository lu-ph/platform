import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ fileid: string; page: string; name: string }> },
) {
  const { fileid, page, name } = await params
  const imagePath = path.join(process.cwd(), "files", fileid, page, name)

  if (!fs.existsSync(imagePath)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }

  const buffer = fs.readFileSync(imagePath)
  const ext = path.extname(name).toLowerCase()
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
  }

  const headers = new Headers()
  headers.set("Content-Type", mimeTypes[ext] || "application/octet-stream")

  return new NextResponse(buffer, { headers })
}
