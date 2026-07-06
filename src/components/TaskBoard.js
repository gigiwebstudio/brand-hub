'use client';

import { useEffect, useState, useCallback } from 'react';
import NewTaskModal from './NewTaskModal';
import { clients } from '../app/clients';

const OFFICIAL_CLIENT_NAMES = clients.filter((c) => c.active).map((c) => c.name);

const STATUSES = [
  { key: 'not_started', label: 'Not Started', color: '#C8B89A' },
  { key: 'in_progress', label: 'In Progress', color: '#8FA8C8' },
  { key: 'needs_review', label: 'Needs Review', color: '#D8B26A' },
  { key: 'needs_changes', label: 'Needs Changes', color: '#C97B63' },
  { key: 'completed', label: 'Completed', color: '#B7C9A8' },
];

const POLL_INTERVAL_MS = 12000;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      timeZone: 'America/Vancouver',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('not_started');
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newLink, setNewLink] = useState('');
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      setSelectedTask((prev) => (prev ? data.tasks?.find((t) => t.id === prev.id) || prev : prev));
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const updateStatus = async (task, newStatus) => {
    if (!task || task.status === newStatus) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    setSelectedTask((prev) => (prev?.id === task.id ? { ...prev, status: newStatus } : prev));
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: task.rowIndex, status: newStatus }),
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchTasks();
    }
  };

  const patchTask = async (task, updates) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: task.rowIndex, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('PATCH failed:', data);
        alert(`업데이트 실패: ${data.detail || data.error}`);
        return false;
      }
      fetchTasks();
      return true;
    } catch (err) {
      console.error('Failed to patch task:', err);
      alert('업데이트에 실패했어요. 다시 시도해주세요.');
      return false;
    }
  };

  const submitComment = async (task) => {
    if (!newComment.trim()) return;
    const ok = await patchTask(task, { appendComment: newComment.trim() });
    if (ok) setNewComment('');
  };

  const submitLink = async (task) => {
    if (!newLink.trim()) return;
    await patchTask(task, { links: [...task.links, newLink.trim()] });
    setNewLink('');
  };

  const removeLink = async (task, link) => {
    await patchTask(task, { links: task.links.filter((l) => l !== link) });
  };

  const saveTitle = async (task) => {
    if (!titleDraft.trim()) return;
    const ok = await patchTask(task, { taskTitle: titleDraft.trim() });
    if (ok) setEditingTitle(false);
  };

  const saveDescription = async (task) => {
    const ok = await patchTask(task, { taskDescription: descDraft });
    if (ok) setEditingDesc(false);
  };

  const deleteTask = async (task) => {
    if (!confirm(`"${task.taskTitle}" 태스크를 삭제할까요? 되돌릴 수 없어요.`)) return;
    try {
      await fetch(`/api/tasks?rowIndex=${task.rowIndex}`, { method: 'DELETE' });
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('삭제에 실패했어요.');
    }
  };

  const uploadImage = async (task, file, folderType, currentCount) => {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/upload-task-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: file.type,
        client: task.client,
        taskTitle: task.taskTitle,
        folderType,
        index: currentCount + 1,
        dateStr: task.createdAt ? task.createdAt.slice(0, 10) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error);
    return data.fileId;
  };

  const handleMultiUpload = async (task, files, folderType) => {
    const setUploading = folderType === 'designs' ? setUploadingDesign : setUploadingScreenshot;
    const idField = folderType === 'designs' ? 'designImageIds' : 'screenshotImageIds';
    setUploading(true);
    try {
      let count = task[idField].length;
      const newIds = [];
      for (const file of files) {
        const fileId = await uploadImage(task, file, folderType, count);
        newIds.push(fileId);
        count += 1;
      }
      await patchTask(task, { [idField]: [...task[idField], ...newIds] });
    } catch (err) {
      console.error('Failed to upload:', err);
      alert(`이미지 업로드에 실패했어요: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const openDriveFolder = async (task, folderType) => {
    try {
      const res = await fetch('/api/ensure-task-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: task.client,
          taskTitle: task.taskTitle,
          folderType,
          dateStr: task.createdAt ? task.createdAt.slice(0, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (data.folderUrl) window.open(data.folderUrl, '_blank');
      else alert('폴더 링크를 가져오지 못했어요.');
    } catch (err) {
      console.error('Failed to open drive folder:', err);
      alert('폴더 열기에 실패했어요.');
    }
  };

  const columnTasks = (statusKey) => tasks.filter((t) => t.status === statusKey);

  const renderCard = (task) => (
    <div
      key={task.id}
      draggable={!isMobile}
      onDragStart={() => setDraggedTaskId(task.id)}
      onDragEnd={() => setDraggedTaskId(null)}
      onClick={() => {
        setSelectedTask(task);
        setEditingTitle(false);
        setEditingDesc(false);
      }}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        border: '1px solid #eee',
        opacity: draggedTaskId === task.id ? 0.4 : 1,
      }}
    >
      <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{task.client}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>{task.taskTitle}</div>
      {task.taskDescription && (
        <div
          style={{
            fontSize: 12,
            color: '#777',
            marginBottom: 8,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.taskDescription}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {task.screenshotImageIds.length > 0 && <span style={{ fontSize: 11, color: '#888' }}>📷 {task.screenshotImageIds.length}</span>}
        {task.designImageIds.length > 0 && <span style={{ fontSize: 11, color: '#888' }}>🎨 {task.designImageIds.length}</span>}
        {task.links.length > 0 && <span style={{ fontSize: 11, color: '#888' }}>🔗 {task.links.length}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>✅ Tasks</h1>
        <button
          onClick={() => setShowNewTask(true)}
          style={{ padding: '8px 16px', background: '#C8B89A', color: '#1a1a1a', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + New Task
        </button>
      </div>

      {isMobile && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: 20,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                background: activeTab === s.key ? s.color : '#f0f0f0',
                color: activeTab === s.key ? '#1a1a1a' : '#888',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label} ({columnTasks(s.key).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>불러오는 중...</div>
      ) : isMobile ? (
        <div>{columnTasks(activeTab).map(renderCard)}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {STATUSES.map((s) => (
            <div
              key={s.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(s.key);
              }}
              onDragLeave={() => setDragOverColumn((prev) => (prev === s.key ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                const task = tasks.find((t) => t.id === draggedTaskId);
                if (task) updateStatus(task, s.key);
                setDraggedTaskId(null);
                setDragOverColumn(null);
              }}
              style={{
                background: dragOverColumn === s.key ? '#faf7f0' : 'transparent',
                borderRadius: 10,
                padding: dragOverColumn === s.key ? 6 : 0,
                minHeight: 40,
                transition: 'background 0.1s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${s.color}` }}>
                {s.label} ({columnTasks(s.key).length})
              </div>
              {columnTasks(s.key).map(renderCard)}
            </div>
          ))}
        </div>
      )}

      {showNewTask && (
        <NewTaskModal
          isMobile={isMobile}
          onClose={() => setShowNewTask(false)}
          onCreated={() => {
            setShowNewTask(false);
            fetchTasks();
          }}
          clientOptions={[...new Set([...OFFICIAL_CLIENT_NAMES, ...tasks.map((t) => t.client).filter(Boolean)])]}
        />
      )}

      {selectedTask && (
        <div
          onClick={() => setSelectedTask(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: isMobile ? '100%' : 560,
              maxHeight: isMobile ? '90vh' : '85vh',
              overflowY: 'auto',
              borderRadius: isMobile ? '16px 16px 0 0' : 16,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 12, color: '#999' }}>{selectedTask.client}</div>
              <button
                onClick={() => deleteTask(selectedTask)}
                style={{ border: 'none', background: 'none', color: '#C97B63', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                🗑 삭제
              </button>
            </div>

            {editingTitle ? (
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  style={{ flex: 1, fontSize: 16, fontWeight: 700, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                  autoFocus
                />
                <button onClick={() => saveTitle(selectedTask)} style={{ border: 'none', background: '#8FA8C8', color: '#fff', borderRadius: 6, padding: '0 10px', fontSize: 12, cursor: 'pointer' }}>
                  저장
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setTitleDraft(selectedTask.taskTitle);
                  setEditingTitle(true);
                }}
                style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, cursor: 'text' }}
              >
                {selectedTask.taskTitle} <span style={{ fontSize: 11, color: '#bbb', fontWeight: 400 }}>✏️</span>
              </div>
            )}

            {editingDesc ? (
              <div style={{ marginBottom: 10 }}>
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={3}
                  style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: 6 }}
                  autoFocus
                />
                <button onClick={() => saveDescription(selectedTask)} style={{ border: 'none', background: '#8FA8C8', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                  저장
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setDescDraft(selectedTask.taskDescription || '');
                  setEditingDesc(true);
                }}
                style={{ fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 1.5, cursor: 'text' }}
              >
                {selectedTask.taskDescription || <span style={{ color: '#bbb' }}>상세 설명 추가...</span>} <span style={{ fontSize: 11, color: '#bbb' }}>✏️</span>
              </div>
            )}

            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>
              생성: {formatDate(selectedTask.createdAt)} · 수정: {formatDate(selectedTask.updatedAt)}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => updateStatus(selectedTask, s.key)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 20,
                    border: selectedTask.status === s.key ? `2px solid ${s.color}` : '1px solid #ddd',
                    background: selectedTask.status === s.key ? s.color : '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#999' }}>📷 SCREENSHOTS</div>
                <button
                  onClick={() => openDriveFolder(selectedTask, 'screenshots')}
                  style={{ border: 'none', background: 'none', color: '#3768AB', fontSize: 11, cursor: 'pointer' }}
                >
                  📁 Drive에서 열기
                </button>
              </div>
              {selectedTask.screenshotImageIds.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
                  {selectedTask.screenshotImageIds.map((id) => (
                    <a key={id} href={`https://drive.google.com/file/d/${id}/view`} target="_blank" rel="noopener noreferrer">
                      <img src={`https://drive.google.com/thumbnail?id=${id}&sz=w400`} alt="screenshot" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) handleMultiUpload(selectedTask, files, 'screenshots');
                  e.target.value = '';
                }}
                style={{ fontSize: 12 }}
              />
              {uploadingScreenshot && <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>업로드 중...</span>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#999' }}>🎨 DESIGNS</div>
                <button
                  onClick={() => openDriveFolder(selectedTask, 'designs')}
                  style={{ border: 'none', background: 'none', color: '#3768AB', fontSize: 11, cursor: 'pointer' }}
                >
                  📁 Drive에서 열기
                </button>
              </div>
              {selectedTask.designImageIds.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
                  {selectedTask.designImageIds.map((id) => (
                    <a key={id} href={`https://drive.google.com/file/d/${id}/view`} target="_blank" rel="noopener noreferrer">
                      <img src={`https://drive.google.com/thumbnail?id=${id}&sz=w400`} alt="design" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) handleMultiUpload(selectedTask, files, 'designs');
                  e.target.value = '';
                }}
                style={{ fontSize: 12 }}
              />
              {uploadingDesign && <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>업로드 중...</span>}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 6 }}>🔗 LINKS</div>
            {selectedTask.links.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {selectedTask.links.map((link) => (
                  <div key={link} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#3768AB', wordBreak: 'break-all', flex: 1 }}>
                      {link}
                    </a>
                    <button onClick={() => removeLink(selectedTask, link)} style={{ border: 'none', background: 'none', color: '#C97B63', cursor: 'pointer', fontSize: 12 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://..."
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
              />
              <button
                onClick={() => submitLink(selectedTask)}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#8FA8C8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                추가
              </button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 6 }}>💬 COMMENTS</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="피드백/코멘트 추가..."
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
              />
              <button
                onClick={() => submitComment(selectedTask)}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#8FA8C8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                추가
              </button>
            </div>
            {selectedTask.comments && (
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedTask.comments}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
