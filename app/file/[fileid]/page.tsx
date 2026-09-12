"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

interface PageData {
  pageNumber: number
  uploads: {
    images: string[]
    text?: string
  }
}

interface FileInfo {
  fileid: string
  pdfName: string
  pageCount: number
  pages: PageData[]
}

interface PreviewImage {
  preview: string
  serverName?: string
}

export default function FileViewPage() {
  const params = useParams()
  const fileid = params.fileid as string

  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({})
  const [pageImages, setPageImages] = useState<Record<number, PreviewImage[]>>(
    {},
  )
  const [saving, setSaving] = useState(false)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentPageRef = useRef(currentPage)
  const pageSwitchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const loadFileInfo = useCallback(async () => {
    const res = await fetch(`/api/files/${fileid}`)
    const data = await res.json()
    if (res.ok) {
      setFileInfo(data)
      const texts: Record<number, string> = {}
      const imgs: Record<number, PreviewImage[]> = {}
      for (const p of data.pages) {
        texts[p.pageNumber] = p.uploads.text || ""
        imgs[p.pageNumber] = p.uploads.images.map((name: string) => ({
          preview: `/api/files/${fileid}/pages/${p.pageNumber}/image/${name}`,
          serverName: name,
        }))
      }
      setPageTexts(texts)
      setPageImages(imgs)
    }
  }, [fileid])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFileInfo()
  }, [loadFileInfo])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setLightboxImage(null)
    }
  }, [])

  useEffect(() => {
    if (lightboxImage) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [lightboxImage, handleKeyDown])

  useEffect(() => {
    currentPageRef.current = currentPage
  })

  useEffect(() => {
    if (!numPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0
        let visiblePage = currentPageRef.current

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            const pageNum = parseInt(
              entry.target.getAttribute("data-page") || "1",
              10,
            )
            maxRatio = entry.intersectionRatio
            visiblePage = pageNum
          }
        }

        if (visiblePage !== currentPageRef.current) {
          if (pageSwitchDebounceRef.current) {
            clearTimeout(pageSwitchDebounceRef.current)
          }
          pageSwitchDebounceRef.current = setTimeout(() => {
            setCurrentPage(visiblePage)
          }, 150)
        }
      },
      {
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9],
        rootMargin: "-60px 0px -60px 0px",
      },
    )

    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [numPages])

  useEffect(() => {
    const text = pageTexts[currentPage]
    if (text === undefined) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaving(true)
    saveTimerRef.current = setTimeout(async () => {
      const formData = new FormData()
      formData.append("text", text)
      try {
        await fetch(`/api/files/${fileid}/pages/${currentPage}/upload`, {
          method: "POST",
          body: formData,
        })
      } catch (e) {
        console.error("Save failed", e)
      } finally {
        setSaving(false)
      }
    }, 800)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [pageTexts, currentPage, fileid])

  const handleTextChange = useCallback(
    (value: string) => {
      setPageTexts((prev) => ({ ...prev, [currentPage]: value }))
    },
    [currentPage],
  )

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (!files.length) return

      const newPreviews = files.map((f) => ({
        preview: URL.createObjectURL(f),
      }))
      setPageImages((prev) => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), ...newPreviews],
      }))

      const formData = new FormData()
      files.forEach((f) => formData.append("images", f))
      const text = pageTexts[currentPage]
      if (text !== undefined && text !== "") {
        formData.append("text", text)
      }
      try {
        await fetch(`/api/files/${fileid}/pages/${currentPage}/upload`, {
          method: "POST",
          body: formData,
        })
        await loadFileInfo()
      } catch (err) {
        console.error("Upload failed", err)
      }
    },
    [currentPage, fileid, loadFileInfo, pageTexts],
  )

  const pasteRef = useRef<HTMLTextAreaElement>(null)

  const handlePasteImage = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (!imageFiles.length) return
      e.preventDefault()

      const newPreviews = imageFiles.map((f) => ({
        preview: URL.createObjectURL(f),
      }))
      setPageImages((prev) => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), ...newPreviews],
      }))

      const formData = new FormData()
      imageFiles.forEach((f) => formData.append("images", f))
      const text = pageTexts[currentPage]
      if (text !== undefined && text !== "") {
        formData.append("text", text)
      }
      try {
        await fetch(`/api/files/${fileid}/pages/${currentPage}/upload`, {
          method: "POST",
          body: formData,
        })
        await loadFileInfo()
      } catch (err) {
        console.error("Upload failed", err)
      }

      if (pasteRef.current) {
        pasteRef.current.value = ""
      }
    },
    [currentPage, fileid, loadFileInfo, pageTexts],
  )

  if (!fileInfo) {
    return (
      <div className="h-screen bg-[#FDFBF7] flex items-center justify-center text-[#7C7569]">
        加载中...
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#FDFBF7] flex text-[#333]">
      {/* Left: PDF */}
      <div className="w-1/2 overflow-y-auto p-6">
        <Document
          file={`/api/files/${fileid}/pdf`}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages)
            setPdfLoaded(true)
          }}
          loading={
            <p className="text-[#9C9589] text-center mt-20">加载 PDF...</p>
          }
          error={<p className="text-red-500 text-center mt-20">PDF 加载失败</p>}
        >
          {pdfLoaded &&
            Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                ref={(el) => {
                  pageRefs.current[pageNum - 1] = el
                }}
                data-page={pageNum}
                className="mb-4 flex justify-center"
              >
                <Page
                  pageNumber={pageNum}
                  width={600}
                  renderTextLayer
                  renderAnnotationLayer
                  loading={
                    <div className="w-[600px] h-[400px] bg-[#EFECE6] rounded-md" />
                  }
                />
              </div>
            ))}
        </Document>
      </div>

      {/* Right: Annotation panel */}
      <div className="w-1/2 border-l border-[#EFECE6] bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-[#EFECE6]">
          <p className="text-sm font-medium text-[#5C5549] truncate">
            {fileInfo.pdfName}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-[#9C9589]">
              第 {currentPage} / {fileInfo.pageCount} 页
            </p>
            {saving && (
              <span className="text-xs text-[#9C9589]">保存中...</span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Text input — 2/3 height */}
          <div className="flex-[2] flex flex-col min-h-0">
            <textarea
              value={pageTexts[currentPage] || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="在此输入文字..."
              className="flex-1 w-full px-3 py-2 border border-[#E5E1D8] rounded-md focus:outline-none focus:border-[#C4B7A6] bg-[#FDFBF7] text-sm resize-none leading-relaxed"
            />
          </div>

          {/* Image upload — 1/3 height */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <label className="cursor-pointer inline-flex items-center justify-center w-10 h-10 rounded-md border border-dashed border-[#C4B7A6] hover:bg-[#FDFBF7] transition shrink-0">
                <svg
                  className="w-5 h-5 text-[#7C7569]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <textarea
                ref={pasteRef}
                className="w-10 h-10 rounded-md border border-dashed border-[#C4B7A6] hover:bg-[#FDFBF7] transition shrink-0 bg-[#FDFBF7] text-[10px] p-1 resize-none focus:outline-none focus:border-[#C4B7A6]"
                placeholder=""
                onPaste={handlePasteImage}
                onChange={() => {
                  if (pasteRef.current) pasteRef.current.value = ""
                }}
              />
              <span className="text-xs text-[#9C9589] shrink-0">
                Paste image box
              </span>
            </div>

            {/* Image previews */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {/* eslint-disable @next/next/no-img-element */}
                {(pageImages[currentPage] || []).map((img) => (
                  <img
                    key={img.serverName || img.preview}
                    src={img.preview}
                    alt=""
                    onClick={() => setLightboxImage(img.preview)}
                    className="w-full h-24 object-cover rounded-md border border-[#E5E1D8] cursor-pointer hover:border-[#C4B7A6] transition"
                  />
                ))}
                {/* eslint-enable @next/next/no-img-element */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen lightbox overlay */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt=""
            className="max-w-full max-h-full rounded-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {/* eslint-enable @next/next/no-img-element */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
