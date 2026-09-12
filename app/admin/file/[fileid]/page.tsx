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

export default function AdminFileViewPage() {
  const params = useParams()
  const fileid = params.fileid as string

  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({})
  const [pageImages, setPageImages] = useState<Record<number, string[]>>({})
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const currentPageRef = useRef(currentPage)
  const pageSwitchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/files/${fileid}`)
      const data = await res.json()
      if (res.ok) {
        setFileInfo(data)
        const texts: Record<number, string> = {}
        const imgs: Record<number, string[]> = {}
        for (const p of data.pages) {
          texts[p.pageNumber] = p.uploads.text || ""
          imgs[p.pageNumber] = p.uploads.images.map(
            (name: string) =>
              `/api/files/${fileid}/pages/${p.pageNumber}/image/${name}`,
          )
        }
        setPageTexts(texts)
        setPageImages(imgs)
      }
    }
    load()
  }, [fileid])

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
          <p className="text-xs text-[#9C9589] mt-1">
            第 {currentPage} / {fileInfo.pageCount} 页
          </p>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Text content — 2/3 height */}
          <div className="flex-[2] flex flex-col min-h-0">
            <label className="block text-xs font-medium text-[#7C7569] mb-2">
              批注
            </label>
            <div className="flex-1 w-full px-3 py-2 border border-[#E5E1D8] rounded-md bg-[#FDFBF7] text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap">
              {pageTexts[currentPage] || (
                <span className="text-[#9C9589]">暂无批注</span>
              )}
            </div>
          </div>

          {/* Image content — 1/3 height */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs font-medium text-[#7C7569] mb-2">
              图片
            </label>
            <div className="flex-1 overflow-y-auto">
              {(pageImages[currentPage] || []).length === 0 ? (
                <p className="text-xs text-[#9C9589]">暂无图片</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {/* eslint-disable @next/next/no-img-element */}
                  {(pageImages[currentPage] || []).map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      onClick={() => setLightboxImage(src)}
                      className="w-full h-24 object-cover rounded-md border border-[#E5E1D8] cursor-pointer hover:border-[#C4B7A6] transition"
                    />
                  ))}
                  {/* eslint-enable @next/next/no-img-element */}
                </div>
              )}
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
