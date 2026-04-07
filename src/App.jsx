import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './index.css'

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#6c63ff' },
  { id: 'in_progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'in_review', title: 'In Review', color: '#3b82f6' },
  { id: 'done', title: 'Done', color: '#10b981' },
]

function getPriorityColor(p) {
  if (p === 'high') return '#ef4444'
  if (p === 'normal') return '#f59e0b'
  return '#6b7280'
}

function getDueDateInfo(due) {
  if (!due) return null
  const now = new Date()
  const d = new Date(due)
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Overdue', color: '#ef4444' }
  if (diff <= 2) return { label: 'Due soon', color: '#f59e0b' }
  return { label: `Due ${d.toLocaleDateString()}`, color: '#6b7280' }
}

function Avatar({ member, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: member.color, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: '700', color: '#fff',
      border: '2px solid #1e1e2e', flexShrink: 0,
    }}>
      {member.name[0].toUpperCase()}
    </div>
  )
}

function TaskCard({ task, onDragStart, onClick, labels, teamMembers }) {
  const dueInfo = getDueDateInfo(task.due_date)
  const taskLabels = labels.filter(l => (task.label_ids || []).includes(l.id))
  const taskMembers = teamMembers.filter(m => (task.assignee_ids || []).includes(m.id))

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      onClick={() => onClick(task)}
      style={{
        background: '#1e1e2e', border: '1px solid #2a2a3d',
        borderRadius: '10px', padding: '14px', marginBottom: '10px',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {taskLabels.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {taskLabels.map(l => (
            <span key={l.id} style={{
              fontSize: '10px', padding: '2px 7px', borderRadius: '99px',
              background: l.color + '33', color: l.color, fontWeight: '600',
            }}>{l.name}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
        {task.title}
      </div>

      {task.description && (
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          {task.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
          background: getPriorityColor(task.priority) + '22',
          color: getPriorityColor(task.priority),
          fontWeight: '600', textTransform: 'uppercase',
        }}>{task.priority}</span>

        {dueInfo && (
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
            background: dueInfo.color + '22', color: dueInfo.color, fontWeight: '600',
          }}>{dueInfo.label}</span>
        )}

        {taskMembers.length > 0 && (
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            {taskMembers.map(m => <Avatar key={m.id} member={m} size={24} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function Column({ column, tasks, onAddTask, onDragStart, onDrop, onClick, labels, teamMembers }) {
  const [isDragOver, setIsDragOver] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { onDrop(column.id); setIsDragOver(false) }}
      style={{
        background: isDragOver ? '#1a1a2e' : '#13131f',
        border: `1px solid ${isDragOver ? column.color : '#2a2a3d'}`,
        borderRadius: '14px', padding: '16px',
        width: '280px', minWidth: '280px', minHeight: '500px',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: column.color }} />
        <span style={{ fontWeight: '600', fontSize: '14px' }}>{column.title}</span>
        <span style={{
          marginLeft: 'auto', background: '#2a2a3d', borderRadius: '99px',
          padding: '2px 8px', fontSize: '12px', color: '#888',
        }}>{tasks.length}</span>
      </div>
      <div>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart}
            onClick={onClick} labels={labels} teamMembers={teamMembers} />
        ))}
      </div>
      <button onClick={() => onAddTask(column.id)} style={{
        width: '100%', marginTop: '10px', padding: '8px',
        background: 'transparent', border: '1px dashed #2a2a3d',
        borderRadius: '8px', color: '#555', fontSize: '13px', cursor: 'pointer',
      }}
        onMouseEnter={e => { e.target.style.borderColor = '#6c63ff'; e.target.style.color = '#6c63ff' }}
        onMouseLeave={e => { e.target.style.borderColor = '#2a2a3d'; e.target.style.color = '#555' }}
      >+ Add Task</button>
    </div>
  )
}

function CreateTaskModal({ defaultStatus, onClose, onSubmit, labels, teamMembers }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState(defaultStatus)
  const [dueDate, setDueDate] = useState('')
  const [selectedLabels, setSelectedLabels] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])

  function toggleLabel(id) {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleMember(id) {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSubmit() {
    if (!title.trim()) return
    onSubmit({ title, description, priority, status, due_date: dueDate || null, label_ids: selectedLabels, assignee_ids: selectedMembers })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: '#13131f',
    border: '1px solid #2a2a3d', borderRadius: '8px', color: '#fff',
    fontSize: '14px', marginBottom: '16px', outline: 'none',
  }
  const labelStyle = { fontSize: '13px', color: '#888', display: 'block', marginBottom: '6px' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1e1e2e', border: '1px solid #2a2a3d', borderRadius: '16px',
        padding: '28px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Create New Task</h2>

        <label style={labelStyle}>Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?" style={inputStyle} />

        <label style={labelStyle}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Add more details..." rows={3}
          style={{ ...inputStyle, resize: 'none' }} />

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Column</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}>
              {COLUMNS.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Due Date</label>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }} />

        {labels.length > 0 && (
          <>
            <label style={labelStyle}>Labels</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {labels.map(l => (
                <span key={l.id} onClick={() => toggleLabel(l.id)} style={{
                  fontSize: '12px', padding: '4px 10px', borderRadius: '99px', cursor: 'pointer',
                  background: selectedLabels.includes(l.id) ? l.color : l.color + '22',
                  color: selectedLabels.includes(l.id) ? '#fff' : l.color,
                  fontWeight: '600', transition: 'all 0.15s',
                }}>{l.name}</span>
              ))}
            </div>
          </>
        )}

        {teamMembers.length > 0 && (
          <>
            <label style={labelStyle}>Assignees</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {teamMembers.map(m => (
                <div key={m.id} onClick={() => toggleMember(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '99px', cursor: 'pointer',
                  background: selectedMembers.includes(m.id) ? m.color + '33' : '#13131f',
                  border: `1px solid ${selectedMembers.includes(m.id) ? m.color : '#2a2a3d'}`,
                  transition: 'all 0.15s',
                }}>
                  <Avatar member={m} size={20} />
                  <span style={{ fontSize: '12px', color: '#fff' }}>{m.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: '8px', background: 'transparent',
            border: '1px solid #2a2a3d', color: '#888', fontSize: '14px', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSubmit} style={{
            padding: '10px 20px', borderRadius: '8px', background: '#6c63ff',
            border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>Create Task</button>
        </div>
      </div>
    </div>
  )
}

function TaskDetailModal({ task, onClose, labels, teamMembers, onStatusChange }) {
  const [comments, setComments] = useState([])
  const [activity, setActivity] = useState([])
  const [newComment, setNewComment] = useState('')
  const [activeTab, setActiveTab] = useState('comments')
  const dueInfo = getDueDateInfo(task.due_date)
  const taskLabels = labels.filter(l => (task.label_ids || []).includes(l.id))
  const taskMembers = teamMembers.filter(m => (task.assignee_ids || []).includes(m.id))

  useEffect(() => {
    loadComments()
    loadActivity()
  }, [task.id])

  async function loadComments() {
    const { data } = await supabase.from('comments')
      .select('*').eq('task_id', task.id).order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  async function loadActivity() {
    const { data } = await supabase.from('activity_log')
      .select('*').eq('task_id', task.id).order('created_at', { ascending: true })
    if (data) setActivity(data)
  }

  async function submitComment() {
    if (!newComment.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('comments')
      .insert([{ task_id: task.id, content: newComment, user_id: user.id }]).select()
    if (data) setComments(prev => [...prev, data[0]])
    setNewComment('')
  }

  function timeAgo(ts) {
    const diff = Math.floor((new Date() - new Date(ts)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const col = COLUMNS.find(c => c.id === task.status)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1e1e2e', border: '1px solid #2a2a3d', borderRadius: '16px',
        width: '580px', maxWidth: '90vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', borderBottom: '1px solid #2a2a3d', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1, marginRight: '16px' }}>{task.title}</h2>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#888',
              fontSize: '20px', cursor: 'pointer', lineHeight: 1,
            }}>×</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <span style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: '99px',
              background: col?.color + '22', color: col?.color, fontWeight: '600',
            }}>{col?.title}</span>
            <span style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: '99px',
              background: getPriorityColor(task.priority) + '22',
              color: getPriorityColor(task.priority), fontWeight: '600', textTransform: 'uppercase',
            }}>{task.priority}</span>
            {dueInfo && (
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '99px',
                background: dueInfo.color + '22', color: dueInfo.color, fontWeight: '600',
              }}>{dueInfo.label}</span>
            )}
            {taskLabels.map(l => (
              <span key={l.id} style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '99px',
                background: l.color + '22', color: l.color, fontWeight: '600',
              }}>{l.name}</span>
            ))}
          </div>

          {taskMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Assigned to:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {taskMembers.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Avatar member={m} size={22} />
                    <span style={{ fontSize: '12px', color: '#ccc' }}>{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.description && (
            <p style={{ fontSize: '13px', color: '#aaa', marginTop: '12px', lineHeight: '1.5' }}>
              {task.description}
            </p>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginTop: '16px' }}>
            {['comments', 'activity'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 16px', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? '#6c63ff' : 'transparent'}`,
                color: activeTab === tab ? '#fff' : '#888',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{tab}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {activeTab === 'comments' ? (
            <>
              {comments.length === 0 && (
                <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                  No comments yet. Be the first!
                </p>
              )}
              {comments.map(c => (
                <div key={c.id} style={{
                  background: '#13131f', borderRadius: '8px',
                  padding: '10px 14px', marginBottom: '8px',
                }}>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                    {timeAgo(c.created_at)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#ddd' }}>{c.content}</div>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#13131f',
                    border: '1px solid #2a2a3d', borderRadius: '8px',
                    color: '#fff', fontSize: '13px', outline: 'none', resize: 'none',
                  }}
                />
                <button onClick={submitComment} style={{
                  marginTop: '8px', padding: '8px 16px', background: '#6c63ff',
                  border: 'none', borderRadius: '8px', color: '#fff',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}>Post Comment</button>
              </div>
            </>
          ) : (
            <>
              {activity.length === 0 && (
                <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                  No activity yet.
                </p>
              )}
              {activity.map(a => (
                <div key={a.id} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#6c63ff', marginTop: '5px', flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: '13px', color: '#ddd' }}>{a.message}</div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{timeAgo(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamModal({ teamMembers, onClose, onAdd, onDelete }) {
  const [name, setName] = useState('')
  const COLORS = ['#6c63ff', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6']
  const [color, setColor] = useState(COLORS[0])

  async function handleAdd() {
    if (!name.trim()) return
    onAdd({ name, color })
    setName('')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1e1e2e', border: '1px solid #2a2a3d', borderRadius: '16px',
        padding: '28px', width: '420px', maxWidth: '90vw',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Team Members</h2>

        <div style={{ marginBottom: '20px' }}>
          {teamMembers.length === 0 && (
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '12px' }}>No team members yet.</p>
          )}
          {teamMembers.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 0', borderBottom: '1px solid #2a2a3d',
            }}>
              <Avatar member={m} size={32} />
              <span style={{ fontSize: '14px', flex: 1 }}>{m.name}</span>
              <button onClick={() => onDelete(m.id)} style={{
                background: 'none', border: 'none', color: '#555',
                cursor: 'pointer', fontSize: '16px',
              }}>×</button>
            </div>
          ))}
        </div>

        <label style={{ fontSize: '13px', color: '#888', display: 'block', marginBottom: '6px' }}>
          Add Member
        </label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Member name" style={{
            width: '100%', padding: '10px 12px', background: '#13131f',
            border: '1px solid #2a2a3d', borderRadius: '8px',
            color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '10px',
          }} />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width: '24px', height: '24px', borderRadius: '50%', background: c,
              cursor: 'pointer', border: color === c ? '2px solid #fff' : '2px solid transparent',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: '8px', background: 'transparent',
            border: '1px solid #2a2a3d', color: '#888', fontSize: '14px', cursor: 'pointer',
          }}>Close</button>
          <button onClick={handleAdd} style={{
            padding: '10px 20px', borderRadius: '8px', background: '#6c63ff',
            border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>Add Member</button>
        </div>
      </div>
    </div>
  )
}

function LabelsModal({ labels, onClose, onAdd, onDelete }) {
  const [name, setName] = useState('')
  const COLORS = ['#6c63ff', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6']
  const [color, setColor] = useState(COLORS[0])

  async function handleAdd() {
    if (!name.trim()) return
    onAdd({ name, color })
    setName('')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1e1e2e', border: '1px solid #2a2a3d', borderRadius: '16px',
        padding: '28px', width: '420px', maxWidth: '90vw',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Labels</h2>

        <div style={{ marginBottom: '20px' }}>
          {labels.length === 0 && (
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '12px' }}>No labels yet.</p>
          )}
          {labels.map(l => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 0', borderBottom: '1px solid #2a2a3d',
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: '14px', flex: 1 }}>{l.name}</span>
              <button onClick={() => onDelete(l.id)} style={{
                background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px',
              }}>×</button>
            </div>
          ))}
        </div>

        <label style={{ fontSize: '13px', color: '#888', display: 'block', marginBottom: '6px' }}>
          Add Label
        </label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Label name (e.g. Bug, Feature)" style={{
            width: '100%', padding: '10px 12px', background: '#13131f',
            border: '1px solid #2a2a3d', borderRadius: '8px',
            color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '10px',
          }} />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width: '24px', height: '24px', borderRadius: '50%', background: c,
              cursor: 'pointer', border: color === c ? '2px solid #fff' : '2px solid transparent',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: '8px', background: 'transparent',
            border: '1px solid #2a2a3d', color: '#888', fontSize: '14px', cursor: 'pointer',
          }}>Close</button>
          <button onClick={handleAdd} style={{
            padding: '10px 20px', borderRadius: '8px', background: '#6c63ff',
            border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>Add Label</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [tasks, setTasks] = useState([])
  const [labels, setLabels] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [modalStatus, setModalStatus] = useState('todo')
  const [selectedTask, setSelectedTask] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterLabel, setFilterLabel] = useState('all')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) await supabase.auth.signInAnonymously()
      await Promise.all([loadTasks(), loadLabels(), loadTeamMembers()])
    }
    init()
  }, [])

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: true })
    if (data) setTasks(data)
    setLoading(false)
  }

  async function loadLabels() {
    const { data } = await supabase.from('labels').select('*').order('created_at', { ascending: true })
    if (data) setLabels(data)
  }

  async function loadTeamMembers() {
    const { data } = await supabase.from('team_members').select('*').order('created_at', { ascending: true })
    if (data) setTeamMembers(data)
  }

  async function handleSubmitTask(newTask) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('tasks')
      .insert([{ ...newTask, user_id: user.id }]).select()
    if (data) {
      setTasks(prev => [...prev, data[0]])
      await supabase.from('activity_log').insert([{
        task_id: data[0].id,
        message: 'Task created',
        user_id: user.id,
      }])
    }
  }

  async function handleDrop(columnId) {
    if (!draggingId) return
    const task = tasks.find(t => t.id === draggingId)
    if (!task || task.status === columnId) { setDraggingId(null); return }
    const fromCol = COLUMNS.find(c => c.id === task.status)
    const toCol = COLUMNS.find(c => c.id === columnId)
    setTasks(prev => prev.map(t => t.id === draggingId ? { ...t, status: columnId } : t))
    await supabase.from('tasks').update({ status: columnId }).eq('id', draggingId)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_log').insert([{
      task_id: draggingId,
      message: `Moved from ${fromCol?.title} → ${toCol?.title}`,
      user_id: user.id,
    }])
    setDraggingId(null)
  }

  async function handleAddLabel(label) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('labels')
      .insert([{ ...label, user_id: user.id }]).select()
    if (data) setLabels(prev => [...prev, data[0]])
  }

  async function handleDeleteLabel(id) {
    await supabase.from('labels').delete().eq('id', id)
    setLabels(prev => prev.filter(l => l.id !== id))
  }

  async function handleAddMember(member) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('team_members')
      .insert([{ ...member, user_id: user.id }]).select()
    if (data) setTeamMembers(prev => [...prev, data[0]])
  }

  async function handleDeleteMember(id) {
    await supabase.from('team_members').delete().eq('id', id)
    setTeamMembers(prev => prev.filter(m => m.id !== id))
  }

  const completedCount = tasks.filter(t => t.status === 'done').length
  const overdueCount = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    return new Date(t.due_date) < new Date()
  }).length

  const filteredTasks = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    const matchLabel = filterLabel === 'all' || (t.label_ids || []).includes(filterLabel)
    return matchSearch && matchPriority && matchLabel
  })

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', color: '#888', fontSize: '16px',
    }}>Loading your board...</div>
  )

  return (
    <div style={{ padding: '32px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>My Board</h1>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ color: '#888', fontSize: '13px' }}>{tasks.length} total</span>
              <span style={{ color: '#10b981', fontSize: '13px' }}>✓ {completedCount} done</span>
              {overdueCount > 0 && (
                <span style={{ color: '#ef4444', fontSize: '13px' }}>⚠ {overdueCount} overdue</span>
              )}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowLabelsModal(true)} style={{
              padding: '8px 14px', background: '#1e1e2e', border: '1px solid #2a2a3d',
              borderRadius: '8px', color: '#ccc', fontSize: '13px', cursor: 'pointer',
            }}>🏷 Labels</button>
            <button onClick={() => setShowTeamModal(true)} style={{
              padding: '8px 14px', background: '#1e1e2e', border: '1px solid #2a2a3d',
              borderRadius: '8px', color: '#ccc', fontSize: '13px', cursor: 'pointer',
            }}>👥 Team</button>
            <button onClick={() => { setModalStatus('todo'); setShowCreateModal(true) }} style={{
              padding: '8px 16px', background: '#6c63ff', border: 'none',
              borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}>+ New Task</button>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search tasks..."
            style={{
              padding: '8px 12px', background: '#1e1e2e', border: '1px solid #2a2a3d',
              borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', width: '220px',
            }}
          />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
            padding: '8px 12px', background: '#1e1e2e', border: '1px solid #2a2a3d',
            borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none',
          }}>
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          {labels.length > 0 && (
            <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)} style={{
              padding: '8px 12px', background: '#1e1e2e', border: '1px solid #2a2a3d',
              borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none',
            }}>
              <option value="all">All Labels</option>
              {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {COLUMNS.map(column => (
          <Column
            key={column.id}
            column={column}
            tasks={filteredTasks.filter(t => t.status === column.id)}
            onAddTask={status => { setModalStatus(status); setShowCreateModal(true) }}
            onDragStart={setDraggingId}
            onDrop={handleDrop}
            onClick={setSelectedTask}
            labels={labels}
            teamMembers={teamMembers}
          />
        ))}
      </div>

      {showCreateModal && (
        <CreateTaskModal
          defaultStatus={modalStatus}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleSubmitTask}
          labels={labels}
          teamMembers={teamMembers}
        />
      )}
      {showTeamModal && (
        <TeamModal
          teamMembers={teamMembers}
          onClose={() => setShowTeamModal(false)}
          onAdd={handleAddMember}
          onDelete={handleDeleteMember}
        />
      )}
      {showLabelsModal && (
        <LabelsModal
          labels={labels}
          onClose={() => setShowLabelsModal(false)}
          onAdd={handleAddLabel}
          onDelete={handleDeleteLabel}
        />
      )}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          labels={labels}
          teamMembers={teamMembers}
          onStatusChange={() => {}}
        />
      )}
    </div>
  )
}

export default App