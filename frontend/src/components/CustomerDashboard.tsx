import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Props { darkMode: boolean; onToggleTheme: () => void; onLogout: () => void; }

export default function CustomerDashboard({ darkMode, onToggleTheme, onLogout }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<Map<number, any>>(new Map());
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, u] = await Promise.all([api.listProjects(), api.getUserAnalytics()]);
        setProjects(p); setUsers(u);
        const amap = new Map<number, any>();
        await Promise.all(p.map(async (pr: any) => { try { amap.set(pr.id, await api.getProjectAnalytics(pr.id)); } catch {} }));
        setAnalytics(amap);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  return (
    <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${bg}`}>
      <header className={`flex justify-between items-center mb-4 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className="text-xl font-black tracking-tight text-emerald-500">Панель Заказчика</h1>
          <p className="text-xs opacity-50">Статус проектов, отчёты, приёмка результатов</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onToggleTheme} className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</button>
          <button onClick={onLogout} className="bg-red-600/20 text-red-500 border border-red-500/30 text-xs px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">Выйти</button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm opacity-50">Загрузка...</div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          <div className={`border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
            <h3 className="text-sm font-bold text-emerald-500 mb-3">Проекты</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {projects.length === 0 ? (
                <div className="text-xs opacity-50 space-y-1">
                  <p>Проектов пока нет.</p>
                  <p className="opacity-40">Проект создаётся при первой отправке разметки на проверку, либо через <code className="bg-gray-800 px-1 rounded">POST /projects</code> в API.</p>
                  <p className="opacity-40">После разметки и верификации здесь появится статистика.</p>
                </div>
              ) : (
                projects.map(p => {
                  const pa = analytics.get(p.id);
                  return (
                    <div key={p.id} className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-bold">{p.name}</h4>
                          {p.description && <p className="text-[10px] opacity-50">{p.description}</p>}
                          {p.deadline && <p className="text-[10px] opacity-50">Дедлайн: {p.deadline.slice(0, 10)}</p>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{p.status}</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5"><span className="opacity-50">Прогресс</span><span className="font-mono">{pa?.completion_pct || 0}%</span></div>
                          <div className="w-full bg-gray-700/30 h-1.5 rounded overflow-hidden"><div className="bg-emerald-500 h-full rounded" style={{ width: `${pa?.completion_pct || 0}%` }} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className={`p-2 rounded text-center ${darkMode ? 'bg-black/30' : 'bg-white'}`}>
                            <div className="text-lg font-black text-indigo-400">{pa?.completed_tasks || 0}/{pa?.total_tasks || 0}</div>
                            <div className="text-[9px] opacity-50">Задач</div>
                          </div>
                          <div className={`p-2 rounded text-center ${darkMode ? 'bg-black/30' : 'bg-white'}`}>
                            <div className="text-lg font-black text-sky-400">{pa?.total_segments || 0}</div>
                            <div className="text-[9px] opacity-50">Сегментов</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
            <h3 className="text-sm font-bold text-emerald-500 mb-3">Исполнители</h3>
            <div className="flex-1 overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-xs opacity-50 space-y-1">
                  <p>Данных об исполнителях пока нет.</p>
                  <p className="opacity-40">Статистика заполняется при отправке разметки на проверку из редактора — система сама назначает разметчиков и верификаторов.</p>
                </div>
              ) : (
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <table className="w-full text-xs">
                    <thead><tr className="opacity-50 text-left"><th className="pb-2 font-normal">Разметчик</th><th className="pb-2 font-normal text-right">Задач</th><th className="pb-2 font-normal text-right">Завершено</th><th className="pb-2 font-normal text-right">Сегментов</th></tr></thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={i} className={darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'}>
                          <td className="py-2">{u.full_name}</td>
                          <td className="py-2 text-right font-mono">{u.assigned_tasks}</td>
                          <td className="py-2 text-right font-mono">{u.completed_tasks}</td>
                          <td className="py-2 text-right font-mono">{u.total_segments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
