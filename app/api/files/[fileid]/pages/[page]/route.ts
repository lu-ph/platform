import { NextResponse } from 'next/server'
import { getPageUploads } from '@/lib/file'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileid: string; page: string }> }
) {
  const { fileid, page } = await params
  const pageNumber = parseInt(page, 10)

  if (isNaN(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
  }

  const uploads = getPageUploads(fileid, pageNumber)
  return NextResponse.json({
    pageNumber,
    uploads,
  })
}
