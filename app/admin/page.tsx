"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UploadedFile {
  fileid: string
  password: string
  pageCount: number
  pdfName: string
  uploadTime: string
}

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadedFile | null>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [shareFile, setShareFile] = useState<UploadedFile | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    const res = await fetch('/api/files')
    if (res.ok) {
      const data = await res.json()
      setFiles(data.files || [])
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        setResult(data)
        loadFiles()
      } else {
        alert(data.error || '上传失败')
      }
    } catch {
      alert('上传失败')
    } finally {
      setUploading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  function buildShareLink(fileid: string) {
    if (typeof window === 'undefined') return `/file/${fileid}`
    return `${window.location.origin}/file/${fileid}`
  }

  async function copyLink(fileid: string) {
    const link = buildShareLink(fileid)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('复制失败')
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8 text-[#333]">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-10 pb-4 border-b border-[#EFECE6]">
          <h1 className="text-lg font-medium text-[#5C5549]">管理后台</h1>
          <button
            onClick={handleLogout}
            className="text-xs text-[#9C9589] hover:text-[#5C5549] transition"
          >
            退出登录
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#EFECE6] mb-8">
          <h2 className="text-sm font-medium text-[#7C7569] mb-4">上传新文件</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-[#E5E1D8] rounded-lg p-6 text-center hover:border-[#C4B7A6] transition bg-[#FDFBF7]">
              <input
                type="file"
                accept=".pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
                className="text-xs text-[#7C7569] file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-[#5C5549] file:text-white hover:file:bg-[#4A443A]"
              />
            </div>
            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-[#5C5549] text-white py-2 rounded-md hover:bg-[#4A443A] transition text-sm disabled:opacity-50"
            >
              {uploading ? '上传中...' : '开始上传'}
            </button>
          </form>

          {result && (
            <div className="mt-4 p-4 bg-[#FDFBF7] rounded-md border border-[#E5E1D8]">
              <p className="text-xs text-[#5C5549] font-medium mb-2">上传成功</p>
              <p className="text-xs text-[#7C7569]">文件编号: <span className="font-mono text-[#5C5549]">{result.fileid}</span></p>
              <p className="text-xs text-[#7C7569]">访问密码: <span className="font-mono text-[#5C5549]">{result.password}</span></p>
              <p className="text-xs text-[#7C7569]">页数: {result.pageCount}</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#EFECE6]">
          <h2 className="text-sm font-medium text-[#7C7569] mb-4">已上传文件</h2>
          {files.length === 0 ? (
            <p className="text-xs text-[#9C9589]">暂无文件</p>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.fileid} className="flex justify-between items-center p-3 bg-[#FDFBF7] rounded-md border border-[#E5E1D8]">
                  <div className="min-w-0">
                    <p className="text-xs text-[#5C5549] font-medium truncate">{f.pdfName}</p>
                    <p className="text-xs text-[#9C9589] font-mono">{f.fileid}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-[#9C9589]">{f.pageCount} 页</span>
                    <button
                      onClick={() => setShareFile(f)}
                      className="text-xs text-[#5C5549] hover:text-[#4A443A] underline"
                    >
                      访客链接
                    </button>
                    <a
                      href={`/admin/file/${f.fileid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#5C5549] hover:text-[#4A443A] underline"
                    >
                      查看批注
                    </a>
                    <button
                      onClick={async () => {
                        if (!confirm(`确定要删除 ${f.fileid} 吗？`)) return
                        const res = await fetch(`/api/files/${f.fileid}`, { method: 'DELETE' })
                        if (res.ok) {
                          loadFiles()
                        } else {
                          alert('删除失败')
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 transition"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {shareFile && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
          onClick={() => setShareFile(null)}
        >
          <div
            className="bg-white rounded-xl shadow-lg border border-[#EFECE6] w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-[#5C5549]">分享给访客</h3>
              <button
                onClick={() => setShareFile(null)}
                className="text-[#9C9589] hover:text-[#5C5549] text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#7C7569] mb-1">访客链接</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={buildShareLink(shareFile.fileid)}
                    className="flex-1 min-w-0 px-3 py-1.5 border border-[#E5E1D8] rounded-md bg-[#FDFBF7] text-xs font-mono text-[#5C5549]"
                  />
                  <button
                    onClick={() => copyLink(shareFile.fileid)}
                    className="shrink-0 px-3 py-1.5 bg-[#5C5549] text-white rounded-md hover:bg-[#4A443A] transition text-xs"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#7C7569] mb-1">访问密码</label>
                <input
                  readOnly
                  value={shareFile.password}
                  className="w-full px-3 py-1.5 border border-[#E5E1D8] rounded-md bg-[#FDFBF7] text-xs font-mono text-[#5C5549]"
                />
              </div>

              <p className="text-xs text-[#9C9589] pt-2">
                文件编号：{shareFile.fileid}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}