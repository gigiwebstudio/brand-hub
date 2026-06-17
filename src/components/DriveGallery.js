'use client'
import { useState, useEffect } from 'react'

export default function DriveGallery({ initialFolderId }) {
  const [stack, setStack] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [inputVal, setInputVal] = useState('')
  const [rootFolderId, setRootFolderId] = useState(initialFolderId || null)

  const extractId = (val) => {
    const m = val.match(/folders\/([a-zA-Z0-9_-]+)/)
    return m ? m[1] : val.trim()
  }

  const fetchFolder = async (folderId) => {
    if (!folderId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/drive?folderId=${folderId}&type=all`)
      const data = await res.json()
      setItems(data.files || [])
    } catch (e) {
      setItems([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (rootFolderId) fetchFolder(rootFolderId)
  }, [rootFolderId])

  const openFolder = (id, name) => {
    setStack(prev => [...prev, { id, name }])
    fetchFolder(id)
  }

  const goBack = () => {
    const newStack = stack.slice(0, -1)
    setStack(newStack)
    const prevId = newStack.length > 0 ? newStack[newStack.length - 1].id : rootFolderId
    fetchFolder(prevId)
  }

  const goToRoot = () => {
    setStack([])
    fetchFolder(rootFolderId)
  }

  const thumb = (f) => f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`
  const full = (f) => f.thumbnailLink?.replace('=s220', '=s1600') || `https://drive.google.com/thumbnail?id=${f.id}&sz=w1600`

  const folders = items.filter(i => i.type === 'folder')
  const images = items.filter(i => i.type === 'image')

  return (
    <div>
      {/* Folder input */}
      <div style={{ background: '#FFF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Google Drive 폴더</div>
        {rootFolderId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#4CAF50', fontWeight: 600 }}>● 연결됨</span>
            <span style={{ fontSize: 11, color: '#BBB', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rootFolderId}</span>
            <a href={`https://drive.google.com/drive/folders/${rootFolderId}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '6px 12px', background: '#F0EDE8', color: '#555', borderRadius: 8, fontSize: 12 }}>Drive ↗</a>
            <button onClick={() => { setRootFolderId(null); setStack([]); setItems([]); setInputVal('') }}
              style={{ padding: '6px 12px', background: '#F5F3F0', color: '#888', borderRadius: 8, fontSize: 12, border: 'none' }}>변경</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={inputVal} onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setRootFolderId(extractId(inputVal)) }}
              placeholder="Drive 폴더 링크 또는 ID..."
              style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid #E0DDD9', fontSize: 13, outline: 'none' }} />
            <button onClick={() => setRootFolderId(extractId(inputVal))}
              style={{ padding: '9px 18px', background: '#1a1a1a', color: '#fff', borderRadius: 8, border: 'none', fontSize: 13 }}>Load</button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      {rootFolderId && stack.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={goToRoot} style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer' }}>📁 Root</button>
          {stack.map((s, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#CCC' }}>›</span>
              {i < stack.length - 1 ? (
                <button onClick={() => { const ns = stack.slice(0, i + 1); setStack(ns); fetchFolder(s.id) }}
                  style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer' }}>{s.name}</button>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{s.name}</span>
              )}
            </span>
          ))}
          <button onClick={goBack} style={{ marginLeft: 'auto', padding: '4px 12px', background: '#F0EDE8', border: 'none', borderRadius: 6, fontSize: 12, color: '#666', cursor: 'pointer' }}>← 뒤로</button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 13 }}>불러오는 중...</div>
        </div>
      )}

      {!loading && !rootFolderId && (
        <div style={{ textAlign: 'center', padding: 60, color: '#CCC', background: '#FFF', borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
          <div style={{ fontSize: 14 }}>위에 Drive 폴더 링크를 붙여넣어 주세요</div>
        </div>
      )}

      {!loading && rootFolderId && (
        <>
          {folders.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>폴더 ({folders.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {folders.map(f => (
                  <div key={f.id} onClick={() => openFolder(f.id, f.title)}
                    style={{ padding: '14px 16px', background: '#FFF', borderRadius: 10, cursor: 'pointer', border: '1px solid #EEE', display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F7F5F2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFF'}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <span style={{ fontSize: 12, color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>이미지 ({images.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {images.map(img => (
                  <div key={img.id} onClick={() => setLightbox(img)}
                    style={{ cursor: 'zoom-in', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#F0EDE8' }}>
                    <img src={thumb(img)} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.parentNode.style.background = '#EEE'; e.target.style.display = 'none' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {folders.length === 0 && images.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#CCC', background: '#FFF', borderRadius: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🈳</div>
              <div style={{ fontSize: 13 }}>이 폴더는 비어있어요</div>
            </div>
          )}
        </>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw' }}>
            <img src={full(lightbox)} alt={lightbox.title}
              style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 6, display: 'block' }} />
            <div style={{ textAlign: 'center', color: '#888', fontSize: 12, marginTop: 8 }}>{lightbox.title}</div>
            <button onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: -14, right: -14, background: '#FFF', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 14, fontWeight: 700 }}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
