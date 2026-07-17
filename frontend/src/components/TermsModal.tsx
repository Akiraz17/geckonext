import React, { useState, useRef } from 'react';
import { api } from '../api/client';

interface Props {
  darkMode: boolean;
  cardStyle: string;
  inputStyle: string;
  onClose: () => void;
  currentTaskId: number | null;
}

interface TermEntry {
  value: string;
  normalized: string;
  status: 'new' | 'disputed' | 'confirmed';
  comment: string;
}

export default function TermsModal({ darkMode, cardStyle, inputStyle, onClose, currentTaskId }: Props) {
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'disputed' | 'confirmed'>('all');

  // Manual entry state
  const [manualValue, setManualValue] = useState('');
  const [manualNormalized, setManualNormalized] = useState('');

  // Gramota search
  const [gramotaQuery, setGramotaQuery] = useState('');

  const openGramota = (word: string) => {
    window.open(`https://gramota.ru/poisk?query=${encodeURIComponent(word)}&mode=word`, '_blank', 'noopener');
  };

  const addManual = () => {
    const v = manualValue.trim();
    const n = manualNormalized.trim() || v;
    if (!v) { setMessage('Введите термин'); return; }
    if (terms.some(t => t.value.toLowerCase() === v.toLowerCase())) { setMessage('Термин уже добавлен'); return; }
    setTerms(prev => [...prev, { value: v, normalized: n, status: 'new', comment: '' }]);
    setManualValue('');
    setManualNormalized('');
    setMessage(`Добавлено: ${v}${n !== v ? ' → ' + n : ''}`);
  };

  const removeTerm = (idx: number) => {
    setTerms(prev => prev.filter((_, i) => i !== idx));
  };

  const setTermStatus = (idx: number, status: 'disputed' | 'confirmed') => {
    setTerms(prev => prev.map((t, i) => i === idx ? { ...t, status } : t));
  };

  const setTermComment = (idx: number, comment: string) => {
    setTerms(prev => prev.map((t, i) => i === idx ? { ...t, comment } : t));
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const parsed = lines.map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      return {
        value: parts[0] || '',
        normalized: parts[1] || parts[0] || '',
        status: 'new' as const,
        comment: parts[2] || '',
      };
    }).filter(t => t.value && !terms.some(ex => ex.value.toLowerCase() === t.value.toLowerCase()));
    if (parsed.length === 0) {
      setMessage('Новых терминов в файле не найдено. Формат: термин,нормализация,комментарий');
      return;
    }
    setTerms(prev => [...prev, ...parsed]);
    setMessage(`Добавлено ${parsed.length} терминов из файла`);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) parseCSV(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sendToServer = async () => {
    if (terms.length === 0) {
      setMessage('Нет терминов для отправки');
      return;
    }
    if (!currentTaskId) {
      setMessage('Сначала создайте задачу');
      return;
    }
    setSending(true);
    try {
      const pid = await api.getTask(currentTaskId).then((t: any) => t.project_id).catch(() => null);
      if (pid) {
        await api.importTerms(pid, terms.map(t => ({ value: t.value, normalized_value: t.normalized, comment: t.comment || undefined })));
      }
      setDone(true);
      setMessage(`Отправлено ${terms.length} терминов`);
    } catch {
      setMessage('Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const handleGramotaSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (gramotaQuery.trim()) {
      openGramota(gramotaQuery.trim());
    }
  };

  const exportCSV = () => {
    const header = 'Термин,Нормализация,Статус,Комментарий';
    const rows = terms.map(t => `"${t.value}","${t.normalized}","${t.status}","${t.comment}"`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `terms_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const filteredTerms = terms.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery && !t.value.toLowerCase().includes(searchQuery.toLowerCase()) && !t.normalized.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className={`p-5 rounded-xl border ${cardStyle} max-w-lg w-full`} onClick={e => e.stopPropagation()}>
          <h3 className="text-sm font-bold mb-3">Термины проекта</h3>
          <p className="text-xs text-emerald-400 mb-4">{message}</p>
          <button onClick={onClose} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg">Готово</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`p-5 rounded-xl border ${cardStyle} max-w-lg w-full max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h3 className="text-sm font-bold">Термины проекта</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
        </div>

        {/* Gramota search */}
        <form onSubmit={handleGramotaSearch} className="mb-3 shrink-0">
          <label className="text-[10px] uppercase font-bold block mb-1 opacity-50">Поиск на Gramota.ru</label>
          <div className="flex gap-2">
            <input type="text" value={gramotaQuery} onChange={e => setGramotaQuery(e.target.value)} placeholder="Введите слово..." className={`flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none ${inputStyle}`} />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0">Поиск</button>
          </div>
        </form>

        {/* Manual add */}
        <div className="mb-3 shrink-0">
          <label className="text-[10px] uppercase font-bold block mb-1 opacity-50">Добавить вручную</label>
          <div className="flex gap-2">
            <input type="text" value={manualValue} onChange={e => setManualValue(e.target.value)} placeholder="Термин" className={`flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none ${inputStyle}`} />
            <input type="text" value={manualNormalized} onChange={e => setManualNormalized(e.target.value)} placeholder="Нормализация" className={`flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none ${inputStyle}`} />
            <button onClick={addManual} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0">+</button>
          </div>
        </div>

        {/* CSV import */}
        <div className="mb-3 shrink-0">
          <label className="text-[10px] uppercase font-bold block mb-1 opacity-50">Импорт из CSV/TXT</label>
          <p className="text-[10px] opacity-40 mb-1">Формат: <code className="bg-gray-800 px-1 rounded">термин,нормализация,комментарий</code></p>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputStyle}`} />
        </div>

        {/* Search + filter */}
        {terms.length > 0 && (
          <div className="flex gap-2 mb-2 shrink-0">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className={`flex-1 border rounded px-2 py-1 text-[10px] focus:outline-none ${inputStyle}`} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={`border rounded px-2 py-1 text-[10px] focus:outline-none ${inputStyle}`}>
              <option value="all">Все</option>
              <option value="new">Новые</option>
              <option value="disputed">Спорные</option>
              <option value="confirmed">Подтверждены</option>
            </select>
          </div>
        )}

        {/* Message */}
        {message && <p className={`text-[10px] mb-2 shrink-0 ${message.includes('Ошибка') ? 'text-red-400' : 'text-amber-400'}`}>{message}</p>}

        {/* Terms list */}
        {terms.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1 mb-3 pr-1 min-h-0">
            {filteredTerms.map((t, i) => (
              <div key={i} className={`flex flex-col text-[11px] p-2 rounded border ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 break-words">
                    <span className="font-bold">{t.value}</span>
                    {t.normalized !== t.value && <span className="opacity-50 ml-1">→ {t.normalized}</span>}
                    <span className={`ml-2 text-[9px] px-1 py-0.5 rounded font-bold ${
                      t.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {t.status === 'confirmed' ? '✓' : t.status === 'disputed' ? '! Спорный' : 'Новый'}
                    </span>
                  </div>
                  <button onClick={() => openGramota(t.value)} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/40 shrink-0" title="Проверить на Gramota.ru">Gramota</button>
                  <button onClick={() => removeTerm(i)} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/40 shrink-0">✕</button>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => setTermStatus(i, 'disputed')} className={`text-[9px] px-1.5 py-0.5 rounded ${t.status === 'disputed' ? 'bg-red-500/30 text-red-300' : 'bg-gray-500/20 text-gray-400 hover:bg-red-500/20 hover:text-red-400'}`}>Спорный</button>
                  <button onClick={() => setTermStatus(i, 'confirmed')} className={`text-[9px] px-1.5 py-0.5 rounded ${t.status === 'confirmed' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-gray-500/20 text-gray-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`}>Подтверждён</button>
                  <input value={t.comment} onChange={e => setTermComment(i, e.target.value)} placeholder="Комментарий" className={`flex-1 border rounded px-1.5 py-0.5 text-[9px] focus:outline-none ${inputStyle}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 shrink-0">
          <button onClick={sendToServer} disabled={sending || terms.length === 0} className={`flex-1 text-xs font-bold py-2 rounded-lg ${sending || terms.length === 0 ? 'bg-gray-600/50 cursor-not-allowed text-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            {sending ? 'Отправка...' : `Отправить на сервер (${terms.length})`}
          </button>
          {terms.length > 0 && <button onClick={exportCSV} className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-2 rounded-lg">CSV</button>}
          <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-2 rounded-lg">Закрыть</button>
        </div>
      </div>
    </div>
  );
}