import React, { useState } from 'react';
import { Segment } from '../types';
import { analyzeSegments } from './AIAssistant';

interface Props {
  darkMode: boolean;
  segments: Segment[];
  onSend: () => void;
  onCancel: () => void;
}

export default function CheckListModal({ darkMode, segments, onSend, onCancel }: Props) {
  const [checks, setChecks] = useState<Record<string, boolean>>({
    listened: false, allSegments: false, boundaries: false,
    cutWords: false, missingSpeech: false, badSegments: false,
    crosstalk: false, shortReplies: false, terms: false,
    disputedTerms: false, saved: true,
  });

  const autoIssues = analyzeSegments(segments);
  const critical = autoIssues.filter(h => h.type === 'error').length;
  const warnings = autoIssues.filter(h => h.type === 'warning').length;
  const allChecked = Object.values(checks).every(Boolean);

  const inputClass = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const inputBg = darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl max-w-md w-full border ${inputClass}`}>
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
          <h2 className="text-sm font-bold">Чек-лист перед отправкой</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-2">
          <div className="space-y-1">
            {[
              { k: 'listened', l: 'Запись прослушана до конца' },
              { k: 'allSegments', l: 'Все сегменты проверены' },
              { k: 'boundaries', l: 'Границы сегментов исправлены' },
              { k: 'cutWords', l: 'Обрезанные слова проверены' },
              { k: 'missingSpeech', l: 'Пропущенная речь добавлена' },
              { k: 'badSegments', l: 'Некорректная разметка удалена' },
              { k: 'crosstalk', l: 'Кросстолки обработаны' },
              { k: 'shortReplies', l: 'Значимые короткие реплики добавлены' },
              { k: 'terms', l: 'Термины проверены' },
              { k: 'disputedTerms', l: 'Спорные термины зафиксированы' },
            ].map(item => (
              <label key={item.k} className="flex items-center gap-2 cursor-pointer text-[11px] py-0.5">
                <input type="checkbox" checked={checks[item.k]} onChange={() => setChecks(prev => ({ ...prev, [item.k]: !prev[item.k] }))} className="accent-indigo-500" />
                <span className={checks[item.k] ? '' : 'opacity-60'}>{item.l}</span>
              </label>
            ))}
          </div>

          <div className={`rounded-lg p-2 text-[10px] border ${darkMode ? 'bg-black/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="font-bold mb-1">Автоматические проверки:</div>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span>Сегментов:</span>
                <span className="font-mono">{segments.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Критических ошибок:</span>
                <span className={`font-mono font-bold ${critical > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{critical}</span>
              </div>
              <div className="flex justify-between">
                <span>Предупреждений:</span>
                <span className={`font-mono ${warnings > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{warnings}</span>
              </div>
              <div className="flex justify-between">
                <span>Пустых сегментов:</span>
                <span className="font-mono text-red-400">{segments.filter(s => !s.text.trim()).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Пересечений:</span>
                <span className="font-mono text-red-400">{segments.filter((s, i) => i > 0 && segments[i-1].end_time > s.start_time).length}</span>
              </div>
            </div>
          </div>

          {!allChecked && <p className="text-[10px] text-amber-400">Заполните все пункты чек-листа</p>}
          {allChecked && critical > 0 && <p className="text-[10px] text-red-400">Есть критические ошибки — рекомендуем исправить перед отправкой</p>}
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
          <button onClick={onCancel} className={`flex-1 border rounded-lg text-xs font-bold py-2 ${darkMode ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Отмена</button>
          <button onClick={onSend} disabled={!allChecked} className={`flex-1 rounded-lg text-xs font-bold py-2 text-white ${allChecked ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90' : 'bg-gray-600/30 cursor-not-allowed'}`}>Отправить на проверку</button>
        </div>
      </div>
    </div>
  );
}
