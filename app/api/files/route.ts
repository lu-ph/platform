import { NextResponse } from 'next/server'
import { getAllFileIds, getFileData, getFilesConfig } from '@/lib/file'

export async function GET() {
  const fileIds = getAllFileIds()
  const config = getFilesConfig()
  const files = fileIds.map(id => {
    const data = getFileData(id)
    if (!data) return null
    const entry = config[id]
    return {
      fileid: data.fileid,
      pdfName: data.pdfName,
      pageCount: data.pageCount,
      password: entry?.password || '',
      uploadTime: entry?.uploadTime || '',
    }
  }).filter(Boolean)

  return NextResponse.json({ files })
}
