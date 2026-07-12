import React, { useEffect, useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

interface WordTerm {
  text: string;
  type: string;
  start?: number;
  end?: number;
}

interface Segment {
  id: number;
  start_time: number;
  end_time: number;
  text: string;
  is_crosstalk: boolean;
  speaker: string;
  terms: WordTerm[];
}

const getSpeakerColor = (speaker: string, isActive: boolean) => {
  const colors: { [key: string]: string } = {
    'SPEAKER_00': '16, 185, 129',
    'SPEAKER_01': '59, 130, 246',
    'SPEAKER_02': '245, 158, 11',
    'SPEAKER_03': '139, 92, 246',
  };
  const rgb = colors[speaker] || '156, 163, 175';
  return isActive ? `rgba(${rgb}, 0.6)` : `rgba(${rgb}, 0.25)`;
};

export default function App() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(60);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  
  // Размеры окон
  const [mainSplitX, setMainSplitX] = useState<number>(55);
  const [leftSplitY, setLeftSplitY] = useState<number>(50);
  const [rightSplitY, setRightSplitY] = useState<number>(60);

  // Стейт для истории изменений (Undo)
  const [history, setHistory] = useState<Segment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const waveformRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionsPlugin = useRef<any>(null);
  
  const activeSegmentEndRef = useRef<number | null>(null);
  const segmentsRef = useRef<Segment[]>([]);
  const activeIdRef = useRef<number | null>(null);

  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { activeIdRef.current = activeSegmentId; }, [activeSegmentId]);

  // Хелпер для сохранения шага в историю
  const pushToHistory = (newSegments: Segment[]) => {
    const cleanHistory = history.slice(0, historyIndex + 1);
    setHistory([...cleanHistory, newSegments]);
    setHistoryIndex(cleanHistory.length);
  };

  // Функция отмены (Undo)
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setSegments(history[prevIndex]);
    }
  };

  // Слушатель глобального хоткея Ctrl + Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  // --- РЕСАЙЗЕРЫ ОКОН ---
  const startResizeX = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      const pct = (moveEvent.clientX / window.innerWidth) * 100;
      if (pct > 20 && pct < 80) setMainSplitX(pct);
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startResizeLeftY = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      const pct = (moveEvent.clientY / window.innerHeight) * 100;
      if (pct > 15 && pct < 85) setLeftSplitY(pct);
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startResizeRightY = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      const pct = (moveEvent.clientY / window.innerHeight) * 100;
      if (pct > 15 && pct < 85) setRightSplitY(pct);
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const buildTextFromTerms = (termsList: WordTerm[]): string => {
    if (!termsList || termsList.length === 0) return "";
    let result = "";
    termsList.forEach((term, index) => {
      if (index === 0) {
        result += term.text;
      } else {
        if (term.type === "PUNCTUATION") {
          result += term.text;
        } else {
          result += " " + term.text;
        }
      }
    });
    return result.replace(/\s+/g, ' ').trim();
  };

  const parseGeckoJson = (json: any): Segment[] => {
    const rawList = json.monologues || json.monolog || json.segments || [];
    if (!Array.isArray(rawList)) return [];
    const parsed = rawList.map((m: any, index: number) => {
      let rawSpeaker = "SPEAKER_00";
      if (m.speaker) {
        if (typeof m.speaker === 'object') {
          rawSpeaker = m.speaker.id || m.speaker.name || "SPEAKER_00";
        } else if (typeof m.speaker === 'string') {
          rawSpeaker = m.speaker;
        }
      }
      const terms = Array.isArray(m.terms) ? m.terms : [];
      const sentence = buildTextFromTerms(terms) || m.text || "Без текста";

      return {
        id: index + 1,
        start_time: parseFloat(m.start ?? m.start_time) || 0,
        end_time: parseFloat(m.end ?? m.end_time) || 0,
        text: sentence,
        is_crosstalk: Boolean(m.crosstalk ?? m.is_crosstalk ?? false),
        speaker: rawSpeaker,
        terms: terms
      };
    });

    setHistory([parsed]);
    setHistoryIndex(0);
    return parsed;
  };

  const syncRegionsWithSegments = (segs: Segment[]) => {
    if (!wavesurfer.current || !regionsPlugin.current || !isPlayerReady) return;
    try {
      const currentRegions = regionsPlugin.current.getRegions();
      if (currentRegions.length !== segs.length) {
        regionsPlugin.current.clearRegions();
        segs.forEach(s => {
          regionsPlugin.current.addRegion({
            id: String(s.id),
            start: s.start_time,
            end: s.end_time,
            color: getSpeakerColor(s.speaker, s.id === activeIdRef.current),
            drag: true,
            resize: true
          });
        });
      } else {
        currentRegions.forEach((r: any) => {
          const seg = segs.find(s => String(s.id) === r.id);
          if (seg) {
            r.setOptions({ color: getSpeakerColor(seg.speaker, seg.id === activeIdRef.current) });
            if (Math.abs(r.start - seg.start_time) > 0.05 || Math.abs(r.end - seg.end_time) > 0.05) {
              r.update({ start: seg.start_time, end: seg.end_time });
            }
          }
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // --- ИНИЦИАЛИЗАЦИЯ WAVESURFER ---
  useEffect(() => {
    if (!videoUrl) return;
    setIsPlayerReady(false);

    if (waveformRef.current) {
      waveformRef.current.innerHTML = '';
      const wsRegions = RegionsPlugin.create();
      regionsPlugin.current = wsRegions;
      
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: darkMode ? '#6366F1' : '#4F46E5',
        progressColor: darkMode ? '#312E81' : '#1E1B4B',
        height: 140,
        minPxPerSec: zoomLevel,
        media: videoPlayerRef.current || undefined,
        plugins: [wsRegions]
      });

      wavesurfer.current.load(videoUrl);
      wavesurfer.current.on('ready', () => setIsPlayerReady(true));

      wsRegions.enableDragSelection({ color: 'rgba(16, 185, 129, 0.25)' });

      wavesurfer.current.on('timeupdate', (currentTime) => {
        if (activeSegmentEndRef.current !== null && currentTime >= activeSegmentEndRef.current) {
          wavesurfer.current?.pause();
          activeSegmentEndRef.current = null;
        }
        const matching = segmentsRef.current.find(s => currentTime >= s.start_time && currentTime <= s.end_time);
        if (matching && matching.id !== activeIdRef.current) {
          setActiveSegmentId(matching.id);
        }
      });

      wsRegions.on('region-created', (region: any) => {
        if (isNaN(Number(region.id))) {
          const prev = segmentsRef.current;
          const newId = prev.length > 0 ? Math.max(...prev.map(s => s.id)) + 1 : 1;
          region.id = String(newId);

          const newSeg: Segment = {
            id: newId,
            start_time: region.start,
            end_time: region.end,
            text: "Новый выделенный сегмент",
            is_crosstalk: false,
            speaker: "SPEAKER_00",
            terms: []
          };

          const updated = [...prev, newSeg].sort((a, b) => a.start_time - b.start_time);
          setSegments(updated);
          pushToHistory(updated);
          setActiveSegmentId(newId);
        }
      });

      wsRegions.on('region-update-end', (region: any) => {
        const rId = Number(region.id);
        if (!isNaN(rId)) {
          const updated = segmentsRef.current.map(s => s.id === rId ? { ...s, start_time: region.start, end_time: region.end } : s);
          setSegments(updated);
          pushToHistory(updated);
        }
      });

      wsRegions.on('region-click', (region: any, e: MouseEvent) => {
        e.stopPropagation();
        setActiveSegmentId(Number(region.id));
      });
    }
    
    return () => {
      wavesurfer.current?.destroy();
    };
  }, [videoUrl, darkMode]);

  useEffect(() => { if (wavesurfer.current && isPlayerReady) wavesurfer.current.zoom(zoomLevel); }, [zoomLevel, isPlayerReady]);
  useEffect(() => { if (isPlayerReady) syncRegionsWithSegments(segments); }, [segments, activeSegmentId, isPlayerReady]);

  const isolatePlayback = (start: number, end: number) => {
    if (!wavesurfer.current || !isPlayerReady) return;
    activeSegmentEndRef.current = end;
    wavesurfer.current.setTime(start);
    wavesurfer.current.play();
  };

  const splitCurrentSegment = () => {
    if (!wavesurfer.current || !isPlayerReady || !activeSegmentId) return;
    const currentTime = wavesurfer.current.getCurrentTime();
    const target = segments.find(s => s.id === activeSegmentId);
    
    if (!target || currentTime <= target.start_time || currentTime >= target.end_time) {
      alert("Поставьте курсор воспроизведения внутрь разрезаемого сегмента!");
      return;
    }

    const filtered = segments.filter(s => s.id !== target.id);
    const maxId = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 1;
    
    const currentTerms = target.terms || [];
    const leftTerms: WordTerm[] = [];
    const rightTerms: WordTerm[] = [];

    currentTerms.forEach((term) => {
      const termStart = term.start ?? term.end ?? null;
      if (termStart !== null) {
        if (termStart <= currentTime) {
          leftTerms.push(term);
        } else {
          rightTerms.push(term);
        }
      } else {
        if (rightTerms.length === 0) {
          leftTerms.push(term);
        } else {
          rightTerms.push(term);
        }
      }
    });

    const text1 = leftTerms.length > 0 ? buildTextFromTerms(leftTerms) : target.text + " (Часть 1)";
    const text2 = rightTerms.length > 0 ? buildTextFromTerms(rightTerms) : "(Часть 2)";

    const part1: Segment = {
      ...target,
      id: maxId,
      end_time: currentTime,
      text: text1,
      terms: leftTerms
    };

    const part2: Segment = {
      ...target,
      id: maxId + 1,
      start_time: currentTime,
      text: text2,
      terms: rightTerms
    };

    const reg = regionsPlugin.current?.getRegions().find((r: any) => r.id === String(target.id));
    if (reg) reg.remove();

    const updated = [...filtered, part1, part2].sort((a, b) => a.start_time - b.start_time);
    setSegments(updated);
    pushToHistory(updated);
    setActiveSegmentId(part1.id);
  };

  const deleteSegment = (id: number) => {
    const updated = segments.filter(s => s.id !== id);
    setSegments(updated);
    pushToHistory(updated);
    if (activeSegmentId === id) setActiveSegmentId(null);
    try {
      const reg = regionsPlugin.current?.getRegions().find((r: any) => r.id === String(id));
      if (reg) reg.remove();
    } catch(e){}
  };

  const handleFieldChange = (id: number, fields: Partial<Segment>) => {
    const updated = segments.map(s => s.id === id ? { ...s, ...fields } : s);
    setSegments(updated);
  };

  const handleFieldBlur = () => {
    pushToHistory(segments);
  };

  const exportToGeckoJson = () => {
    const outputData = {
      schemaVersion: "2.0",
      monologues: segments.map(s => ({
        speaker: { id: s.speaker, name: s.speaker },
        start: s.start_time,
        end: s.end_time,
        text: s.text,
        crosstalk: s.is_crosstalk,
        terms: s.terms && s.terms.length > 0 ? s.terms : [
          { text: s.text, type: "WORD", start: s.start_time, end: s.end_time }
        ]
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outputData, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "gecko_export.json");
    dl.click();
  };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const videoFile = formData.get('videoFile') as File;
    const jsonFile = formData.get('jsonFile') as File;
    if (jsonFile && jsonFile.size > 0) {
      setSegments(parseGeckoJson(JSON.parse(await jsonFile.text())));
      if (videoFile && videoFile.size > 0) setVideoUrl(URL.createObjectURL(videoFile));
    }
    setShowWelcomeModal(false);
  };

  const activeSegment = segments.find(s => s.id === activeSegmentId);

  return (
    <div className={`h-screen w-screen flex flex-col p-3 overflow-hidden font-sans select-none ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <form onSubmit={handleModalSubmit} className="bg-gray-900 border border-gray-800 p-5 rounded-xl max-w-md w-full space-y-4 text-gray-100">
            <h2 className="text-md font-bold text-center">Инициализация Gecko Workspace</h2>
            <input type="file" name="videoFile" accept="video/*" className="w-full bg-gray-950 text-xs p-2 rounded border border-gray-800" />
            <input type="file" name="jsonFile" accept=".json" required className="w-full bg-gray-950 text-xs p-2 rounded border border-gray-800" />
            <button type="submit" className="w-full bg-indigo-600 py-2 rounded-lg text-xs font-semibold">Запустить среду</button>
          </form>
        </div>
      )}

      {/* ШАПКА */}
      <header className={`flex justify-between items-center p-3 mb-2 border rounded-xl shrink-0 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div>
          <h1 className="text-base font-bold tracking-tight">Gecko Next</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            className={`text-xs px-3 py-1.5 border rounded-lg font-medium transition ${
              historyIndex <= 0 
                ? 'opacity-40 cursor-not-allowed' 
                : darkMode ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-white' : 'border-gray-300 bg-gray-50 hover:bg-gray-200 text-black'
            }`}
          >
            ↩️ Отменить (Ctrl+Z)
          </button>
          <button onClick={exportToGeckoJson} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">💾 Экспорт JSON</button>
          <button onClick={() => setShowWelcomeModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">🔄 Новые файлы</button>
          <button onClick={() => setDarkMode(!darkMode)} className={`text-xs px-3 py-1.5 border rounded-lg font-medium transition ${darkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}>Тема</button>
        </div>
      </header>

      {/* ГРИД ОКОН */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        
        {/* ЛЕВАЯ СТОРОНА */}
        <div style={{ width: `${mainSplitX}%` }} className="flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
          
          {/* 1. Видео */}
          <div 
            style={{ 
              height: `${leftSplitY}%`,
              backgroundColor: darkMode ? '#000000' : '#e5e7eb'
            }} 
            className={`border rounded-xl flex items-center justify-center overflow-hidden relative shadow-inner ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
          >
            <video ref={videoPlayerRef} src={videoUrl || undefined} className="w-full h-full object-contain" controls />
          </div>

          <div onMouseDown={startResizeLeftY} className="h-2 my-0.5 cursor-row-resize flex items-center justify-center group shrink-0">
            <div className="w-20 h-[3px] bg-gray-500/30 group-hover:bg-indigo-500 rounded transition-colors" />
          </div>

          {/* 2. Дорожка */}
          <div style={{ height: `${100 - leftSplitY}%` }} className={`p-3 border rounded-xl flex flex-col min-h-0 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div ref={waveformRef} className={`rounded-xl p-1 min-h-[120px] ${darkMode ? 'bg-black' : 'bg-gray-100'}`}></div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 shrink-0">
              <div className="flex items-center space-x-2 flex-1 max-w-xs">
                <span className="text-[10px] opacity-60 whitespace-nowrap">🔍 Масштаб:</span>
                <input type="range" min="10" max="800" value={zoomLevel} disabled={!isPlayerReady} onChange={e => setZoomLevel(Number(e.target.value))} className="w-full cursor-pointer accent-indigo-600" />
              </div>
              <div className="flex space-x-2">
                {activeSegment && (
                  <button type="button" onClick={splitCurrentSegment} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-xs font-bold transition">
                    ✂️ Разрезать по словам
                  </button>
                )}
                <button type="button" onClick={() => { activeSegmentEndRef.current = null; wavesurfer.current?.playPause(); }} className="bg-gray-600 text-white px-3 py-1 rounded text-xs">Старт / Пауза</button>
              </div>
            </div>
          </div>
        </div>

        {/* РАЗДЕЛИТЕЛЬ */}
        <div onMouseDown={startResizeX} className="w-3 mx-0.5 cursor-col-resize flex items-center justify-center shrink-0 group">
          <div className="h-24 w-[3px] bg-gray-500/30 group-hover:bg-indigo-500 rounded transition-colors" />
        </div>

        {/* ПРАВАЯ СТОРОНА */}
        <div style={{ width: `${100 - mainSplitX}%` }} className="flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* 3. Список */}
          <div style={{ height: `${rightSplitY}%` }} className={`flex flex-col p-3 border rounded-xl min-h-0 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-50">Все сегменты ({segments.length})</h2>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 select-text">
              {segments.map(s => {
                const isSelected = activeSegmentId === s.id;
                return (
                  <div 
                    key={s.id}
                    onClick={() => { setActiveSegmentId(s.id); if (wavesurfer.current) wavesurfer.current.setTime(s.start_time); }}
                    className={`p-2 rounded-xl border cursor-pointer flex justify-between items-start transition ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/10' 
                        : darkMode ? 'border-gray-800 bg-black/40 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex justify-between items-center text-[9px] font-mono mb-0.5">
                        <span className="text-indigo-400 font-bold">{s.start_time.toFixed(2)}s – {s.end_time.toFixed(2)}s</span>
                        <span className="opacity-60 font-bold">{s.speaker}</span>
                      </div>
                      <p className="text-xs truncate opacity-90">{s.text}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteSegment(s.id); }} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div onMouseDown={startResizeRightY} className="h-2 my-0.5 cursor-row-resize flex items-center justify-center group shrink-0">
            <div className="w-20 h-[3px] bg-gray-500/30 group-hover:bg-indigo-500 rounded transition-colors" />
          </div>

          {/* 4. Редактор */}
          <div style={{ height: `${100 - rightSplitY}%` }} className={`p-3 border rounded-xl flex flex-col min-h-0 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            {activeSegment ? (
              <div className="space-y-2 flex-1 flex flex-col min-h-0 select-text">
                <div className={`flex justify-between items-center pb-1 border-b shrink-0 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className="text-xs font-bold">Правка фрагмента #{activeSegment.id}</span>
                  <select 
                    value={activeSegment.speaker} 
                    onChange={e => handleFieldChange(activeSegment.id, { speaker: e.target.value })}
                    onBlur={handleFieldBlur}
                    className={`text-xs p-1 border rounded font-mono focus:outline-none ${
                      darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-black'
                    }`}
                  >
                    <option value="SPEAKER_00">SPEAKER 00</option>
                    <option value="SPEAKER_01">SPEAKER 01</option>
                    <option value="SPEAKER_02">SPEAKER 02</option>
                    <option value="SPEAKER_03">SPEAKER 03</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <input 
                    type="number" 
                    step="0.01" 
                    value={activeSegment.start_time} 
                    onChange={e => handleFieldChange(activeSegment.id, { start_time: parseFloat(e.target.value) || 0 })} 
                    onBlur={handleFieldBlur} 
                    className={`w-full border rounded p-1 text-xs text-center font-mono focus:outline-none ${
                      darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-black'
                    }`} 
                  />
                  <input 
                    type="number" 
                    step="0.01" 
                    value={activeSegment.end_time} 
                    onChange={e => handleFieldChange(activeSegment.id, { end_time: parseFloat(e.target.value) || 0 })} 
                    onBlur={handleFieldBlur} 
                    className={`w-full border rounded p-1 text-xs text-center font-mono focus:outline-none ${
                      darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-black'
                    }`} 
                  />
                </div>

                <textarea 
                  value={activeSegment.text} 
                  onChange={e => handleFieldChange(activeSegment.id, { text: e.target.value })}
                  onBlur={handleFieldBlur}
                  className={`w-full flex-1 min-h-0 p-2 border text-xs resize-none rounded-lg focus:outline-none ${
                    darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-black'
                  }`} 
                />

                <div className="flex justify-between items-center gap-2 shrink-0 pt-1">
                  <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 p-1 rounded-lg">
                    <input type="checkbox" id="ct" checked={activeSegment.is_crosstalk} onChange={e => { handleFieldChange(activeSegment.id, { is_crosstalk: e.target.checked }); pushToHistory(segments.map(s => s.id === activeSegment.id ? { ...s, is_crosstalk: e.target.checked } : s)); }} className="cursor-pointer accent-amber-500" />
                    <label htmlFor="ct" className="text-[10px] text-amber-700 dark:text-amber-300 cursor-pointer select-none">Кроссток</label>
                  </div>
                  <div className="flex space-x-2 ml-auto">
                    <button type="button" onClick={() => isolatePlayback(activeSegment.start_time, activeSegment.end_time)} className="bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold px-3 py-1 rounded-md transition">🔁 Изолировать</button>
                    <button type="button" onClick={() => deleteSegment(activeSegment.id)} className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1 rounded-md transition">🗑️ Удалить</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-40 text-xs my-auto">Выделите область с зажатым Shift или выберите готовый сегмент.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}