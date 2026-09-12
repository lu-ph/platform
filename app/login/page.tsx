import { loginAction } from '@/app/actions/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error

  async function handleSubmit(formData: FormData) {
    'use server'
    const result = await loginAction(formData)
    if (result.success) {
      redirect('/admin')
    } else {
      redirect(`/login?error=${encodeURIComponent(result.error || '登录失败')}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#333]">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-[#EFECE6] w-full max-w-sm">
        <h1 className="text-xl font-medium mb-6 text-center text-[#5C5549]">管理员登录</h1>
        
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#7C7569] mb-1">账号</label>
            <input type="text" name="username" required className="w-full px-3 py-2 border border-[#E5E1D8] rounded-md focus:outline-none focus:border-[#C4B7A6] bg-[#FDFBF7]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#7C7569] mb-1">密码</label>
            <input type="password" name="password" required className="w-full px-3 py-2 border border-[#E5E1D8] rounded-md focus:outline-none focus:border-[#C4B7A6] bg-[#FDFBF7]" />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-[#5C5549] text-white py-2 rounded-md hover:bg-[#4A443A] transition text-sm">
            登 录
          </button>
        </form>
      </div>
    </div>
  )
}