export interface FileConfigEntry {
  password: string
  uploadTime: string
}

export interface FilesConfig {
  [fileid: string]: FileConfigEntry
}

export interface GuestUpload {
  images: string[]
  text?: string
}

export interface PageData {
  pageNumber: number
  uploads: GuestUpload
}

export interface FileData {
  fileid: string
  pdfName: string
  pageCount: number
  pages: PageData[]
}
