import { NextResponse } from 'next/server'
import { getFileData } from '@/lib/file'

export async function POST(request: Request) {
  const { fileid, password } = await request.json()

  if (!fileid) {
    return NextResponse.json({ error: 'Missing fileid' }, { status: 400 })
  }

  // Password validation logic kept, but temporarily disabled
  // const valid = verifyFilePassword(fileid, password)
  // if (!valid) {
  //   return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
  // }

  const data = getFileData(fileid)
  if (!data) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    fileid: data.fileid,
    pdfName: data.pdfName,
    pageCount: data.pageCount,
  })
}
