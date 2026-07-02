import React, { useState } from 'react'

export default function App() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [course, setCourse] = useState<any>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Vui lòng nhập chủ đề')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, customText: '', focusSkill: 'general' })
      })

      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      setCourse(data)
    } catch (err: any) {
      setError('Lỗi: ' + err.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100">
        <div className="container py-12">
          <nav className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <img src="/assets/logo.svg" alt="Élan" className="w-12 h-12 rounded-md shadow" />
              <div>
                <div className="text-lg font-bold">Élan Learning</div>
                <div className="text-sm text-slate-400">Học Tập Thông Minh</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600">Đăng nhập</button>
              <button className="px-3 py-2 rounded-md bg-emerald-400 text-black">Dùng thử</button>
            </div>
          </nav>

          <header className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Élan Learning <span className="text-emerald-300">Học mọi kiến thức</span></h1>
              <p className="text-slate-400 mt-4 max-w-2xl">Biến bất kỳ tài liệu hay chủ đề khó khăn nào thành trò chơi học tập thú vị, ghi nhớ lâu nhờ Active Recall và Spaced Repetition.</p>

              <div className="mt-6 flex gap-4">
                <input
                  type="text"
                  placeholder="Ví dụ: Tiếng Anh giao tiếp công sở..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                  className="flex-1 px-4 py-3 rounded-md bg-slate-800 border border-slate-700 placeholder:text-slate-400"
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-6 py-3 rounded-md bg-emerald-400 text-black font-semibold disabled:opacity-60"
                >
                  {loading ? '⏳ Đang tạo...' : '✨ Tạo Khóa Học'}
                </button>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="card p-6 rounded-xl bg-slate-800 shadow">
                <h3 className="font-semibold">Tự tạo lộ trình học bằng AI</h3>
                <p className="text-slate-400 text-sm mt-2">Nhập chủ đề bạn muốn, Élan sẽ thiết kế lộ trình gồm 10 chương, 100 bài.</p>
                <div className="mt-4 text-sm text-slate-300">
                  <div className="mb-2"><strong>Độ dài lộ trình:</strong> Chuẩn 10 chương</div>
                  <div className="mb-2"><strong>Phương pháp:</strong> Active Recall + Spaced Repetition</div>
                </div>
              </div>
            </div>
          </header>

          <main className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-slate-800 p-5 rounded-xl shadow">
                    <div className="text-slate-400 text-sm">Khóa học có sẵn</div>
                    <div className="mt-2 font-semibold text-lg">Tên khóa #{i}: Ví dụ chuyên sâu</div>
                    <p className="text-slate-400 text-sm mt-2">Mô tả ngắn gọn về khóa học, nội dung và mục tiêu học tập.</p>
                    <div className="mt-4 flex items-center gap-3">
                      <button className="px-3 py-2 rounded bg-emerald-400 text-black">Xem</button>
                      <button className="px-3 py-2 rounded bg-slate-700">Thêm vào lộ trình</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="lg:col-span-1">
              <div className="bg-slate-800 p-5 rounded-xl shadow">
                <h4 className="font-semibold">Kết quả</h4>
                {!course && <p className="text-slate-400 mt-2 text-sm">Chưa có khóa học được tạo. Nhập chủ đề và nhấn "Tạo Khóa Học".</p>}
                {course && (
                  <div className="mt-3 text-sm text-slate-200">
                    <h5 className="font-semibold">{course.title}</h5>
                    <p className="text-slate-400">{course.description}</p>
                  </div>
                )}
              </div>
            </aside>
          </main>
        </div>
      </div>
    </div>
  )
}
