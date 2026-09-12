export function normalizeFileName(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function generateFileId(originalName: string): string {
  const base = normalizeFileName(originalName)
  const date = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]
  return `${base}_${date}`
}

export function generatePassword(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}
