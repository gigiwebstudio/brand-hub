'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import NewTaskModal from './NewTaskModal';

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

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('not_started');
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const designInputRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      // keep selectedTask in sync with fresh data if open
      setSelectedTask((prev) =>
        prev ? data.tasks?.find((t) => t.id === prev.id) || prev : prev
      );
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
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    setSelectedTask((prev) => (prev?.id === task.id ? { ...prev, status: newStatus } : prev));
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: task.rowIndex, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchTasks();
    }
  };

  const submitComment = async (task) => {
    if (!newComment.trim()) return;
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: task.rowIndex, appendComment: newComment.trim() }),
      });
      setNewComment('');
      fetchTasks();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const uploadDesignImage = async (task, file) => {
    setUploadingDesign(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/upload-task-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
          client: task.client,
          taskTitle: task.taskTitle,
          folderType: 'designs',
        }),
      });
      const data = await res.json();
      if (data.fileId) {
        const updatedDesignIds = [...task.designImageIds, data.fileId];
        await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rowIndex: task.rowIndex, designImageIds: updatedDesignIds }),
        });
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to upload design:', err);
      alert('디자인 업로드에 실패했어요.');
    } finally {
      setUploadingDesign(false);
    }
  };

  const renderCard = (task) => (
    <div
      key={task.id}
      onClick={() => setSelectedTask(task)}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        border: '1px solid #eee',
      }}
    >
      <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{task.client}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>
        {task.taskTitle}
      </div>
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
        {task.screenshotImageIds.length > 0 && (
          <span style={{ fontSize: 11, color: '#888' }}>📷 {task.screenshotImageIds.length}</span>
        )}
        {task.designImageIds.length > 0 && (
          <span style={{ fontSize: 11, color: '#888' }}>🎨 {task.designImageIds.length}</span>
        )}
        {task.links.length > 0 && (
          <span style={{ fontSize: 11, color: '#888' }}>🔗 {task.links.length}</span>
        )}
      </div>
    </div>
  );

  const columnTasks = (statusKey) => tasks.filter((t) => t.status === statusKey);
  const statusMeta = (key) => STATUSES.find((s) => s.key === key) || STATUSES[0];

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>✅ Tasks</h1>
        <button
          onClick={() => setShowNewTask(true)}
          style={{
            padding: '8px 16px',
            background: '#C8B89A',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
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
            <div key={s.key}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#555',
                  marginBottom: 10,
                  paddingBottom: 6,
                  borderBottom: `2px solid ${s.color}`,
                }}
              >
                {s.label} ({columnTasks(s.key).length})
              </div>
              {columnTasks(s.key).map(renderCard)}
            </div>
          ))}
        </div>
      )}

      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => {
            setShowNewTask(false);
            fetchTasks();
          }}
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
            alignItems: 'flex-end',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px 16px 0 0',
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, color: '#999' }}>{selectedTask.client}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{selectedTask.taskTitle}</div>
            {selectedTask.taskDescription && (
              <div style={{ fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 1.5 }}>
                {selectedTask.taskDescription}
              </div>
            )}

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

            {selectedTask.screenshotImageIds.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 6 }}>
                  📷 SCREENSHOTS
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                  {selectedTask.screenshotImageIds.map((id) => (
                    <img
                      key={id}
                      src={`https://drive.google.com/thumbnail?id=${id}&sz=w400`}
                      alt="screenshot"
                      style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 8 }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 6 }}>
                🎨 DESIGNS
              </div>
              {selectedTask.designImageIds.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
                  {selectedTask.designImageIds.map((id) => (
                    <img
                      key={id}
                      src={`https://drive.google.com/thumbnail?id=${id}&sz=w400`}
                      alt="design"
                      style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 8 }}
                    />
                  ))}
                </div>
              )}
              <input
                ref={designInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadDesignImage(selectedTask, file);
                }}
                style={{ fontSize: 12 }}
              />
              {uploadingDesign && (
                <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>업로드 중...</span>
              )}
            </div>

            {selectedTask.links.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {selectedTask.links.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', fontSize: 13, color: '#3768AB', marginBottom: 6, wordBreak: 'break-all' }}
                  >
                    🔗 {link}
                  </a>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 6 }}>
              💬 COMMENTS
            </div>
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
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedTask.comments}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
