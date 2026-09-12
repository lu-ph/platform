import fs from "fs"
import path from "path"
import { PDFDocument } from "pdf-lib"
import type { FilesConfig, FileData, PageData, GuestUpload } from "./types"

const FILES_DIR = path.join(process.cwd(), "files")
const CONFIG_PATH = path.join(process.cwd(), "files-config.json")

export function getFilesConfig(): FilesConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {}
  }
  const data = fs.readFileSync(CONFIG_PATH, "utf-8")
  if (!data.trim()) return {}
  return JSON.parse(data)
}

export function saveFileConfig(fileid: string, password: string) {
  const config = getFilesConfig()
  config[fileid] = {
    password,
    uploadTime: new Date().toISOString(),
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

export function verifyFilePassword(
  fileid: string,
  inputPassword: string,
): boolean {
  const config = getFilesConfig()
  const fileData = config[fileid]
  if (!fileData) return false
  return fileData.password === inputPassword
}

export function fileidExists(fileid: string): boolean {
  const dir = path.join(FILES_DIR, fileid)
  return fs.existsSync(dir)
}

export async function createFileStructure(
  fileid: string,
  pdfBuffer: Buffer,
  _pdfName: string,
): Promise<number> {
  const dir = path.join(FILES_DIR, fileid)
  fs.mkdirSync(dir, { recursive: true })

  const pdfName = `${fileid}.pdf`
  const pdfPath = path.join(dir, pdfName)
  fs.writeFileSync(pdfPath, pdfBuffer)

  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = pdfDoc.getPageCount()

  for (let i = 1; i <= pageCount; i++) {
    fs.mkdirSync(path.join(dir, String(i)), { recursive: true })
  }

  return pageCount
}

export function getPdfPath(fileid: string): string | null {
  const dir = path.join(FILES_DIR, fileid)
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir)
  const pdf = files.find((f) => f.toLowerCase().endsWith(".pdf"))
  return pdf ? path.join(dir, pdf) : null
}

export function getPageUploads(
  fileid: string,
  pageNumber: number,
): GuestUpload {
  const pageDir = path.join(FILES_DIR, fileid, String(pageNumber))
  if (!fs.existsSync(pageDir)) {
    return { images: [] }
  }

  const files = fs.readdirSync(pageDir)
  const images: string[] = []
  let text: string | undefined

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (ext === ".txt") {
      text = fs.readFileSync(path.join(pageDir, file), "utf-8")
    } else if (
      [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext)
    ) {
      images.push(file)
    }
  }

  return { images, text }
}

export function getFileData(fileid: string): FileData | null {
  const dir = path.join(FILES_DIR, fileid)
  if (!fs.existsSync(dir)) return null

  const files = fs.readdirSync(dir)
  const pdfName = files.find((f) => f.toLowerCase().endsWith(".pdf"))
  if (!pdfName) return null

  const pageDirs = files
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory())
    .map((f) => parseInt(f, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b)

  const pages: PageData[] = pageDirs.map((pageNum) => ({
    pageNumber: pageNum,
    uploads: getPageUploads(fileid, pageNum),
  }))

  return {
    fileid,
    pdfName,
    pageCount: pageDirs.length,
    pages,
  }
}

export function getAllFileIds(): string[] {
  if (!fs.existsSync(FILES_DIR)) return []
  return fs.readdirSync(FILES_DIR).filter((f) => {
    const stat = fs.statSync(path.join(FILES_DIR, f))
    return stat.isDirectory()
  })
}

export function deleteFile(fileid: string) {
  const dir = path.join(FILES_DIR, fileid)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }

  const config = getFilesConfig()
  delete config[fileid]
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

export function saveGuestUpload(
  fileid: string,
  pageNumber: number,
  imageBuffers: Buffer[],
  textContent?: string,
) {
  const pageDir = path.join(FILES_DIR, fileid, String(pageNumber))
  if (!fs.existsSync(pageDir)) {
    throw new Error("Page directory does not exist")
  }

  if (textContent !== undefined) {
    const existingFiles = fs.readdirSync(pageDir)
    for (const file of existingFiles) {
      const ext = path.extname(file).toLowerCase()
      if (ext === ".txt") {
        fs.unlinkSync(path.join(pageDir, file))
      }
    }
    fs.writeFileSync(path.join(pageDir, "note.txt"), textContent, "utf-8")
  }

  const timestamp = Date.now()
  for (let i = 0; i < imageBuffers.length; i++) {
    const ext = ".png"
    const filename = `img_${timestamp}_${i}${ext}`
    fs.writeFileSync(path.join(pageDir, filename), imageBuffers[i])
  }
}
