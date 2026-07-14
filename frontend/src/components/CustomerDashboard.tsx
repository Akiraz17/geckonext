import React, { useState } from 'react';

interface MockReport {
  id: number;
  project: string;
  status: string;
  progress: number;
  deadline: string;
  filesTotal: number;
  filesDone: number;
  qualityScore: number;
}

const MOCK_REPORTS: MockReport[] = [
  { id: 1, project: 'Project Alpha', status: 'In Progress', progress: 67, deadline: '2026-07-20', filesTotal: 15, filesDone: 10, qualityScore: 92 },
  { id: 2, project: 'Project Beta', status: 'In Progress', progress: 34, deadline: '2026-07-25', filesTotal: 25, filesDone: 8, qualityScore: 88 },
];

interface Props {
  darkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function CustomerDashboard({ darkMode, onToggleTheme, onLogout }: Props) {
  const [reports] = useState<MockReport[]>(MOCK_REPORTS);

  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  return (
    <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${bg}`}>
      <header className={`flex justify-between items-center mb-4 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className="text-xl font-black tracking-tight text-emerald-500">Панель Заказчика</h1>
          <p className="text-xs opacity-50">Отчёты, статус проектов, итоговые данные</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onToggleTheme} className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</button>
          <button onClick={onLogout} className="bg-red-600/20 text-red-500 border border-red-500/30 text-xs px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">Выйти</button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className={`border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
          <h3 className="text-sm font-bold text-emerald-500 mb-3">Мои проекты</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {reports.map(r => (
              <div key={r.id} className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold">{r.project}</h4>
                    <p className="text-[10px] opacity-50">Дедлайн: {r.deadline}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    r.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>{r.status}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="opacity-50">Прогресс</span>
                      <span className="font-mono">{r.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700/30 h-1.5 rounded overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded transition-all" style={{ width: `${r.progress}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2 rounded text-center ${darkMode ? 'bg-black/30' : 'bg-white'}`}>
                      <div className="text-lg font-black text-indigo-400">{r.filesDone}/{r.filesTotal}</div>
                      <div className="text-[9px] opacity-50">Файлов</div>
                    </div>
                    <div className={`p-2 rounded text-center ${darkMode ? 'bg-black/30' : 'bg-white'}`}>
                      <div className="text-lg font-black text-emerald-400">{r.qualityScore}%</div>
                      <div className="text-[9px] opacity-50">Качество</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
          <h3 className="text-sm font-bold text-emerald-500 mb-3">Статистика по разметчикам</h3>
          <div className="flex-1 space-y-3 overflow-y-auto">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="opacity-50 text-left">
                    <th className="pb-2 font-normal">Разметчик</th>
                    <th className="pb-2 font-normal text-right">Файлов</th>
                    <th className="pb-2 font-normal text-right">Часов</th>
                    <th className="pb-2 font-normal text-right">Качество</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Иван Петров', files: 8, hours: 6.5, quality: 94 },
                    { name: 'Мария Семёнова', files: 5, hours: 3.2, quality: 89 },
                    { name: 'Пётр Волков', files: 12, hours: 9.1, quality: 91 },
                  ].map((r, i) => (
                    <tr key={i} className={darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'}>
                      <td className="py-2">{r.name}</td>
                      <td className="py-2 text-right font-mono">{r.files}</td>
                      <td className="py-2 text-right font-mono">{r.hours}</td>
                      <td className="py-2 text-right">
                        <span className={`font-mono font-bold ${r.quality >= 90 ? 'text-emerald-400' : r.quality >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{r.quality}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className="text-xs font-bold mb-2">Экспорт отчёта</h4>
              <p className="text-[10px] opacity-50 mb-2">Сформировать итоговый отчёт по всем проектам</p>
              <button
                onClick={() => alert('Отчёт формируется...')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                Скачать отчёт (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
