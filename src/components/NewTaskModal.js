'use client';

import { useState } from 'react';

// NOTE: swap this for your real client list, e.g.:
//   import { clients } from '../data/clients';
// Left as free-text input for now since there are only ~14 clients.

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewTaskModal({ onClose, onCreated }) {
  const [client, setClient] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [linksText, setLinksText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiUrgency, setAiUrgency] = useState(null);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    try {
      const base64 = await fileToBase64(imageFile);
      const res = await fetch('/api/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type, client }),
      });
      const data = await res.json();
      if (data.draft) {
        setTaskTitle(data.draft.taskTitle || '');
        setTaskDescription(data.draft.taskDescription || '');
        setAiUrgency(data.draft.urgency || null);
        if (data.draft.mentionedLinks?.length) {
          setLinksText(data.draft.mentionedLinks.join('\n'));
        }
      }
    } catch (err) {
      console.error('AI analyze failed:', err);
      alert('AI 분석에 실패했어요. 직접 입력해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!taskTitle.trim()) {
      alert('태스크 제목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      let screenshotImageIds = [];
      if (imageFile) {
        const base64 = await fileToBase64(imageFile);
        const uploadRes = await fetch('/api/upload-task-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: imageFile.type,
            client,
            taskTitle,
            folderType: 'screenshots',
          }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.fileId) screenshotImageIds = [uploadData.fileId];
      }

      const links = linksText.split('\n').map((l) => l.trim()).filter(Boolean);

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, taskTitle, taskDescription, links, screenshotImageIds }),
      });

      onCreated();
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('태스크 생성에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px 16px 0 0', padding: 20 }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>+ New Task</div>

        <div style={{ border: '1px dashed #C8B89A', borderRadius: 10, padding: 14, marginBottom: 16, textAlign: 'center' }}>
          {imagePreview ? (
            <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 10 }} />
          ) : (
            <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>
              클라이언트와의 대화 스크린샷을 올리면 AI가 태스크를 정리해줘요
            </div>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ fontSize: 12 }} />
          {imageFile && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{ display: 'block', margin: '10px auto 0', padding: '8px 16px', background: '#8FA8C8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {analyzing ? '분석 중...' : '✨ AI로 분석하기'}
            </button>
          )}
          {aiUrgency && <div style={{ fontSize: 11, color: '#8FA8C8', marginTop: 8 }}>AI 판단 긴급도: {aiUrgency}</div>}
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>클라이언트</label>
        <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="예: Sushi Modo" style={inputStyle} />

        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>태스크 제목</label>
        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="예: 메뉴 사진 3장 새로 촬영 요청" style={inputStyle} />

        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>상세 설명</label>
        <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>링크 (한 줄에 하나씩)</label>
        <textarea value={linksText} onChange={(e) => setLinksText(e.target.value)} rows={2} placeholder="https://..." style={{ ...inputStyle, resize: 'vertical' }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#C8B89A', color: '#1a1a1a', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {submitting ? '생성 중...' : '태스크 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
  marginBottom: 12,
  marginTop: 4,
  boxSizing: 'border-box',
};
