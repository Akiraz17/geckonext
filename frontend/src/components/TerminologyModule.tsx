import React, { useState, useMemo } from 'react';

interface Term {
  id: number;
  value: string;
  normalizedValue: string;
  type: string;
  status: 'new' | 'on_review' | 'confirmed' | 'rejected';
  comment: string;
  category: string;
}

const DEFAULT_TERMS: Term[] = [
  { id: 1, value: 'TATLIN', normalizedValue: 'TATLIN', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 2, value: 'VEGMAN', normalizedValue: 'VEGMAN', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 3, value: 'UNIFIED', normalizedValue: 'UNIFIED', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 4, value: 'BACKUP', normalizedValue: 'BACKUP', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 5, value: 'FLEX', normalizedValue: 'FLEX', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 6, value: 'ARCHIVE', normalizedValue: 'ARCHIVE', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 7, value: 'CI/CD', normalizedValue: 'CI/CD', type: 'abbreviation', status: 'confirmed', comment: '', category: 'DevOps' },
  { id: 8, value: "API'шный", normalizedValue: 'API-шный', type: 'anglicism', status: 'new', comment: 'Русифицированный англицизм', category: 'IT' },
  { id: 9, value: "IP'шник", normalizedValue: 'IP-шник', type: 'anglicism', status: 'new', comment: '', category: 'IT' },
  { id: 10, value: "SSD'шник", normalizedValue: 'SSD-шник', type: 'anglicism', status: 'new', comment: '', category: 'IT' },
  { id: 11, value: 'json', normalizedValue: 'JSON', type: 'extension', status: 'confirmed', comment: '', category: 'Форматы' },
  { id: 12, value: 'csv', normalizedValue: 'CSV', type: 'extension', status: 'confirmed', comment: '', category: 'Форматы' },
  { id: 13, value: 'asn1', normalizedValue: 'ASN.1', type: 'extension', status: 'on_review', comment: 'Проверить написание', category: 'Форматы' },
  { id: 14, value: 'ASR', normalizedValue: 'ASR', type: 'abbreviation', status: 'confirmed', comment: '', category: 'ML' },
  { id: 15, value: 'NLP', normalizedValue: 'NLP', type: 'abbreviation', status: 'confirmed', comment: '', category: 'ML' },
];

const STATUS_LABELS: Record<string, string> = { new: 'Новый', on_review: 'На проверке', confirmed: 'Подтверждён', rejected: 'Отклонён' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-blue-500/20 text-blue-400', on_review: 'bg-amber-500/20 text-amber-400', confirmed: 'bg-emerald-500/20 text-emerald-400', rejected: 'bg-red-500/20 text-red-400' };

interface Props {
  darkMode: boolean;
  onClose: () => void;
}

export default function TerminologyModule({ darkMode, onClose }: Props) {
  const [terms, setTerms] = useState<Term[]>(() => {
    const saved = localStorage.getItem('gecko_terms');
    return saved ? JSON.parse(saved) : DEFAULT_TERMS;
  });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newTermValue, setNewTermValue] = useState('');
  const [newTermNormalized, setNewTermNormalized] = useState('');
  const [newTermComment, setNewTermComment] = useState('');
  const [checkWord, setCheckWord] = useState('');

  const persistTerms = (t: Term[]) => { setTerms(t); localStorage.setItem('gecko_terms', JSON.stringify(t)); };

  const filtered = useMemo(() => terms.filter(t => {
    if (search && !t.value.toLowerCase().includes(search.toLowerCase()) && !t.normalizedValue.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  }), [terms, search, filterStatus, filterCategory]);

  const categories = [...new Set(terms.map(t => t.category))];

  const addTerm = () => {
    if (!newTermValue.trim()) return;
    const nid = Math.max(0, ...terms.map(t => t.id)) + 1;
    const v = newTermValue.trim();
    const n = newTermNormalized.trim() || v;
    const isLatin = /^[a-zA-Z0-9'/\-]+$/.test(v);
    const isCyrillic = /^[а-яёА-ЯЁ0-9'/\-]+$/.test(v);
    persistTerms([...terms, { id: nid, value: v, normalizedValue: n, type: 'general', status: 'new', comment: newTermComment.trim(), category: 'Общее' }]);
    setNewTermValue(''); setNewTermNormalized(''); setNewTermComment('');
  };

  const checkOnGramota = (word: string) => {
    if (!word.trim()) return;
    window.open(`https://gramota.ru/poisk?query=${encodeURIComponent(word.trim())}`, '_blank');
  };

  const wordCheckResult = (word: string): { hasLatin: boolean; hasCyrillic: boolean; hasSpecial: boolean } => {
    if (!word) return { hasLatin: false, hasCyrillic: false, hasSpecial: false };
    return {
      hasLatin: /[a-zA-Z]/.test(word),
      hasCyrillic: /[а-яёА-ЯЁ]/.test(word),
      hasSpecial: /['/\-]/.test(word),
    };
  };

  const inputClass = `border rounded px-2 py-1 text-xs focus:outline-none ${darkMode ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col border ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}>
        <div className="flex justify-between items-center p-4 border-b shrink-0" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
          <div>
            <h2 className="text-sm font-bold">Терминологический модуль</h2>
            <p className="text-[10px] opacity-50">{terms.length} терминов</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className="p-3 border-b shrink-0 space-y-2" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
          <div className="flex flex-wrap gap-2">
            <input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} w-40`} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputClass}>
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={inputClass}>
              <option value="all">Все категории</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => {
              const csv = ['value,normalized_value,type,status,category,comment', ...terms.map(t => `"${t.value}","${t.normalizedValue}","${t.type}","${t.status}","${t.category}","${t.comment}"`)].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'terms_export.csv'; a.click();
            }} className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1 rounded-lg ml-auto transition-colors">CSV</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] opacity-50 whitespace-nowrap">Проверить на Грамота.ру:</span>
            <input placeholder="Слово для проверки..." value={checkWord} onChange={e => setCheckWord(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkOnGramota(checkWord)} className={`${inputClass} flex-1`} />
            <button onClick={() => checkOnGramota(checkWord)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors whitespace-nowrap">Проверить</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <table className="w-full text-xs">
            <thead><tr className="opacity-50 text-left"><th className="pb-2 pr-2 font-normal">Термин</th><th className="pb-2 pr-2 font-normal">Вариант</th><th className="pb-2 pr-2 font-normal">Тип</th><th className="pb-2 pr-2 font-normal">Категория</th><th className="pb-2 pr-2 font-normal">Статус</th><th className="pb-2 pr-2 font-normal">Проверка</th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const wc = wordCheckResult(t.value);
                return (
                  <tr key={t.id} className="border-t" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
                    <td className="py-1.5 pr-2 font-mono font-bold">{t.value}</td>
                    <td className="py-1.5 pr-2 font-mono text-[10px] opacity-70">{t.normalizedValue}</td>
                    <td className="py-1.5 pr-2 text-[10px] opacity-60">{t.type}</td>
                    <td className="py-1.5 pr-2 text-[10px] opacity-60">{t.category}</td>
                    <td className="py-1.5 pr-2">
                      <select value={t.status} onChange={e => { const s = e.target.value as Term['status']; persistTerms(terms.map(tt => tt.id === t.id ? { ...tt, status: s } : tt)); }} className={`text-[9px] border rounded px-1 py-0.5 font-bold ${STATUS_COLORS[t.status]} ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1">
                        {wc.hasLatin && <span className="text-[8px] px-1 rounded bg-blue-500/20 text-blue-400">EN</span>}
                        {wc.hasCyrillic && <span className="text-[8px] px-1 rounded bg-purple-500/20 text-purple-400">RU</span>}
                        {wc.hasSpecial && <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-400">спец</span>}
                        <button onClick={() => checkOnGramota(t.value)} className="text-[9px] text-emerald-400 hover:underline ml-1" title="Проверить на Грамота.ру">грамота</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t shrink-0 flex gap-2" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
          <input placeholder="Термин" value={newTermValue} onChange={e => setNewTermValue(e.target.value)} className={`${inputClass} flex-1`} />
          <input placeholder="Вариант написания" value={newTermNormalized} onChange={e => setNewTermNormalized(e.target.value)} className={`${inputClass} flex-1`} />
          <input placeholder="Комментарий" value={newTermComment} onChange={e => setNewTermComment(e.target.value)} className={`${inputClass} w-32`} />
          <button onClick={addTerm} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1 rounded-lg transition-colors">Добавить</button>
        </div>
      </div>
    </div>
  );
}
