import { NextResponse } from "next/server"
import { getFileData, deleteFile } from "@/lib/file"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileid: string }> },
) {
  const { fileid } = await params
  const data = getFileData(fileid)

  if (!data) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileid: string }> },
) {
  const { fileid } = await params
  deleteFile(fileid)
  return NextResponse.json({ success: true })
}
