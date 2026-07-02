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
    <div style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🎓 Élan Learning - Học Tập Thông Minh</h1>
      <p>Tạo khóa học AI-powered từ chủ đề của bạn</p>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Ví dụ: Tiếng Anh giao tiếp công sở..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
          style={{ 
            width: '100%', 
            padding: '12px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '⏳ Đang tạo khóa học...' : '✨ Tạo Khóa Học'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '15px' }}>
          ❌ {error}
        </div>
      )}

      {course && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h2>✅ {course.title}</h2>
          <p><strong>Chủ đề:</strong> {course.topic}</p>
          <p><strong>Mô tả:</strong> {course.description}</p>
          <h3>📚 Danh sách {course.units?.length || 0} chương:</h3>
          <ul>
            {course.units?.slice(0, 5).map((unit: any) => (
              <li key={unit.id}>
                <strong>{unit.title}</strong> - {unit.lessons?.length || 0} bài học
              </li>
            ))}
          </ul>
          {course.units?.length > 5 && (
            <p>... và {course.units.length - 5} chương khác</p>
          )}
        </div>
      )}
    </div>
  )
}
