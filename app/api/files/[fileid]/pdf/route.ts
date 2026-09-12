import { NextResponse } from "next/server"
import fs from "fs"
import { getPdfPath } from "@/lib/file"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileid: string }> },
) {
  const { fileid } = await params
  const pdfPath = getPdfPath(fileid)

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 })
  }

  const buffer = fs.readFileSync(pdfPath)
  const headers = new Headers()
  headers.set("Content-Type", "application/pdf")
  headers.set("Content-Disposition", "inline")

  return new NextResponse(buffer, { headers })
}
