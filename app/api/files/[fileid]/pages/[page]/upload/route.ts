import { NextResponse } from 'next/server'
import { saveGuestUpload } from '@/lib/file'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileid: string; page: string }> }
) {
  const { fileid, page } = await params
  const pageNumber = parseInt(page, 10)

  if (isNaN(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
  }

  const formData = await request.formData()
  const images = formData.getAll('images') as File[]
  const text = formData.get('text') as string | null

  const imageBuffers: Buffer[] = []
  for (const img of images) {
    if (img.size > 0) {
      const bytes = await img.arrayBuffer()
      imageBuffers.push(Buffer.from(bytes))
    }
  }

  try {
    saveGuestUpload(
      fileid,
      pageNumber,
      imageBuffers,
      text || undefined
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Guest upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
