import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';

interface Term {
  id: number;
  value: string;
  normalized_value: string;
  type: string;
  status: string;
  comment: string;
  category?: string;
}

const DEFAULT_TERMS: Term[] = [
  { id: 1, value: 'TATLIN', normalized_value: 'TATLIN', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 2, value: 'VEGMAN', normalized_value: 'VEGMAN', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 3, value: 'UNIFIED', normalized_value: 'UNIFIED', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 4, value: 'BACKUP', normalized_value: 'BACKUP', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 5, value: 'FLEX', normalized_value: 'FLEX', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 6, value: 'ARCHIVE', normalized_value: 'ARCHIVE', type: 'product', status: 'confirmed', comment: '', category: 'YADRO' },
  { id: 7, value: 'CI/CD', normalized_value: 'CI/CD', type: 'abbreviation', status: 'confirmed', comment: '', category: 'DevOps' },
  { id: 8, value: "API'шный", normalized_value: 'API-шный', type: 'anglicism', status: 'new', comment: 'Русифицированный англицизм', category: 'IT' },
  { id: 9, value: "IP'шник", normalized_value: 'IP-шник', type: 'anglicism', status: 'new', comment: '', category: 'IT' },
  { id: 10, value: "SSD'шник", normalized_value: 'SSD-шник', type: 'anglicism', status: 'new', comment: '', category: 'IT' },
  { id: 11, value: 'json', normalized_value: 'JSON', type: 'extension', status: 'confirmed', comment: '', category: 'Форматы' },
  { id: 12, value: 'csv', normalized_value: 'CSV', type: 'extension', status: 'confirmed', comment: '', category: 'Форматы' },
  { id: 13, value: 'asn1', normalized_value: 'ASN.1', type: 'extension', status: 'on_review', comment: 'Проверить написание', category: 'Форматы' },
  { id: 14, value: 'ASR', normalized_value: 'ASR', type: 'abbreviation', status: 'confirmed', comment: '', category: 'ML' },
  { id: 15, value: 'NLP', normalized_value: 'NLP', type: 'abbreviation', status: 'confirmed', comment: '', category: 'ML' },
];

const STATUS_LABELS: Record<string, string> = { new: 'Новый', on_review: 'На проверке', confirmed: 'Подтверждён', rejected: 'Отклонён' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-blue-500/20 text-blue-400', on_review: 'bg-amber-500/20 text-amber-400', confirmed: 'bg-emerald-500/20 text-emerald-400', rejected: 'bg-red-500/20 text-red-400' };

interface Props {
  darkMode: boolean;
  onClose: () => void;
  projectId?: number;
}

export default function TerminologyModule({ darkMode, onClose, projectId = 1 }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newTermValue, setNewTermValue] = useState('');
  const [newTermNormalized, setNewTermNormalized] = useState('');
  const [newTermComment, setNewTermComment] = useState('');
  const [checkWord, setCheckWord] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const serverTerms = await api.getTerms(projectId);
        if (serverTerms.length > 0) {
          setTerms(serverTerms.map((t: any) => ({ ...t, normalized_value: t.normalized_value || t.value })));
        } else {
          setTerms(DEFAULT_TERMS);
        }
      } catch {
        const saved = localStorage.getItem('gecko_terms');
        setTerms(saved ? JSON.parse(saved) : DEFAULT_TERMS);
      } finally { setLoading(false); }
    })();
  }, [projectId]);

  const filtered = useMemo(() => terms.filter(t => {
    if (search && !t.value.toLowerCase().includes(search.toLowerCase()) && !(t.normalized_value || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  }), [terms, search, filterStatus, filterCategory]);

  const categories = [...new Set(terms.map(t => t.category || t.type).filter(Boolean))];

  const addTerm = async () => {
    if (!newTermValue.trim()) return;
    const v = newTermValue.trim();
    try {
      const created = await api.createTerm(projectId, {
        value: v,
        normalized_value: newTermNormalized.trim() || v,
        type: 'general',
        category: 'Общее',
        comment: newTermComment.trim(),
      });
      setTerms(prev => [...prev, { ...created, normalized_value: created.normalized_value || v, category: created.category || 'Общее' }]);
    } catch {
      const nid = Math.max(0, ...terms.map(t => t.id)) + 1;
      const fallback: Term = { id: nid, value: v, normalized_value: newTermNormalized.trim() || v, type: 'general', status: 'new', comment: newTermComment.trim(), category: 'Общее' };
      setTerms(prev => [...prev, fallback]);
    }
    setNewTermValue(''); setNewTermNormalized(''); setNewTermComment('');
  };

  const changeStatus = async (termId: number, newStatus: string) => {
    setTerms(prev => prev.map(t => t.id === termId ? { ...t, status: newStatus } : t));
    try { await api.updateTerm(termId, { status: newStatus }); } catch {}
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
            <p className="text-[10px] opacity-50">{terms.length} терминов {loading && '(загрузка...)'}</p>
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
              const csv = ['value,normalized_value,type,status,category,comment', ...terms.map(t => `"${t.value}","${t.normalized_value || t.value}","${t.type}","${t.status}","${t.category || ''}","${t.comment || ''}"`)].join('\n');
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
                const normalized = t.normalized_value || t.value;
                return (
                  <tr key={t.id} className="border-t" style={{ borderColor: darkMode ? '#1f2937' : '#e5e7eb' }}>
                    <td className="py-1.5 pr-2 font-mono font-bold">{t.value}</td>
                    <td className="py-1.5 pr-2 font-mono text-[10px] opacity-70">{normalized}</td>
                    <td className="py-1.5 pr-2 text-[10px] opacity-60">{t.type}</td>
                    <td className="py-1.5 pr-2 text-[10px] opacity-60">{t.category || t.type}</td>
                    <td className="py-1.5 pr-2">
                      <select value={t.status} onChange={e => changeStatus(t.id, e.target.value)} className={`text-[9px] border rounded px-1 py-0.5 font-bold ${STATUS_COLORS[t.status] || ''} ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
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
