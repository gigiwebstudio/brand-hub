'use client';

import { useState, useRef, useEffect } from 'react';

export default function ClientSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = options.some((o) => o.toLowerCase() === query.trim().toLowerCase());
  const showAddNew = query.trim() && !exactMatch;

  const selectValue = (v) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="클라이언트 선택 또는 입력..."
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 8,
          border: '1px solid #ddd',
          fontSize: 14,
          marginBottom: 4,
          marginTop: 4,
          boxSizing: 'border-box',
        }}
      />
      {open && (filtered.length > 0 || showAddNew) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 50,
            marginTop: 2,
          }}
        >
          {filtered.map((opt) => (
            <div
              key={opt}
              onClick={() => selectValue(opt)}
              style={{
                padding: '9px 12px',
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: '1px solid #f5f5f5',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#f0ede6',
                  color: '#555',
                }}
              >
                {opt}
              </span>
            </div>
          ))}
          {showAddNew && (
            <div
              onClick={() => selectValue(query.trim())}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                padding: '9px 12px',
                fontSize: 13,
                cursor: 'pointer',
                color: '#8FA8C8',
                fontWeight: 600,
              }}
            >
              + &quot;{query.trim()}&quot; 새 클라이언트로 추가
            </div>
          )}
        </div>
      )}
    </div>
  );
}
