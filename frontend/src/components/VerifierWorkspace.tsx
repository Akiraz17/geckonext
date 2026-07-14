import React, { useState } from 'react';
import { Segment, Speaker, VerificationComment } from '../types';

interface Props {
  darkMode: boolean;
  segments: Segment[];
  activeSegmentId: number | null;
  speakers: Speaker[];
  projectStatus: string;
  currentUser: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  onSetActiveSegment: (id: number) => void;
  onApprove: () => void;
  onReject: (comment: string) => void;
}

export default function VerifierWorkspace({
  darkMode, segments, activeSegmentId, speakers, projectStatus, currentUser,
  onToggleTheme, onLogout, onSetActiveSegment, onApprove, onReject,
}: Props) {
  const [comments, setComments] = useState<VerificationComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    'audio_match': false,
    'boundaries': false,
    'no_missing': false,
    'terms': false,
    'text_rules': false,
    'crosstalk': false,
    'no_empty': false,
    'comments_processed': false,
  });

  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
  const inputBg = darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900';

  const activeSegment = segments.find(s => s.id === activeSegmentId);

  const addComment = () => {
    if (!newComment.trim() || !activeSegmentId) return;
    setComments(prev => [...prev, {
      id: Date.now(),
      segmentId: activeSegmentId,
      text: newComment.trim(),
      author: currentUser,
      timestamp: new Date().toLocaleTimeString(),
      resolved: false,
    }]);
    setNewComment('');
  };

  const segmentComments = comments.filter(c => c.segmentId === activeSegmentId);

  const allChecked = Object.values(checklist).every(Boolean);

  return (
    <div className={`h-screen w-screen flex flex-col p-3 overflow-hidden font-sans select-none transition-colors ${bg}`}>
      <header className={`flex justify-between items-center p-3 mb-2 border rounded-xl shrink-0 transition-all ${card}`}>
        <div className="flex items-center space-x-4">
          <h1 className="text-base font-bold tracking-tight text-emerald-500">Верификация разметки</h1>
          <div className="text-xs opacity-60">Верификатор: <span className="font-bold text-indigo-500">{currentUser}</span></div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${projectStatus === 'REVIEW' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {projectStatus === 'REVIEW' ? 'На проверке' : 'Завершена'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRejectModal(true)}
            className="bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            Вернуть на доработку
          </button>
          <button
            onClick={onApprove}
            disabled={!allChecked}
            className={`font-bold text-xs px-4 py-1.5 rounded-lg transition-all ${allChecked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-600/30 text-gray-500 cursor-not-allowed'}`}
          >
            Принять разметку
          </button>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">Выйти</button>
          <button onClick={onToggleTheme} className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}>{darkMode ? 'Светлая' : 'Тёмная'}</button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 gap-2">
        <div className="flex-1 flex flex-col min-h-0">
          <div className={`border rounded-xl p-3 flex flex-col min-h-0 transition-all ${card}`}>
            <h3 className="text-[11px] uppercase font-bold opacity-50 mb-2 tracking-wider">Сегменты ({segments.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {segments.map(s => {
                const isSelected = activeSegmentId === s.id;
                const spk = speakers.find(sp => sp.id === s.speaker);
                const segmentCommentCount = comments.filter(c => c.segmentId === s.id).length;
                return (
                  <div
                    key={s.id}
                    onClick={() => onSetActiveSegment(s.id)}
                    className={`p-2 rounded-xl border cursor-pointer flex justify-between font-sans transition-all ${
                      isSelected
                        ? (darkMode ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-600 bg-emerald-50/70')
                        : (darkMode ? 'border-gray-800 bg-black/40 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100/80')
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex justify-between items-center text-[10px] font-mono mb-0.5">
                        <span className="text-emerald-500 font-bold">{s.start_time.toFixed(2)}–{s.end_time.toFixed(2)}s</span>
                        <span className="font-bold" style={{ color: spk ? `rgb(${spk.color})` : undefined }}>{spk?.name || s.speaker}</span>
                      </div>
                      <p className="text-xs truncate">{s.text || <span className="opacity-40 italic">Без текста</span>}</p>
                      {segmentCommentCount > 0 && (
                        <span className="text-[9px] text-amber-400 mt-0.5 inline-block">{segmentCommentCount} зам.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-80 flex flex-col gap-2 min-h-0">
          <div className={`flex-1 border rounded-xl p-3 flex flex-col min-h-0 transition-all ${card}`}>
            {activeSegment ? (
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <div className="shrink-0">
                  <span className="text-[10px] font-bold opacity-50">Сегмент #{activeSegment.id}</span>
                  <p className="text-xs mt-1 p-2 rounded border font-mono whitespace-pre-wrap max-h-24 overflow-y-auto"
                    style={{ backgroundColor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)' }}>
                    {activeSegment.text}
                  </p>
                  <div className="text-[10px] opacity-50 mt-1">
                    {activeSegment.start_time.toFixed(2)} – {activeSegment.end_time.toFixed(2)}s
                    {activeSegment.is_crosstalk && ' | Кроссток'}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-[10px] font-bold opacity-50 mb-1">Замечания ({segmentComments.length})</h4>
                  <div className="flex-1 overflow-y-auto space-y-1 mb-2">
                    {segmentComments.map(c => (
                      <div key={c.id} className={`text-xs p-1.5 rounded border ${c.resolved ? 'opacity-50 line-through' : ''} ${darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="text-[10px] opacity-50">{c.author} | {c.timestamp}</div>
                        <div>{c.text}</div>
                      </div>
                    ))}
                    {segmentComments.length === 0 && (
                      <div className="text-[10px] opacity-30 text-center py-2">Нет замечаний</div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment()}
                      placeholder="Добавить замечание..."
                      className={`flex-1 border rounded px-2 py-1 text-[11px] focus:outline-none ${inputBg}`}
                    />
                    <button onClick={addComment} className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] px-2 py-1 rounded">+</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs opacity-40">Выберите сегмент для проверки</div>
            )}
          </div>

          <div className={`border rounded-xl p-3 transition-all shrink-0 ${card}`}>
            <h4 className="text-[10px] font-bold opacity-50 mb-1.5">Чек-лист верификатора</h4>
            <div className="space-y-1">
              {[
                { key: 'audio_match', label: 'Текст соответствует аудио' },
                { key: 'boundaries', label: 'Границы корректны' },
                { key: 'no_missing', label: 'Нет пропущенной речи' },
                { key: 'terms', label: 'Термины проверены' },
                { key: 'text_rules', label: 'Правила текста соблюдены' },
                { key: 'crosstalk', label: 'Кросстолки обработаны' },
                { key: 'no_empty', label: 'Нет пустых сегментов' },
                { key: 'comments_processed', label: 'Замечания обработаны' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer text-[10px]">
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className="accent-emerald-500"
                  />
                  <span className={checklist[item.key] ? '' : 'opacity-60'}>{item.label}</span>
                </label>
              ))}
            </div>
            {!allChecked && (
              <p className="text-[9px] text-red-400 mt-2">Заполните чек-лист для принятия</p>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className={`p-5 rounded-xl max-w-sm w-full border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h3 className="text-sm font-bold text-red-500 mb-3">Причина возврата на доработку</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Опишите, что нужно исправить..."
              className={`w-full border rounded p-2 text-xs h-24 resize-none focus:outline-none ${inputBg}`}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { onReject(rejectReason); setShowRejectModal(false); }}
                disabled={!rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                Вернуть
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
