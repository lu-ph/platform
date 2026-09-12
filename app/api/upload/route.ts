import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/lib/auth'
import { createFileStructure, saveFileConfig } from '@/lib/file'
import { generateFileId, generatePassword } from '@/lib/utils'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await verifyAdminToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileid = generateFileId(file.name)
    const pdfName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

    const pageCount = await createFileStructure(fileid, buffer, pdfName)
    const password = generatePassword(6)
    saveFileConfig(fileid, password)

    return NextResponse.json({
      success: true,
      fileid,
      password,
      pageCount,
      pdfName,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
