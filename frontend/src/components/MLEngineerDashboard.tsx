import React, { useState } from 'react';

interface MockExport {
  id: number;
  project: string;
  version: string;
  format: string;
  segments: number;
  size: string;
  created: string;
}

const MOCK_EXPORTS: MockExport[] = [
  { id: 1, project: 'Project Alpha', version: 'v3.2', format: 'Gecko JSON', segments: 452, size: '2.4 MB', created: '2026-07-12' },
  { id: 2, project: 'Project Alpha', version: 'v3.1', format: 'Gecko JSON', segments: 450, size: '2.3 MB', created: '2026-07-10' },
  { id: 3, project: 'Project Beta', version: 'v1.0', format: 'ML JSONL', segments: 1200, size: '5.1 MB', created: '2026-07-11' },
  { id: 4, project: 'Project Beta', version: 'v0.9', format: 'ML JSONL', segments: 1180, size: '4.9 MB', created: '2026-07-09' },
];

const ERROR_STATS = {
  cer: '4.2%',
  wer: '8.7%',
  substitutions: 312,
  deletions: 89,
  insertions: 45,
  totalWords: 24500,
};

interface Props {
  darkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function MLEngineerDashboard({ darkMode, onToggleTheme, onLogout }: Props) {
  const [exports] = useState<MockExport[]>(MOCK_EXPORTS);

  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  return (
    <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${bg}`}>
      <header className={`flex justify-between items-center mb-4 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className="text-xl font-black tracking-tight text-sky-500">Панель ML-инженера</h1>
          <p className="text-xs opacity-50">Выгрузки данных, версии, статистика ошибок ASR</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onToggleTheme} className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</button>
          <button onClick={onLogout} className="bg-red-600/20 text-red-500 border border-red-500/30 text-xs px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">Выйти</button>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-3 mb-4 shrink-0">
        {[
          { label: 'Word Error Rate', value: ERROR_STATS.wer, color: 'text-red-400' },
          { label: 'Char Error Rate', value: ERROR_STATS.cer, color: 'text-amber-400' },
          { label: 'Замен', value: ERROR_STATS.substitutions, color: 'text-purple-400' },
          { label: 'Пропусков', value: ERROR_STATS.deletions, color: 'text-sky-400' },
          { label: 'Вставок', value: ERROR_STATS.insertions, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className={`border rounded-xl p-3 text-center transition-all ${card}`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] opacity-50 uppercase mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className={`border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
          <h3 className="text-sm font-bold text-sky-500 mb-3">Версии выгрузок</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {exports.map(e => (
              <div key={e.id} className={`p-3 border rounded-xl flex justify-between items-center transition-all ${darkMode ? 'bg-black/40 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{e.project}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700'}`}>{e.version}</span>
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">{e.format} | {e.segments} сегментов | {e.size}</div>
                  <div className="text-[10px] opacity-30">Создана: {e.created}</div>
                </div>
                <button
                  onClick={() => alert(`Скачивание ${e.project} ${e.version}...`)}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Скачать
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
          <h3 className="text-sm font-bold text-sky-500 mb-3">Статистика ошибок по проектам</h3>
          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className="text-xs font-bold mb-2">Project Alpha</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="opacity-50">WER:</span><span className="text-red-400 font-mono">9.1%</span></div>
                <div className="flex justify-between"><span className="opacity-50">CER:</span><span className="text-amber-400 font-mono">4.5%</span></div>
                <div className="w-full bg-gray-700/30 h-1.5 rounded mt-1 overflow-hidden">
                  <div className="bg-red-500 h-full rounded" style={{ width: '9.1%' }} />
                </div>
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className="text-xs font-bold mb-2">Project Beta</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="opacity-50">WER:</span><span className="text-red-400 font-mono">8.3%</span></div>
                <div className="flex justify-between"><span className="opacity-50">CER:</span><span className="text-amber-400 font-mono">3.9%</span></div>
                <div className="w-full bg-gray-700/30 h-1.5 rounded mt-1 overflow-hidden">
                  <div className="bg-red-500 h-full rounded" style={{ width: '8.3%' }} />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className="text-xs font-bold mb-2">Запрос новой выгрузки</h4>
              <select className={`w-full border rounded px-2 py-1.5 text-xs mb-2 focus:outline-none ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300'}`}>
                <option>Project Alpha</option>
                <option>Project Beta</option>
              </select>
              <select className={`w-full border rounded px-2 py-1.5 text-xs mb-2 focus:outline-none ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300'}`}>
                <option>Gecko JSON (разметка)</option>
                <option>JSONL (ML-обучение)</option>
                <option>CSV (аналитика)</option>
              </select>
              <button className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                Сформировать выгрузку
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
