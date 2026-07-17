import React, { useState, useEffect, useRef } from 'react';
import { UserRole, ROLE_NAMES } from '../types';
import ThemeSelector from './ThemeSelector';
import { ThemeState } from '../themes';
import { api } from '../api/client';

interface Props {
  darkMode: boolean;
  theme: ThemeState;
  userList: { id: number; full_name: string; email: string; role: { name: string }; status: string }[];
  allTasks: any[];
  reviewRequests: any[];
  onToggleTheme: () => void;
  onChangeTheme: (color: string, isDark: boolean) => void;
  onLogout: () => void;
  onCreateUser: (e: React.FormEvent) => void;
  addUsername: string; setAddUsername: (v: string) => void;
  addPassword: string; setAddPassword: (v: string) => void;
  addName: string; setAddName: (v: string) => void;
  addRole: UserRole; setAddRole: (v: UserRole) => void;
  onInspectRequest: (req: any) => void;
  onDeleteRequest: (reqId: number) => void;
  onToggleUserStatus: (id: number, status: string) => void;
  onDeleteUser: (id: number, name: string) => void;
  onOpenTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onNavigate: (screen: string) => void;
  onRefresh: () => void;
}

export default function AdminDashboard({
  darkMode, theme, userList, allTasks, reviewRequests, onToggleTheme, onChangeTheme, onLogout,
  onCreateUser, addUsername, setAddUsername, addPassword, setAddPassword,
  addName, setAddName, addRole, setAddRole, onInspectRequest, onDeleteRequest, onToggleUserStatus,
  onDeleteUser, onOpenTask, onDeleteTask, onNavigate, onRefresh,
}: Props) {
  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
  const inputBg = darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900';
  const mutedBg = darkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200';

  const [leftTab, setLeftTab] = useState<'tasks' | 'projects' | 'audit'>('tasks');
  const [projects, setProjects] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  useEffect(() => {
    if (leftTab === 'projects') {
      setLoadingProjects(true);
      api.listProjects().then(setProjects).catch(() => setProjects([])).finally(() => setLoadingProjects(false));
    }
    if (leftTab === 'audit') {
      setLoadingAudit(true);
      api.listAuditLogs().then(setAuditLogs).catch(() => setAuditLogs([])).finally(() => setLoadingAudit(false));
    }
  }, [leftTab]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await api.createProject({ name: newProjectName.trim(), description: newProjectDesc.trim() || undefined });
      setNewProjectName(''); setNewProjectDesc(''); setShowCreateProject(false);
      setProjects(await api.listProjects());
    } catch { alert('Не удалось создать проект'); }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await api.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch { alert('Не удалось удалить проект'); }
  };

  return (
    <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${bg}`}>
      <header className={`flex justify-between items-center mb-6 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className="text-xl font-black tracking-tight text-amber-500">Панель Администратора</h1>
          <p className="text-xs opacity-50">Управление пользователями, задачами, проектами и аудитом</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={onRefresh} className="bg-amber-600/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-amber-600 hover:text-white transition-all">⟳</button>
          <ThemeSelector theme={theme} onChangeTheme={onChangeTheme} />
          <button onClick={() => onNavigate('SUPERVISOR_DASHBOARD')} className="bg-purple-600/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-purple-600 hover:text-white transition-all">Задачи</button>
          <button onClick={() => onNavigate('ML_ENGINEER_DASHBOARD')} className="bg-sky-600/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-sky-600 hover:text-white transition-all">Выгрузки</button>
          <button onClick={() => onNavigate('CUSTOMER_DASHBOARD')} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">Проекты</button>
          <button onClick={onLogout} className="bg-red-600/20 text-red-500 border border-red-500/30 text-xs px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">Выйти</button>
        </div>
      </header>

      <div className="flex gap-2 mb-3 shrink-0">
        <button onClick={() => setLeftTab('tasks')} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${leftTab === 'tasks' ? 'bg-emerald-600 text-white' : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>Задачи</button>
        <button onClick={() => setLeftTab('projects')} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${leftTab === 'projects' ? 'bg-sky-600 text-white' : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>Проекты</button>
        <button onClick={() => setLeftTab('audit')} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${leftTab === 'audit' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>Аудит</button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        <div className={`col-span-2 border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
          {leftTab === 'tasks' && (
            <>
              <h3 className="text-sm font-bold text-emerald-500 mb-3">Все задачи на сервере</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {allTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 text-xs">
                    <span className="text-2xl mb-1">—</span> Нет задач.
                  </div>
                ) : (
                  allTasks.map((t: any) => (
                    <div key={t.id} className={`p-3 border rounded-xl flex justify-between items-center transition-all ${darkMode ? 'bg-black/40 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm">Задача #{t.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            t.status === 'On Review' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                            t.status === 'Rework' ? 'bg-red-500/20 text-red-500' :
                            t.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-500' :
                            t.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>{t.status}</span>
                        </div>
                        <p className="text-[10px] opacity-50 font-mono mt-1">
                          {t.assignee ? t.assignee.full_name : '—'} | {t.segment_count || 0} сегм. | {t.comment_count || 0} зам.
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {t.status !== 'Accepted' && (
                          <button onClick={() => onOpenTask(t.id)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors">Открыть</button>
                        )}
                        <button onClick={() => onDeleteTask(t.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors">Удалить</button>
                      </div>
                    </div>
                  ))
                )}
                {reviewRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <div className="pt-3 border-t mt-3" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
                    <h4 className="text-[10px] font-bold text-amber-400 mb-2">Локальные заявки (ожидают):</h4>
                    {reviewRequests.filter(r => r.status === 'PENDING').map((req: any) => (
                      <div key={req.id} className={`p-2 border rounded-lg flex justify-between items-center mb-1 ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="text-xs">{req.user} — {req.segmentCount} сегм.</div>
                        <div className="flex gap-1">
                          <button onClick={() => onInspectRequest(req)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2 py-1 rounded-lg">Проверить</button>
                          <button onClick={() => onDeleteRequest(req.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2 py-1 rounded-lg">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {leftTab === 'projects' && (
            <>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-sky-500">Проекты</h3>
                <button onClick={() => setShowCreateProject(!showCreateProject)} className="bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">+ Создать</button>
              </div>
              {showCreateProject && (
                <div className={`p-3 border rounded-xl mb-3 space-y-2 ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Название проекта" className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
                  <input value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Описание (необязательно)" className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
                  <div className="flex gap-2">
                    <button onClick={handleCreateProject} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg">Создать</button>
                    <button onClick={() => setShowCreateProject(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1.5 rounded-lg">Отмена</button>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingProjects ? (
                  <div className="flex items-center justify-center h-full text-xs opacity-50">Загрузка...</div>
                ) : projects.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 text-xs">
                    <span className="text-2xl mb-1">—</span> Нет проектов.
                  </div>
                ) : (
                  projects.map(p => (
                    <div key={p.id} className={`p-3 border rounded-xl transition-all ${darkMode ? 'bg-black/40 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="font-bold text-sm">{p.name}</div>
                          {p.description && <p className="text-[10px] opacity-50 mt-0.5">{p.description}</p>}
                          <p className="text-[10px] opacity-40 mt-0.5">ID: {p.id}{p.deadline ? ` | Дедлайн: ${p.deadline.slice(0, 10)}` : ''}{p.status ? ` | ${p.status}` : ''}</p>
                        </div>
                        <div className="flex gap-1 items-center shrink-0">
                          {p.instruction_path ? (
                            <>
                              <button onClick={() => window.open(api.getInstructionUrl(p.id), '_blank')} className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg transition-colors">Инстр.</button>
                              <button onClick={async () => { try { await api.deleteInstruction(p.id); setProjects(prev => prev.map(x => x.id === p.id ? { ...x, instruction_path: null } : x)); } catch { alert('Ошибка'); } }} className="bg-red-600/50 hover:bg-red-700 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg transition-colors">✕</button>
                            </>
                          ) : (
                            <button onClick={() => document.getElementById(`inst-input-${p.id}`)?.click()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg transition-colors">+ Инстр.</button>
                          )}
                          <input id={`inst-input-${p.id}`} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { await api.uploadInstruction(p.id, file); setProjects(prev => prev.map(x => x.id === p.id ? { ...x, instruction_path: file.name } : x)); } catch { alert('Ошибка загрузки'); } e.target.value = ''; }} />
                          <button onClick={() => handleDeleteProject(p.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors">Удалить</button>
                        </div>
                      </div>
                    </div>))

                )}
              </div>
            </>
          )}

          {leftTab === 'audit' && (
            <>
              <h3 className="text-sm font-bold text-purple-500 mb-3">Журнал аудита</h3>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {loadingAudit ? (
                  <div className="flex items-center justify-center h-full text-xs opacity-50">Загрузка...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 text-xs">
                    <span className="text-2xl mb-1">—</span> Нет записей аудита.
                  </div>
                ) : (
                  auditLogs.map((log: any, i: number) => (
                    <div key={log.id || i} className={`flex items-start gap-2 text-[10px] p-2 rounded border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="font-mono opacity-40 shrink-0 w-16">{log.created_at ? log.created_at.slice(11, 19) : '—'}</span>
                      <span className="font-bold shrink-0 w-16">{log.user_id ? `#${log.user_id}` : '—'}</span>
                      <span className="opacity-60 shrink-0 w-12">{log.entity_type || '—'}</span>
                      <span className="opacity-60 shrink-0 w-8">{log.entity_id || '—'}</span>
                      <span className="flex-1">{log.action || '—'}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col space-y-4 transition-all ${card}`}>
          <form onSubmit={onCreateUser} className={`p-4 rounded-xl border space-y-3 transition-colors ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-bold text-indigo-500 text-xs uppercase tracking-wider">Зарегистрировать пользователя</h4>
            <input required placeholder="ФИО" value={addName} onChange={e => setAddName(e.target.value)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
            <input required placeholder="Email" type="email" value={addUsername} onChange={e => setAddUsername(e.target.value)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
            <input required placeholder="Пароль" type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
            <select value={addRole} onChange={e => setAddRole(e.target.value as UserRole)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`}>
              <option value="Admin">Администратор</option>
              <option value="Supervisor">Супервайзер</option>
              <option value="Transcriber">Разметчик</option>
              <option value="Verifier">Верификатор</option>
              <option value="ML Engineer">ML-инженер</option>
              <option value="Customer">Заказчик</option>
            </select>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">Создать</button>
          </form>

          <div className={`flex-1 rounded-xl border p-3 overflow-y-auto space-y-1 transition-colors ${mutedBg}`}>
            <h5 className="text-[10px] uppercase font-bold opacity-40 tracking-wider mb-2">Пользователи ({userList.length})</h5>
            {userList.map(u => (
              <div key={u.id} className={`flex justify-between items-center p-2 border rounded font-mono text-xs transition-colors ${darkMode ? 'bg-black/50 border-gray-900' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-bold">{u.full_name}</div>
                  <div className="text-[10px] opacity-50 truncate">{u.email}</div>
                </div>
                  <div className="flex items-center gap-1 ml-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      u.role.name === 'Admin' ? 'bg-amber-500/20 text-amber-500' :
                      u.role.name === 'Supervisor' ? 'bg-purple-500/20 text-purple-500' :
                      u.role.name === 'Verifier' ? 'bg-emerald-500/20 text-emerald-500' :
                      'bg-gray-500/20 text-gray-500'
                    }`}>{u.role.name}</span>
                    <button
                      onClick={() => onToggleUserStatus(u.id, u.status === 'blocked' ? 'active' : 'blocked')}
                      className={`text-[9px] px-1 py-0.5 rounded border ${u.status === 'blocked' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}
                    >
                      {u.status === 'blocked' ? 'Разбл.' : 'Активен'}
                    </button>
                    <button
                      onClick={() => onDeleteUser(u.id, u.full_name)}
                      className="text-[9px] px-1 py-0.5 rounded border bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/40"
                    >Удалить</button>
                  </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}