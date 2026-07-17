import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import ThemeSelector from './ThemeSelector';
import { ThemeState } from '../themes';

interface Props { darkMode: boolean; theme: ThemeState; onToggleTheme: () => void; onChangeTheme: (color: string, isDark: boolean) => void; onLogout: () => void; onNavigate: (screen: string) => void; }

export default function MLEngineerDashboard({ darkMode, theme, onToggleTheme, onChangeTheme, onLogout, onNavigate }: Props) {
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadExports(); }, []);

  const loadExports = async () => {
    setLoading(true);
    try { setExports(await api.listExports()); } catch { setExports([]); }
    setLoading(false);
  };

  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  return (
    <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${bg}`}>
      <header className={`flex justify-between items-center mb-4 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className="text-xl font-black tracking-tight text-sky-500">Панель ML-инженера</h1>
          <p className="text-xs opacity-50">Выгрузки данных и экспорт для ML-обучения</p>
        </div>
        <div className="flex gap-2 items-center">
          <ThemeSelector theme={theme} onChangeTheme={onChangeTheme} />
          <button onClick={onLogout} className="bg-red-600/20 text-red-500 border border-red-500/30 text-xs px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">Выйти</button>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        <div className={`border rounded-2xl p-6 transition-all ${card}`}>
          <h3 className="text-sm font-bold text-sky-500 mb-3">Выгрузки данных</h3>
          <button onClick={loadExports} disabled={loading} className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-bold px-6 py-2 rounded-xl mb-3 transition-colors">
            {loading ? 'Загрузка...' : 'Обновить список выгрузок'}
          </button>
          {exports.length === 0 ? (
            <div className="text-xs opacity-50 space-y-1">
              <p>Выгрузок пока нет.</p>
              <p className="opacity-40">Чтобы создать выгрузку: в редакторе разметки нажмите <span className="text-sky-400 font-bold">«Экспорт JSON»</span>, или вызовите <code className="bg-gray-800 px-1 rounded">POST /tasks/{'{id}'}/export</code></p>
              <p className="opacity-40">Формат: Gecko JSON 2.0 — совместим с ML-пайплайнами.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exports.map((e: any) => (
                <div key={e.id} className={`p-3 border rounded-xl flex justify-between items-center ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <span className="text-xs font-bold">Выгрузка #{e.id}</span>
                    <span className="text-xs opacity-50 ml-2">Задача #{e.task_id}</span>
                    <span className="text-[10px] opacity-40 ml-2">{e.format}</span>
                    <div className="text-[10px] opacity-30">{e.created_at?.slice(0, 10) || ''}</div>
                  </div>
                  <button
                    onClick={async () => { try { const blob = await api.downloadExport(e.id); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `export_${e.id}.json`; a.click(); } catch { alert('Файл не найден'); } }}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >Скачать</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`border rounded-2xl p-6 transition-all ${card}`}>
          <h3 className="text-sm font-bold text-sky-500 mb-3">Аналитика качества</h3>
          <button onClick={async () => {
            try {
              const q = await api.getQualityAnalytics();
              alert(`Всего проверок: ${q.total_verifications}\nПринято: ${q.accepted} (${q.acceptance_rate}%)\nОтклонено: ${q.rejected}\nСредний балл: ${q.avg_score || '—'}\nОшибок: ${q.errors}\nПредупреждений: ${q.warnings}`);
            } catch { alert('Сервер недоступен'); }
          }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">Показать метрики качества</button>
          <p className="text-[10px] opacity-40 mt-2">Данные берутся из результатов верификации и авто-проверок.</p>
        </div>
      </div>
    </div>
  );
}
