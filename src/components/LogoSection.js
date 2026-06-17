'use client'
import { useState, useEffect } from 'react'

export default function LogoSection({ logoFolderId }) {
  const [logos, setLogos] = useState([])
  const [loading, setLoading] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!logoFolderId) return
    setLoading(true)
    fetch(`/api/drive?folderId=${logoFolderId}&type=images`)
      .then(r => r.json())
      .then(data => setLogos(data.files || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [logoFolderId])

  const thumb = (f) => f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}&sz=w300`
  const full = (f) => f.thumbnailLink?.replace('=s220', '=s1200') || `https://drive.google.com/thumbnail?id=${f.id}&sz=w1200`

  if (!logoFolderId) return (
    <div style={{ padding: '14px 18px', background: '#F7F5F2', borderRadius: 10, fontSize: 12, color: '#AAA' }}>
      로고 폴더 미연결
    </div>
  )
  if (loading) return (
    <div style={{ padding: '14px 18px', background: '#F7F5F2', borderRadius: 10, fontSize: 12, color: '#AAA' }}>⏳ 불러오는 중...</div>
  )
  if (logos.length === 0) return (
    <div style={{ padding: '14px 18px', background: '#F7F5F2', borderRadius: 10, fontSize: 12, color: '#AAA' }}>
      이미지 없음 — PNG/SVG 파일을 폴더에 업로드해주세요
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {logos.map(logo => (
          <div key={logo.id} onClick={() => setLightbox(logo)}
            style={{ cursor: 'zoom-in', background: '#F7F5F2', borderRadius: 10, padding: 12, border: '1px solid #EEE', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 120 }}>
            <img src={thumb(logo)} alt={logo.title} style={{ maxWidth: 100, maxHeight: 80, objectFit: 'contain' }}
              onError={e => e.target.style.display = 'none'} />
            <div style={{ fontSize: 10, color: '#999', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{logo.title}</div>
          </div>
        ))}
      </div>
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '80vw', background: '#FFF', borderRadius: 12, padding: 32 }}>
            <img src={full(lightbox)} alt={lightbox.title} style={{ maxWidth: '70vw', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
            <div style={{ textAlign: 'center', color: '#888', fontSize: 12, marginTop: 10 }}>{lightbox.title}</div>
            <button onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: -12, right: -12, background: '#FFF', border: '1px solid #EEE', borderRadius: '50%', width: 28, height: 28, fontSize: 14 }}>✕</button>
          </div>
        </div>
      )}
    </>
  )
}
