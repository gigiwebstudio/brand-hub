'use client'
import { useState, useEffect, useCallback } from 'react'
import { clients } from '../app/clients'

const CANADA_HOLIDAYS = [
  { date: '2026-07-01', name: 'Canada Day', emoji: '🍁' },
  { date: '2026-08-03', name: 'BC Day', emoji: '🏔️' },
  { date: '2026-09-07', name: 'Labour Day', emoji: '💪' },
  { date: '2026-10-12', name: 'Thanksgiving', emoji: '🍂' },
  { date: '2026-10-31', name: 'Halloween', emoji: '🎃' },
  { date: '2026-11-11', name: 'Remembrance Day', emoji: '🌹' },
  { date: '2026-12-25', name: 'Christmas', emoji: '🎄' },
  { date: '2027-01-01', name: "New Year's Day", emoji: '🎆' },
  { date: '2027-02-14', name: "Valentine's Day", emoji: '💝' },
  { date: '2027-05-10', name: "Mother's Day", emoji: '🌸' },
  { date: '2027-06-20', name: "Father's Day", emoji: '👔' },
]

const POST_TYPES = [
  { value: 'instagram_post', label: 'Instagram Post', emoji: '📸' },
  { value: 'instagram_story', label: 'Story', emoji: '📱' },
  { value: 'instagram_carousel', label: 'Carousel', emoji: '🎠' },
  { value: 'holiday_campaign', label: 'Holiday Campaign', emoji: '🎄' },
  { value: 'print', label: 'Print Design', emoji: '🖨️' },
  { value: 'other', label: 'Other', emoji: '📋' },
]

const STATUSES = [
  { value: 'planned', label: 'Planned', color: '#94A3B8', bg: '#F1F5F9' },
  { value: 'in_progress', label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'delivered', label: 'Delivered', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'approved', label: 'Approved', color: '#10B981', bg: '#ECFDF5' },
]

const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

function getStatusStyle(status) {
  return STATUSES.find(s => s.value === status) || STATUSES[0]
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function dateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return date.toISOString().split('T')[0]
  })
}

// ── Add/Edit Modal ─────────────────────────────────────────────────────────
function EntryModal({ date, entry, onSave, onDelete, onClose }) {
  const isEdit = !!entry
  const [form, setForm] = useState({
    clientId: entry?.clientId || '',
    date: entry?.date || date || '',
    type: entry?.type || 'instagram_post',
    status: entry?.status || 'planned',
    format: entry?.format || '',
    note: entry?.note || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.clientId || !form.date) return
    setSaving(true)
    await onSave(form, entry?.id)
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm('이 스케줄을 삭제할까요?')) return
    setSaving(true)
    await onDelete(entry.id)
    setSaving(false)
    onClose()
  }

  const inp = { padding: '8px 12px', borderRadius: 8, border: '1px solid #E0DDD9', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{isEdit ? '스케줄 수정' : '새 스케줄 추가'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Client */}
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 5, letterSpacing: 1 }}>CLIENT</div>
            <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} style={inp}>
              <option value="">클라이언트 선택...</option>
              {clients.filter(c => c.active !== false).map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 5, letterSpacing: 1 }}>DATE</div>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} />
          </div>

          {/* Type */}
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 5, letterSpacing: 1 }}>TYPE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {POST_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm({ ...form, type: t.value })}
                  style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid', fontSize: 11, cursor: 'pointer',
                    background: form.type === t.value ? '#1a1a1a' : '#FFF',
                    color: form.type === t.value ? '#FFF' : '#555',
                    borderColor: form.type === t.value ? '#1a1a1a' : '#DDD' }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 5, letterSpacing: 1 }}>STATUS</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => setForm({ ...form, status: s.value })}
                  style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid', fontSize: 11, cursor: 'pointer', flex: 1,
                    background: form.status === s.value ? s.color : '#FFF',
                    color: form.status === s.value ? '#FFF' : s.color,
                    borderColor: s.color }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 5, letterSpacing: 1 }}>NOTE</div>
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="메모 (선택사항)..." rows={2}
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {isEdit && (
            <button onClick={handleDelete} style={{ padding: '10px 16px', background: '#FFF0F0', color: '#C0272D', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer' }}>
              삭제
            </button>
          )}
          <button onClick={onClose} style={{ padding: '10px 16px', background: '#F0EDE8', color: '#555', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>
            취소
          </button>
          <button onClick={handleSave} disabled={saving || !form.clientId || !form.date}
            style={{ padding: '10px 20px', background: saving ? '#999' : '#1a1a1a', color: '#FFF', borderRadius: 8, border: 'none', fontSize: 12, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? '저장 중...' : isEdit ? '수정 완료' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Calendar ──────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [view, setView] = useState('monthly') // monthly | weekly
  const [weekBase, setWeekBase] = useState(today.toISOString().split('T')[0])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // { date, entry? }
  const [filterClient, setFilterClient] = useState('all')
  const [error, setError] = useState(null)

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ month: monthStr })
      if (filterClient !== 'all') params.set('clientId', filterClient)
      const res = await fetch(`/api/schedule?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEntries(data.entries || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [monthStr, filterClient])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleSave = async (form, existingId) => {
    if (existingId) {
      await fetch('/api/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: existingId, ...form }) })
    } else {
      await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    await fetchEntries()
  }

  const handleDelete = async (id) => {
    await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' })
    await fetchEntries()
  }

  const handleStatusCycle = async (entry, e) => {
    e.stopPropagation()
    const statusOrder = ['planned', 'in_progress', 'delivered', 'approved']
    const next = statusOrder[(statusOrder.indexOf(entry.status) + 1) % statusOrder.length]
    await fetch('/api/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, status: next }) })
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: next } : e))
  }

  // Entry chip
  const EntryChip = ({ entry, compact }) => {
    const client = clientMap[entry.clientId]
    const status = getStatusStyle(entry.status)
    const type = POST_TYPES.find(t => t.value === entry.type)
    if (!client) return null
    return (
      <div onClick={() => setModal({ date: entry.date, entry })}
        style={{ background: status.bg, borderLeft: `3px solid ${status.color}`, borderRadius: 6, padding: compact ? '3px 6px' : '5px 8px', marginBottom: 3, cursor: 'pointer', fontSize: compact ? 10 : 11, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        <span style={{ fontSize: compact ? 11 : 13 }}>{client.emoji}</span>
        {!compact && <span style={{ fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{client.name}</span>}
        {compact && <span style={{ color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.nameKo}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: status.color, fontWeight: 600, flexShrink: 0 }} onClick={(e) => handleStatusCycle(entry, e)}>●</span>
      </div>
    )
  }

  // Holiday chip
  const HolidayChip = ({ holiday }) => (
    <div style={{ background: '#FFF5F5', borderLeft: '3px solid #FC8181', borderRadius: 6, padding: '3px 6px', marginBottom: 3, fontSize: 10, color: '#C53030', display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{holiday.emoji}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{holiday.name}</span>
    </div>
  )

  // ── MONTHLY VIEW ──────────────────────────────────────────────────────
  const MonthlyView = () => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const cells = []

    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 0 }}>
          {days.map(d => (
            <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: 1 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#E8E4DF', border: '1px solid #E8E4DF', borderRadius: 12, overflow: 'hidden' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} style={{ background: '#F7F5F2', minHeight: 100 }} />
            const ds = dateStr(year, month, day)
            const dayEntries = entries.filter(e => e.date === ds)
            const holiday = CANADA_HOLIDAYS.find(h => h.date === ds)
            const isToday = ds === today.toISOString().split('T')[0]
            const isWeekend = [0, 6].includes(new Date(ds).getDay())
            return (
              <div key={ds} style={{ background: isToday ? '#FFFBF0' : '#FFF', minHeight: 100, padding: 6, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = '#FAFAF8' }}
                onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = '#FFF' }}
                onClick={() => setModal({ date: ds })}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? '#C0272D' : isWeekend ? '#94A3B8' : '#1a1a1a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isToday ? <span style={{ background: '#C0272D', color: '#FFF', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{day}</span> : day}
                </div>
                {holiday && <HolidayChip holiday={holiday} />}
                {dayEntries.map(e => <EntryChip key={e.id} entry={e} compact />)}
                {dayEntries.length === 0 && !holiday && (
                  <div style={{ fontSize: 10, color: '#DDD', marginTop: 4 }}>+ 추가</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── WEEKLY VIEW ───────────────────────────────────────────────────────
  const WeeklyView = () => {
    const weekDates = getWeekDates(weekBase)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d.toISOString().split('T')[0]) }}
            style={{ padding: '6px 14px', background: '#F0EDE8', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>← 이전 주</button>
          <button onClick={() => setWeekBase(today.toISOString().split('T')[0])}
            style={{ padding: '6px 14px', background: '#F0EDE8', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>이번 주</button>
          <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d.toISOString().split('T')[0]) }}
            style={{ padding: '6px 14px', background: '#F0EDE8', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>다음 주 →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {weekDates.map((ds, i) => {
            const d = new Date(ds)
            const dayEntries = entries.filter(e => e.date === ds)
            const holiday = CANADA_HOLIDAYS.find(h => h.date === ds)
            const isToday = ds === today.toISOString().split('T')[0]
            const isWeekend = i === 0 || i === 6
            return (
              <div key={ds} style={{ background: isToday ? '#FFFBF0' : '#FFF', borderRadius: 12, border: `1px solid ${isToday ? '#FDE68A' : '#EEE'}`, padding: 12, minHeight: 200, cursor: 'pointer' }}
                onClick={() => setModal({ date: ds })}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: isWeekend ? '#94A3B8' : '#999', letterSpacing: 1 }}>{days[i]}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? '#C0272D' : '#1a1a1a' }}>{d.getDate()}</div>
                </div>
                {holiday && <HolidayChip holiday={holiday} />}
                {dayEntries.map(e => <EntryChip key={e.id} entry={e} compact={false} />)}
                <div style={{ fontSize: 10, color: '#DDD', marginTop: 4 }}>+ 추가</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Stats bar ─────────────────────────────────────────────────────────
  const StatsBar = () => {
    const counts = STATUSES.map(s => ({ ...s, count: entries.filter(e => e.status === s.value).length }))
    return (
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {counts.map(s => (
          <div key={s.value} style={{ padding: '6px 14px', background: s.bg, borderRadius: 20, fontSize: 11, color: s.color, fontWeight: 600, border: `1px solid ${s.color}30` }}>
            {s.label} {s.count}
          </div>
        ))}
        <div style={{ padding: '6px 14px', background: '#F7F5F2', borderRadius: 20, fontSize: 11, color: '#999', border: '1px solid #EEE', marginLeft: 'auto' }}>
          총 {entries.length}개
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#F7F5F2', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1a', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#C8B89A', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>Vancouver Marketing Agency</div>
          <div style={{ color: '#FFF', fontSize: 20, fontWeight: 700 }}>📅 Content Calendar</div>
        </div>
        <button onClick={() => setModal({ date: today.toISOString().split('T')[0] })}
          style={{ padding: '10px 20px', background: '#C8B89A', color: '#1a1a1a', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + 새 스케줄
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#FFF', borderRadius: 10, border: '1px solid #EEE', overflow: 'hidden' }}>
            {['monthly', 'weekly'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: view === v ? 600 : 400, background: view === v ? '#1a1a1a' : '#FFF', color: view === v ? '#FFF' : '#666' }}>
                {v === 'monthly' ? '월별' : '주별'}
              </button>
            ))}
          </div>

          {/* Month nav */}
          {view === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', borderRadius: 10, border: '1px solid #EEE', padding: '4px 8px' }}>
              <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666' }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', minWidth: 100, textAlign: 'center' }}>
                {year}년 {month + 1}월
              </span>
              <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666' }}>›</button>
            </div>
          )}

          {/* Client filter */}
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #EEE', fontSize: 12, background: '#FFF', color: '#333', cursor: 'pointer' }}>
            <option value="all">전체 클라이언트</option>
            {clients.filter(c => c.active !== false).map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>

          {loading && <span style={{ fontSize: 12, color: '#999' }}>⏳ 불러오는 중...</span>}
          {error && <span style={{ fontSize: 12, color: '#C0272D' }}>⚠️ {error}</span>}
        </div>

        {/* Stats */}
        <StatsBar />

        {/* Calendar */}
        {view === 'monthly' ? <MonthlyView /> : <WeeklyView />}

        {/* Legend */}
        <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#BBB' }}>상태 클릭으로 변경 ●</span>
          {STATUSES.map(s => (
            <span key={s.value} style={{ fontSize: 11, color: s.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
              {s.label}
            </span>
          ))}
          <span style={{ fontSize: 11, color: '#FC8181', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FC8181', display: 'inline-block' }} />
            Canadian Holiday
          </span>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <EntryModal
          date={modal.date}
          entry={modal.entry}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
