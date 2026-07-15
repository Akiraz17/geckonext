import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface TaskItem {
  id: number; project: string; file: string; assignee: string;
  status: string; deadline: string; duration: number;
  assignee_id?: number; verifier_id?: number; segment_count?: number; comment_count?: number;
  assignee_info?: { full_name: string } | null; verifier_info?: { full_name: string } | null;
}

const MOCK_TASKS: TaskItem[] = [
  { id: 1, project: 'Project Alpha', file: 'audio_001.wav', assignee: 'Иван (Разметчик)', status: 'In Progress', deadline: '2026-07-20', duration: 45 },
  { id: 2, project: 'Project Alpha', file: 'audio_002.wav', assignee: 'Мария (Разметчик)', status: 'On Review', deadline: '2026-07-20', duration: 32 },
  { id: 3, project: 'Project Beta', file: 'video_001.mp4', assignee: 'Пётр (Разметчик)', status: 'New', deadline: '2026-07-25', duration: 120 },
  { id: 4, project: 'Project Beta', file: 'video_002.mp4', assignee: '—', status: 'New', deadline: '2026-07-25', duration: 90 },
  { id: 5, project: 'Project Alpha', file: 'audio_003.wav', assignee: 'Иван (Разметчик)', status: 'Completed', deadline: '2026-07-18', duration: 25 },
];

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-gray-500/20 text-gray-400', 'Assigned': 'bg-blue-500/20 text-blue-400',
  'In Progress': 'bg-indigo-500/20 text-indigo-400', 'On Review': 'bg-amber-500/20 text-amber-400',
  'Rework': 'bg-red-500/20 text-red-400', 'Fixed': 'bg-purple-500/20 text-purple-400',
  'Accepted': 'bg-emerald-500/20 text-emerald-400', 'Completed': 'bg-emerald-500/20 text-emerald-400',
  'Exported': 'bg-sky-500/20 text-sky-400',
};

const STATUS_NAMES: Record<string, string> = {
  'New': 'Новая', 'Assigned': 'Назначена', 'In Progress': 'В работе',
  'On Review': 'На проверке', 'Rework': 'На доработке', 'Fixed': 'Исправлена',
  'Accepted': 'Принята', 'Completed': 'Завершена', 'Exported': 'Выгружена',
};

interface Props { darkMode: boolean; onToggleTheme: () => void; onLogout: () => void; }

export default function SupervisorDashboard({ darkMode, onToggleTheme, onLogout }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>(MOCK_TASKS);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await api.listTasks();
        if (list.length > 0) {
          setTasks(list.map((t: any) => ({
            id: t.id, project: `Проект #${t.project_id}`, file: `task_${t.id}`,
            assignee: t.assignee?.full_name || 'Не назначен', status: t.status || 'New',
            deadline: t.deadline?.slice(0, 10) || '—', duration: 0,
            assignee_id: t.assignee_id, verifier_id: t.verifier_id,
            segment_count: t.segment_count, comment_count: t.comment_count,
            assignee_info: t.assignee, verifier_info: t.verifier,
          })));
          setApiOnline(true);
        }
      } catch {}
    };
    load();
  }, []);

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    onReview: tasks.filter(t => t.status === 'On Review').length,
    completed: tasks.filter(t => t.status === 'Completed' || t.status === 'Accepted' || t.status === 'Exported').length,
    totalMinutes: tasks.reduce((s, t) => s + t.duration, 0),
  };

  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (apiOnline) { try { await api.updateTask(taskId, { status: newStatus }); } catch {} }
  };

  return (
    <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${bg}`}>
      <header className={`flex justify-between items-center mb-4 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className="text-xl font-black tracking-tight text-purple-500">Панель Супервайзера</h1>
          <p className="text-xs opacity-50">Контроль проекта, распределение задач, аналитика {apiOnline && <span className="text-emerald-400">● online</span>}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onToggleTheme} className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</button>
          <button onClick={onLogout} className="bg-red-600/20 text-red-500 border border-red-500/30 text-xs px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">Выйти</button>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-3 mb-4 shrink-0">
        {[
          { label: 'Всего задач', value: stats.total, color: 'text-gray-400' },
          { label: 'В работе', value: stats.inProgress, color: 'text-indigo-400' },
          { label: 'На проверке', value: stats.onReview, color: 'text-amber-400' },
          { label: 'Завершено', value: stats.completed, color: 'text-emerald-400' },
          { label: 'Минут аудио', value: stats.totalMinutes, color: 'text-sky-400' },
        ].map((s, i) => (
          <div key={i} className={`border rounded-xl p-3 text-center transition-all ${card}`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] opacity-50 uppercase mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className={`flex-1 border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h3 className="text-sm font-bold text-purple-500">Задачи</h3>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`text-xs border rounded px-2 py-1 focus:outline-none ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.map(t => (
              <div key={t.id} onClick={() => setSelectedTask(t)}
                className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center transition-all ${selectedTask?.id === t.id ? (darkMode ? 'border-purple-500 bg-purple-500/10' : 'border-purple-600 bg-purple-50') : (darkMode ? 'bg-black/40 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300')}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{t.project}</span>
                    <span className="text-[10px] opacity-40">{t.file}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] opacity-50">{t.assignee}</span>
                    <span className="text-[10px] opacity-50">| {t.duration > 0 ? `${t.duration} мин` : `${t.segment_count || 0} сегм`}</span>
                    <span className="text-[10px] opacity-50">| до {t.deadline}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${STATUS_COLORS[t.status] || ''}`}>{STATUS_NAMES[t.status] || t.status}</span>
                  <select value={t.status} onClick={e => e.stopPropagation()} onChange={e => handleStatusChange(t.id, e.target.value)} className={`text-[10px] border rounded px-1 py-0.5 focus:outline-none ${darkMode ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-300'}`}>
                    {Object.keys(STATUS_NAMES).map(s => <option key={s} value={s}>{STATUS_NAMES[s]}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`w-80 border rounded-2xl p-4 flex flex-col transition-all ${card}`}>
          {selectedTask ? (
            <>
              <h3 className="text-sm font-bold text-purple-500 mb-3">Детали задачи #{selectedTask.id}</h3>
              <div className="space-y-3 text-xs">
                <div><span className="opacity-50">Проект:</span> <span className="font-bold">{selectedTask.project}</span></div>
                <div><span className="opacity-50">Файл:</span> <span className="font-mono">{selectedTask.file}</span></div>
                <div><span className="opacity-50">Исполнитель:</span> <span>{selectedTask.assignee}</span></div>
                <div><span className="opacity-50">Статус:</span> <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[selectedTask.status]}`}>{STATUS_NAMES[selectedTask.status]}</span></div>
                <div><span className="opacity-50">Дедлайн:</span> <span>{selectedTask.deadline}</span></div>
                <div className={`border-t pt-3 mt-3 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <h4 className="font-bold text-xs mb-2">Качество</h4>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>Возвратов:</span><span className="text-red-400">2</span></div>
                    <div className="flex justify-between"><span>Замечаний:</span><span className="text-amber-400">5</span></div>
                    <div className="flex justify-between"><span>Исправлено сегментов:</span><span className="text-indigo-400">12</span></div>
                    <div className="flex justify-between"><span>Скорость:</span><span className="text-emerald-400">3.2x</span></div>
                  </div>
                </div>
                <button onClick={() => alert('Задача перераспределена')} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-lg transition-colors mt-2">Перераспределить задачу</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs opacity-40">Выберите задачу слева</div>
          )}
        </div>
      </div>
    </div>
  );
}
