import React, { useMemo } from 'react';
import { Segment } from '../types';

export interface AIHint {
  segmentId: number;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  suggestion?: string;
}

interface Props {
  segments: Segment[];
  activeSegmentId: number | null;
  darkMode: boolean;
  onJumpToSegment: (id: number) => void;
  onApplySuggestion?: (segmentId: number, newText: string) => void;
}

const KNOWN_TERMS = [
  'TATLIN', 'VEGMAN', 'UNIFIED', 'BACKUP', 'FLEX', 'ARCHIVE',
  'json', 'csv', 'ini', 'asn1', 'CI/CD', 'API', 'IP', 'SSD',
  'ASR', 'NLP', 'ML', 'JSON', 'CSV', 'INI', 'ASN1', 'XML', 'YAML',
];

const SHORT_REPLIES = ['да', 'нет', 'угу', 'ага', 'мгм', 'ну', 'ох', 'ай', 'ой', 'эх'];

export function analyzeSegments(segments: Segment[]): AIHint[] {
  const hints: AIHint[] = [];

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const duration = s.end_time - s.start_time;
    const text = s.text.trim();

    if (!text) {
      hints.push({ segmentId: s.id, type: 'error', message: 'Сегмент без текста', suggestion: '' });
    }

    if (text && duration < 0.3 && SHORT_REPLIES.some(r => text.toLowerCase() === r)) {
      hints.push({
        segmentId: s.id, type: 'warning',
        message: `Короткая реплика "${text}" (${duration.toFixed(2)}с)`,
        suggestion: 'Проверьте, нужно ли сохранить эту реплику согласно инструкции',
      });
    }

    if (duration > 30) {
      hints.push({ segmentId: s.id, type: 'warning', message: `Длинный сегмент (${duration.toFixed(0)}с) — возможно, нужна разбивка` });
    }

    if (text && !/[.!?]$/.test(text) && text.length > 30) {
      hints.push({ segmentId: s.id, type: 'info', message: 'Возможно, не хватает знака препинания в конце' });
    }

    if (text && /^[A-ZА-ЯЁ\s]+$/.test(text) && text.length > 20) {
      hints.push({ segmentId: s.id, type: 'info', message: 'Текст заглавными буквами — проверьте регистр' });
    }

    for (const term of KNOWN_TERMS) {
      if (text && text.toLowerCase().includes(term.toLowerCase()) && text.includes(term)) {
        hints.push({
          segmentId: s.id, type: 'success',
          message: `Технический термин "${term}" — проверьте написание`,
        });
        break;
      }
    }

    for (let j = i + 1; j < segments.length; j++) {
      const other = segments[j];
      if (other.text.trim() && text === other.text.trim()) {
        hints.push({
          segmentId: s.id, type: 'warning',
          message: `Повтор текста с сегментом #${other.id}`,
        });
        break;
      }
    }

    if (i > 0) {
      const prev = segments[i - 1];
      if (prev.end_time > s.start_time) {
        hints.push({
          segmentId: s.id, type: 'error',
          message: `Пересечение с сегментом #${prev.id} (${prev.end_time.toFixed(2)} > ${s.start_time.toFixed(2)})`,
        });
      }
      const gap = s.start_time - prev.end_time;
      if (gap > 3) {
        hints.push({
          segmentId: s.id, type: 'warning',
          message: `Длинная пауза ${gap.toFixed(1)}с перед сегментом — возможна пропущенная речь`,
        });
      }
      if (gap < -0.01) {
        hints.push({
          segmentId: s.id, type: 'error',
          message: 'Нарушен порядок времени — сегмент начинается до окончания предыдущего',
        });
      }
      if (text && prev.text && /[а-яёa-z]$/i.test(prev.text) && /^[а-яёa-z]/i.test(text)) {
        hints.push({
          segmentId: s.id, type: 'warning',
          message: `Возможно слово разрезано между сегментами #${prev.id} и #${s.id}: "...${prev.text.slice(-20)} | ${text.slice(0, 20)}..."`,
        });
      }
    }
    if (duration < 0.3 && (!text || !SHORT_REPLIES.some(r => text.toLowerCase() === r))) {
      hints.push({
        segmentId: s.id, type: 'warning',
        message: `Очень короткий сегмент (${duration.toFixed(2)}с)${text ? ': "' + text + '"' : ''}`,
      });
    }
  }

  return hints;
}

export default function AIAssistant({ segments, activeSegmentId, darkMode, onJumpToSegment, onApplySuggestion }: Props) {
  const hints = useMemo(() => analyzeSegments(segments), [segments]);

  const errors = hints.filter(h => h.type === 'error').length;
  const warnings = hints.filter(h => h.type === 'warning').length;
  const infos = hints.filter(h => h.type === 'info' || h.type === 'success').length;

  const activeHints = hints.filter(h => h.segmentId === activeSegmentId);
  const allHints = [...activeHints, ...hints.filter(h => h.segmentId !== activeSegmentId)];

  const typeBadge = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'success': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const typeEmoji = (type: string) => {
    switch (type) {
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      case 'success': return '✓';
      default: return '•';
    }
  };

  if (segments.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center text-xs opacity-40 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Загрузите файл для анализа
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <h3 className="text-[11px] uppercase font-bold opacity-50 tracking-wider">AI Помощник</h3>
        <div className="flex gap-1 ml-auto">
          {errors > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">{errors}</span>}
          {warnings > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">{warnings}</span>}
          {infos > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">{infos}</span>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {allHints.map((h, i) => (
          <div
            key={`${h.segmentId}-${i}`}
            onClick={() => onJumpToSegment(h.segmentId)}
            className={`p-1.5 rounded-lg border cursor-pointer text-[10px] transition-all ${
              h.segmentId === activeSegmentId
                ? (darkMode ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-indigo-400 bg-indigo-50')
                : (darkMode ? 'border-gray-800/50 bg-black/20 hover:border-gray-700' : 'border-gray-200 bg-white hover:border-gray-300')
            } ${typeBadge(h.type).split(' ').slice(0, 2).join(' ')}`}
          >
            <div className="flex items-start gap-1.5">
              <span className={`text-[9px] px-1 rounded shrink-0 border font-bold ${typeBadge(h.type)}`}>
                {typeEmoji(h.type)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="leading-tight">{h.message}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="opacity-40 text-[9px]">Сегм. #{h.segmentId}</span>
                  {h.suggestion && (
                    <span className="text-[9px] opacity-60 italic truncate">{h.suggestion}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {allHints.length === 0 && (
          <div className="text-center text-[10px] opacity-30 py-4">Проблем не найдено</div>
        )}
      </div>
    </div>
  );
}
