import React, { useEffect, useState, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { api, setToken, getToken } from './api/client';
import {
  UserRole, AppScreen, UserSession, Segment, Speaker,
  ReviewRequest, ROLE_NAMES, getRoleHomeScreen,
} from './types';
import AdminDashboard from './components/AdminDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import VerifierWorkspace from './components/VerifierWorkspace';
import MLEngineerDashboard from './components/MLEngineerDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import AIAssistant from './components/AIAssistant';
import TerminologyModule from './components/TerminologyModule';
import CheckListModal from './components/CheckListModal';
import ThemeSelector from './components/ThemeSelector';
import { ThemeState, ThemeColor, PALETTES, loadTheme, saveTheme, applyThemeToDOM } from './themes';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('LOGIN');
  const [user, setUser] = useState<UserSession | null>(null);
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState<ThemeState>(loadTheme);

  useEffect(() => { applyThemeToDOM(theme); }, [theme]);

  const darkMode = theme.isDark;
  const handleThemeChange = (color: ThemeColor, isDark: boolean) => {
    saveTheme(color, isDark);
    setTheme({ color, isDark, palette: PALETTES[color], colors: isDark ? PALETTES[color].dark : PALETTES[color].light });
  };

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [userList, setUserList] = useState<any[]>(() => {
    const saved = localStorage.getItem('gecko_local_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>(() => {
    const saved = localStorage.getItem('gecko_local_reviews');
    return saved ? JSON.parse(saved) : [];
  });

  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('Transcriber');

  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(60);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopSegment, setLoopSegment] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'segments' | 'ai'>('segments');
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string>('TODO');
  const [currentInspectedRequestId, setCurrentInspectedRequestId] = useState<number | null>(null);

  const [speakers, setSpeakers] = useState<Speaker[]>([
    { id: 'SPEAKER_00', name: 'Спикер 00', color: '16, 185, 129' },
    { id: 'SPEAKER_01', name: 'Спикер 01', color: '59, 130, 246' },
  ]);

  const [mainSplitX, setMainSplitX] = useState(55);
  const [leftSplitY, setLeftSplitY] = useState(50);
  const [rightSplitY, setRightSplitY] = useState(60);

  const [history, setHistory] = useState<Segment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saveStatus, setSaveStatus] = useState<'saved'|'saving'|'unsaved'>('saved');
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [currentMediaId, setCurrentMediaId] = useState<number | null>(null);
  const [verifierTasks, setVerifierTasks] = useState<any[]>([]);
  const [verifierLoading, setVerifierLoading] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSegmentsRef = useRef<Segment[] | null>(null);

  const waveformRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionsPlugin = useRef<any>(null);
  const activeSegmentEndRef = useRef<number | null>(null);
  const segmentsRef = useRef<Segment[]>([]);
  const activeIdRef = useRef<number | null>(null);

  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { activeIdRef.current = activeSegmentId; }, [activeSegmentId]);
  useEffect(() => { localStorage.setItem('gecko_local_users', JSON.stringify(userList)); }, [userList]);
  useEffect(() => { localStorage.setItem('gecko_local_reviews', JSON.stringify(reviewRequests)); }, [reviewRequests]);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.me().then(bu => {
        setUser({ id: bu.id, name: bu.full_name, email: bu.email, role: bu.role.name as UserRole, roleId: bu.role_id });
        setScreen(getRoleHomeScreen(bu.role.name as UserRole));
        loadUsers();
      }).catch(() => setToken(null));
    }
  }, []);

  const loadUsers = async () => { try { setUserList(await api.listUsers()); } catch {} };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError('');
    try {
      const res = await api.login(loginEmail, loginPassword);
      setToken(res.access_token);
      setUser({ id: res.user.id, name: res.user.full_name, email: res.user.email, role: res.user.role.name as UserRole, roleId: res.user.role_id });
      const home = getRoleHomeScreen(res.user.role.name as UserRole);
      setScreen(home);
      if (res.user.role.name === 'Transcriber') setShowWelcomeModal(true);
      loadUsers();
    } catch (err: any) {
      if (loginEmail === 'admin' && loginPassword === 'admin') {
        setUser({ id: 0, name: 'Администратор', email: 'admin', role: 'Admin', roleId: 0 });
        setScreen('ADMIN_DASHBOARD');
      } else {
        setAuthError(err?.message || 'Неверный логин или пароль');
      }
    }
  };

  const handleLogout = () => {
    setToken(null); setUser(null); setScreen('LOGIN');
    setLoginEmail(''); setLoginPassword(''); setSegments([]); setVideoUrl(null); setActiveSegmentId(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword) return;
    const roleIds: Record<UserRole, number> = { 'Admin': 1, 'Supervisor': 2, 'Transcriber': 3, 'Verifier': 4, 'ML Engineer': 5, 'Customer': 6 };
    try {
      const nu = await api.createUser({ full_name: addName.trim(), email: addEmail.trim(), password: addPassword, role_id: roleIds[addRole] });
      setUserList(prev => [...prev, nu]); setAddName(''); setAddEmail(''); setAddPassword('');
    } catch (err: any) { alert('Ошибка: ' + (err?.message || 'Не удалось')); }
  };

  const handleToggleUserStatus = async (id: number, ns: string) => {
    try { await api.updateUser(id, { status: ns }); setUserList(prev => prev.map(u => u.id === id ? { ...u, status: ns } : u)); } catch {}
  };

  const getSpeakerColor = (speakerId: string, isActive: boolean) => {
    const t = speakers.find(sp => sp.id === speakerId);
    const rgb = t ? t.color : '156, 163, 175';
    return isActive ? `rgba(${rgb}, 0.65)` : `rgba(${rgb}, 0.25)`;
  };

  const buildTextFromTerms = (tl: any[]): string => {
    if (!tl || tl.length === 0) return '';
    let r = '';
    tl.forEach((t, i) => { r += (i > 0 && t.type !== 'PUNCTUATION' ? ' ' : '') + t.text; });
    return r.trim();
  };

  const parseGeckoJson = (json: any): Segment[] => {
    const raw = json.monologues || json.monolog || json.segments || [];
    if (!Array.isArray(raw)) return [];
    if (json.projectStatus) setProjectStatus(json.projectStatus);
    const sm = new Map<string, { id: string; name: string; color: string }>();
    const colors = ['16, 185, 129', '59, 130, 246', '245, 158, 11', '239, 68, 68', '168, 85, 247', '236, 72, 153', '20, 184, 166'];
    raw.forEach((m: any) => {
      let sid = 'SPEAKER_00', sname = 'Спикер 00';
      if (m.speaker) {
        sid = typeof m.speaker === 'object' ? (m.speaker.id || m.speaker.name || 'SPEAKER_00') : String(m.speaker);
        sname = typeof m.speaker === 'object' ? (m.speaker.name || m.speaker.original_name || sid) : String(m.speaker);
      }
      if (!sm.has(sid)) sm.set(sid, { id: sid, name: sname, color: colors[sm.size % colors.length] });
    });
    if (sm.size > 0) setSpeakers(Array.from(sm.values()));
    const parsed = raw.map((m: any, i: number) => ({
      id: i + 1,
      start_time: parseFloat(m.start ?? m.start_time) || 0,
      end_time: parseFloat(m.end ?? m.end_time) || 0,
      text: buildTextFromTerms(m.terms || []) || m.text || 'Без текста',
      is_crosstalk: Boolean(m.crosstalk ?? m.is_crosstalk ?? false),
      speaker: typeof m.speaker === 'object' ? (m.speaker.id || m.speaker.name) : String(m.speaker || 'SPEAKER_00'),
      terms: Array.isArray(m.terms) ? m.terms : [],
      isLocked: Boolean(m.isLocked ?? false),
    }));
    setHistory([parsed]); setHistoryIndex(0);
    return parsed;
  };

  const pushToHistory = (s: Segment[]) => {
    const clean = history.slice(0, historyIndex + 1);
    setHistory([...clean, s]); setHistoryIndex(clean.length);
  };
  const handleUndo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setSegments(history[historyIndex - 1]); } };

  const syncRegionsWithSegments = useCallback((segs: Segment[]) => {
    if (!wavesurfer.current || !regionsPlugin.current || !isPlayerReady) return;
    try {
      regionsPlugin.current.clearRegions();
      segs.forEach(s => regionsPlugin.current.addRegion({
        id: String(s.id), start: s.start_time, end: s.end_time,
        color: getSpeakerColor(s.speaker, s.id === activeIdRef.current),
        drag: !(s.isLocked && user?.role !== 'Admin'), resize: !(s.isLocked && user?.role !== 'Admin'),
      }));
    } catch {}
  }, [isPlayerReady, speakers, user?.role]);

  useEffect(() => {
    if (!videoUrl || (screen !== 'TRANSCRIBER_WORKSPACE' && screen !== 'VERIFIER_WORKSPACE')) return;
    setIsPlayerReady(false);
    if (waveformRef.current) {
      waveformRef.current.innerHTML = '';
      const wsRegions = RegionsPlugin.create();
      regionsPlugin.current = wsRegions;
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current, waveColor: '#6366F1', progressColor: '#312E81',
        height: 140, minPxPerSec: zoomLevel, media: videoPlayerRef.current || undefined, plugins: [wsRegions],
      });
      wavesurfer.current.load(videoUrl);
      wavesurfer.current.on('ready', () => setIsPlayerReady(true));
      wsRegions.enableDragSelection({ color: 'rgba(16, 185, 129, 0.25)' });
      wavesurfer.current.on('timeupdate', (ct) => {
        if (activeSegmentEndRef.current !== null && ct >= activeSegmentEndRef.current) {
          if (loopSegment && activeSegmentId) {
            const seg = segmentsRef.current.find(s => s.id === activeSegmentId);
            if (seg) { wavesurfer.current?.setTime(seg.start_time); return; }
          }
          wavesurfer.current?.pause(); activeSegmentEndRef.current = null;
        }
        const m = segmentsRef.current.find(s => ct >= s.start_time && ct <= s.end_time);
        if (m && m.id !== activeIdRef.current) setActiveSegmentId(m.id);
      });
      wsRegions.on('region-created', (region: any) => {
        if (isNaN(Number(region.id))) {
          const prev = segmentsRef.current;
          const nid = prev.length > 0 ? Math.max(...prev.map(s => s.id)) + 1 : 1;
          region.id = String(nid);
          const ns: Segment = { id: nid, start_time: region.start, end_time: region.end, text: '', is_crosstalk: false, speaker: speakers[0]?.id || 'SPEAKER_00', terms: [] };
          const upd = [...prev, ns].sort((a, b) => a.start_time - b.start_time);
          setSegments(upd); pushToHistory(upd); setActiveSegmentId(nid);
        }
      });
      wsRegions.on('region-updated', (region: any) => {
        const rid = Number(region.id);
        if (!isNaN(rid)) {
          const upd = segmentsRef.current.map(s => s.id === rid ? { ...s, start_time: region.start, end_time: region.end } : s);
          setSegments(upd); pushToHistory(upd);
        }
      });
      wsRegions.on('region-clicked', (region: any, e: MouseEvent) => { e.stopPropagation(); setActiveSegmentId(Number(region.id)); });
    }
    return () => { wavesurfer.current?.destroy(); };
  }, [videoUrl, screen]);

  useEffect(() => { if (wavesurfer.current && isPlayerReady) wavesurfer.current.zoom(zoomLevel); }, [zoomLevel, isPlayerReady]);
  useEffect(() => { if (videoPlayerRef.current) videoPlayerRef.current.playbackRate = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { if (isPlayerReady) syncRegionsWithSegments(segments); }, [segments, activeSegmentId, isPlayerReady, syncRegionsWithSegments]);

  const triggerAutoSave = useCallback((segs: Segment[]) => {
    pendingSegmentsRef.current = segs;
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const toSave = pendingSegmentsRef.current;
      if (!toSave) return;
      setSaveStatus('saving');
      try {
        const tid = currentTaskId;
        if (tid) {
          await api.importSegments(tid, toSave.map(s => ({
            start_time: s.start_time, end_time: s.end_time,
            text: s.text, is_crosstalk: s.is_crosstalk, speaker_id: null,
          })));
        }
        setSaveStatus('saved');
      } catch { setSaveStatus('unsaved'); }
    }, 2000);
  }, [currentTaskId]);

  const forceSave = useCallback(async () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    const toSave = pendingSegmentsRef.current || segments;
    setSaveStatus('saving');
    try {
      if (currentTaskId) {
        await api.importSegments(currentTaskId, toSave.map(s => ({
          start_time: s.start_time, end_time: s.end_time,
          text: s.text, is_crosstalk: s.is_crosstalk, speaker_id: null,
        })));
      }
      setSaveStatus('saved');
    } catch { setSaveStatus('unsaved'); }
  }, [segments, currentTaskId]);

  useEffect(() => { return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, []);

  useEffect(() => {
    const hk = (e: KeyboardEvent) => {
      if (screen !== 'TRANSCRIBER_WORKSPACE' && screen !== 'VERIFIER_WORKSPACE') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); forceSave(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); forceSave(); return; }
      if (e.key === 'Tab') { e.preventDefault(); const idx = segments.findIndex(s => s.id === activeSegmentId); const next = idx >= 0 && idx < segments.length - 1 ? segments[idx + 1] : segments[0]; if (next) { setActiveSegmentId(next.id); wavesurfer.current?.setTime(next.start_time); } return; }
      if (e.key === 'Delete' && activeSegmentId) { e.preventDefault(); deleteSegment(activeSegmentId); return; }
      if (e.key === ' ' && !e.shiftKey) { e.preventDefault(); wavesurfer.current?.playPause(); return; }
      if (e.key === ' ' && e.shiftKey && activeSegment) { e.preventDefault(); isolatePlayback(activeSegment.start_time, activeSegment.end_time); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); wavesurfer.current?.setTime(Math.max(0, (wavesurfer.current?.getCurrentTime() || 0) - 0.1)); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); wavesurfer.current?.setTime(Math.min(videoPlayerRef.current?.duration || 9999, (wavesurfer.current?.getCurrentTime() || 0) + 0.1)); return; }
    };
    window.addEventListener('keydown', hk); return () => window.removeEventListener('keydown', hk);
  }, [history, historyIndex, screen, activeSegmentId, segments]);

  const isolatePlayback = (start: number, end: number) => {
    if (!wavesurfer.current || !isPlayerReady) return;
    activeSegmentEndRef.current = end; wavesurfer.current.setTime(start); wavesurfer.current.play();
  };

  const splitCurrentSegment = () => {
    if (!wavesurfer.current || !isPlayerReady || !activeSegmentId) return;
    const target = segments.find(s => s.id === activeSegmentId);
    if (!target) return;
    const ct = wavesurfer.current.getCurrentTime();
    if (ct <= target.start_time || ct >= target.end_time) return;
    const filtered = segments.filter(s => s.id !== target.id);
    const mid = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 1;
    let t1 = '', t2 = '';
    if (target.terms && target.terms.length > 0) {
      const a1: any[] = [], a2: any[] = [];
      target.terms.forEach(t => { (t.start || target.start_time) < ct ? a1.push(t) : a2.push(t); });
      t1 = buildTextFromTerms(a1); t2 = buildTextFromTerms(a2);
    } else if (target.text) {
      const ratio = (ct - target.start_time) / (target.end_time - target.start_time);
      const si = Math.floor(target.text.length * ratio);
      let sp = target.text.lastIndexOf(' ', si);
      if (sp === -1) sp = si;
      t1 = target.text.substring(0, sp).trim(); t2 = target.text.substring(sp).trim();
    }
    const upd = [...filtered, { ...target, id: mid, end_time: ct, text: t1, terms: [] }, { ...target, id: mid + 1, start_time: ct, text: t2, terms: [] }].sort((a, b) => a.start_time - b.start_time);
    setSegments(upd); pushToHistory(upd); setActiveSegmentId(mid);
  };

  const deleteSegment = (id: number) => {
    const upd = segments.filter(s => s.id !== id);
    setSegments(upd); pushToHistory(upd);
    if (activeSegmentId === id) setActiveSegmentId(null);
  };

  const handleFieldChange = (id: number, fields: Partial<Segment>) => {
    const upd = segments.map(s => s.id === id ? { ...s, ...fields } : s);
    setSegments(upd); triggerAutoSave(upd);
  };
  const handleFieldBlur = () => { pushToHistory(segments); forceSave(); };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vf = fd.get('videoFile') as File;
    const jf = fd.get('jsonFile') as File;
    if (vf && vf.size > 0) {
      const localUrl = URL.createObjectURL(vf);
      setVideoUrl(localUrl);
      try {
        const projects = await api.listProjects().catch(() => []);
        const pid = projects.length > 0 ? projects[0].id : 1;
        const uploaded = await api.uploadMedia(pid, vf);
        if (uploaded?.id) setCurrentMediaId(uploaded.id);
      } catch {}
    }
    if (jf && jf.size > 0) {
      const text = await jf.text();
      const parsed = parseGeckoJson(JSON.parse(text));
      setSegments(parsed);
    }
    setShowWelcomeModal(false);
  };

  const handleSendToReview = () => {
    if (segments.length === 0) { alert('Нельзя отправить пустую разметку!'); return; }
    setShowChecklist(true);
  };

  const confirmSendToReview = async () => {
    const nr: ReviewRequest = { id: Date.now(), user: user?.name || '', timestamp: new Date().toLocaleTimeString(), status: 'PENDING', segmentCount: segments.length, segmentsSnapshot: JSON.parse(JSON.stringify(segments)) };
    setReviewRequests(prev => [nr, ...prev]); setProjectStatus('REVIEW');
    setShowChecklist(false);
    try {
      let tid = currentTaskId;
      if (!tid) {
        const projects = await api.listProjects().catch(() => []);
        const pid = projects.length > 0 ? projects[0].id : 1;
        const verifierRoleId = 4;
        const verifierList = await api.listUsers().catch(() => []);
        const verifier = verifierList.find((u: any) => u.role_id === verifierRoleId);
        const task = await api.createTask({
          project_id: pid,
          media_file_id: currentMediaId || undefined,
          assignee_id: user?.id || undefined,
          verifier_id: verifier?.id || undefined,
          priority: 'Medium',
        });
        tid = task?.id;
        setCurrentTaskId(tid || null);
      }
      if (tid) {
        await api.importSegments(tid, segments.map(s => ({
          start_time: s.start_time, end_time: s.end_time,
          text: s.text, is_crosstalk: s.is_crosstalk, speaker_id: null,
        })));
        await api.updateTask(tid, { status: 'On Review' });
      }
    } catch (err) { console.error('Review submit error:', err); }
    alert('Проект отправлен на проверку.');
  };

  const handleExport = () => {
    const geckoFormat = {
      version: '2.0',
      projectStatus: projectStatus,
      exportedAt: new Date().toISOString(),
      monologues: segments.map(s => ({
        start: s.start_time, end: s.end_time,
        speaker: { id: s.speaker, name: speakers.find(sp => sp.id === s.speaker)?.name || s.speaker },
        text: s.text, crosstalk: s.is_crosstalk,
        terms: s.terms,
      })),
    };
    const blob = new Blob([JSON.stringify(geckoFormat, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gecko_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleInspectRequest = (req: ReviewRequest) => {
    setCurrentInspectedRequestId(req.id); setSegments(req.segmentsSnapshot);
    setProjectStatus('REVIEW'); setShowWelcomeModal(false);
    setScreen(user?.role === 'Verifier' ? 'VERIFIER_WORKSPACE' : 'TRANSCRIBER_WORKSPACE');
  };

  const handleResolveRequest = async (st: 'APPROVED' | 'REJECTED', comment?: string) => {
    if (!currentInspectedRequestId && !currentTaskId) return;
    if (currentInspectedRequestId) {
      setReviewRequests(prev => prev.map(r => r.id === currentInspectedRequestId ? { ...r, status: st, segmentsSnapshot: segments } : r));
    }
    setProjectStatus(st === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS');
    try {
      if (currentTaskId) {
        await api.verifyTask(currentTaskId, {
          task_id: currentTaskId,
          decision: st === 'APPROVED' ? 'accepted' : 'rejected',
          comment: comment || user?.name || '',
        });
      }
    } catch {}
    alert(st === 'APPROVED' ? 'Разметка одобрена!' : 'Разметка возвращена на доработку.');
    if (user?.role === 'Verifier') {
      setScreen('VERIFIER_WORKSPACE'); setSegments([]); setCurrentTaskId(null); setCurrentInspectedRequestId(null); setVideoUrl(null);
    } else {
      setScreen('ADMIN_DASHBOARD');
    }
    setCurrentInspectedRequestId(null);
  };

  const startResizeX = (e: React.MouseEvent) => { e.preventDefault(); const hm = (ev: MouseEvent) => { const p = (ev.clientX / window.innerWidth) * 100; if (p > 20 && p < 80) setMainSplitX(p); }; const hu = () => { window.removeEventListener('mousemove', hm); window.removeEventListener('mouseup', hu); }; window.addEventListener('mousemove', hm); window.addEventListener('mouseup', hu); };
  const startResizeLeftY = (e: React.MouseEvent) => { e.preventDefault(); const hm = (ev: MouseEvent) => { const p = (ev.clientY / window.innerHeight) * 100; if (p > 15 && p < 85) setLeftSplitY(p); }; const hu = () => { window.removeEventListener('mousemove', hm); window.removeEventListener('mouseup', hu); }; window.addEventListener('mousemove', hm); window.addEventListener('mouseup', hu); };
  const startResizeRightY = (e: React.MouseEvent) => { e.preventDefault(); const hm = (ev: MouseEvent) => { const p = (ev.clientY / window.innerHeight) * 100; if (p > 15 && p < 85) setRightSplitY(p); }; const hu = () => { window.removeEventListener('mousemove', hm); window.removeEventListener('mouseup', hu); }; window.addEventListener('mousemove', hm); window.addEventListener('mouseup', hu); };

  const activeSegment = segments.find(s => s.id === activeSegmentId);
  const thToggle = () => handleThemeChange(theme.color, !darkMode);

  const tc = (dark: boolean) => dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = (dark: boolean) => dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
  const inp = (dark: boolean) => dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900';
  const btn = (dark: boolean) => dark
    ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700'
    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm';
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

  if (screen === 'LOGIN') {
    return (
      <div className={`h-screen w-screen flex items-center justify-center font-sans transition-colors ${tc(darkMode)}`}>
        <div className={`p-8 rounded-2xl border w-full max-w-sm shadow-2xl transition-all ${card(darkMode)}`}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black tracking-tight text-indigo-500">Gecko Next</h1>
            <p className="text-xs opacity-50 mt-1">Сервис аудио-/видеоразметки</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] uppercase font-bold block mb-1 opacity-60">Email</label>
              <input type="text" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@gecko.local" className={`w-full text-sm p-2 rounded-lg border focus:outline-none ${inp(darkMode)}`} />
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold block mb-1 opacity-60">Пароль</label>
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="admin" className={`w-full text-sm p-2 rounded-lg border focus:outline-none ${inp(darkMode)}`} />
            </div>
            {authError && <p className="text-xs text-red-500 font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-indigo-600 py-2 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors">Войти</button>
          </form>
          <p className="text-[10px] opacity-30 text-center mt-4">admin@gecko.local / admin</p>
        </div>
      </div>
    );
  }

  if (screen === 'ADMIN_DASHBOARD') {
    return <AdminDashboard darkMode={darkMode} userList={userList} reviewRequests={reviewRequests} onToggleTheme={thToggle} onLogout={handleLogout} onCreateUser={handleCreateUser} addUsername={addEmail} setAddUsername={setAddEmail} addPassword={addPassword} setAddPassword={setAddPassword} addName={addName} setAddName={setAddName} addRole={addRole} setAddRole={setAddRole} onInspectRequest={handleInspectRequest} onToggleUserStatus={handleToggleUserStatus} />;
  }
  if (screen === 'SUPERVISOR_DASHBOARD') return <SupervisorDashboard darkMode={darkMode} onToggleTheme={thToggle} onLogout={handleLogout} />;
  if (screen === 'ML_ENGINEER_DASHBOARD') return <MLEngineerDashboard darkMode={darkMode} onToggleTheme={thToggle} onLogout={handleLogout} />;
  if (screen === 'CUSTOMER_DASHBOARD') return <CustomerDashboard darkMode={darkMode} onToggleTheme={thToggle} onLogout={handleLogout} />;
  if (screen === 'VERIFIER_WORKSPACE') {
    if (segments.length === 0 && !currentTaskId) {
      const localReviews = reviewRequests.filter(r => r.status === 'PENDING');
      const mergedTasks = [
        ...localReviews.map(r => ({ _type: 'local', id: r.id, user: r.user, timestamp: r.timestamp, segmentCount: r.segmentCount, segmentsSnapshot: r.segmentsSnapshot })),
        ...verifierTasks.map((t: any) => ({ _type: 'api', ...t })),
      ];
      return (
        <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${tc(darkMode)}`}>
          <header className={`flex justify-between items-center mb-4 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div>
              <h1 className="text-xl font-black tracking-tight text-emerald-500">Панель Верификатора</h1>
              <p className="text-xs opacity-50">Выберите задачу для проверки</p>
            </div>
            <div className="flex gap-2">
              <ThemeSelector theme={theme} onChangeTheme={handleThemeChange} />
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg">Выйти</button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            <button
              onClick={async () => {
                setVerifierLoading(true);
                try {
                  const tasks = await api.listTasks({ status: 'On Review' });
                  setVerifierTasks(tasks);
                } catch { setVerifierTasks([]); }
                setVerifierLoading(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-3 rounded-xl mb-4 transition-colors"
            >
              Загрузить задачи с сервера
            </button>
            {verifierLoading && <div className="text-sm opacity-50">Загрузка...</div>}
            {mergedTasks.length === 0 && !verifierLoading && (
              <div className={`border rounded-xl p-6 text-center ${card(darkMode)}`}>
                <p className="text-sm opacity-50">Нет задач. Отправьте разметку на проверку из редактора.</p>
              </div>
            )}
            <div className="space-y-2">
              {mergedTasks.map((t: any) => (
                <div
                  key={t.id}
                  onClick={async () => {
                    if (t._type === 'local') {
                      const req = reviewRequests.find(r => r.id === t.id);
                      if (req) { setCurrentInspectedRequestId(req.id); setSegments(req.segmentsSnapshot); setProjectStatus('REVIEW'); setShowWelcomeModal(true); setScreen('TRANSCRIBER_WORKSPACE'); }
                    } else {
                      try {
                        setVerifierLoading(true);
                        const segs = await api.getSegments(t.id);
                        const mapped: Segment[] = segs.map((s: any) => ({
                          id: s.id, start_time: s.start_time, end_time: s.end_time,
                          text: s.text || '', is_crosstalk: s.is_crosstalk || false,
                          speaker: 'SPEAKER_00', terms: [],
                        }));
                        setSegments(mapped); setCurrentTaskId(t.id); setCurrentInspectedRequestId(t.id);
                        setProjectStatus('REVIEW');
                        if (t.media_file_id) {
                          const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                            ? 'http://127.0.0.1:8000' : '/api';
                          setVideoUrl(`${base}/media/serve/${t.media_file_id}?token=${encodeURIComponent(getToken() || '')}`);
                          setShowWelcomeModal(false);
                        } else {
                          setShowWelcomeModal(true);
                        }
                        setScreen('TRANSCRIBER_WORKSPACE');
                      } catch { alert('Не удалось загрузить сегменты'); }
                      setVerifierLoading(false);
                    }
                  }}
                  className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center transition-all ${darkMode ? 'bg-black/40 border-gray-800 hover:border-emerald-500' : 'bg-gray-50 border-gray-200 hover:border-emerald-400'}`}
                >
                  <div>
                    <span className="text-sm font-bold">{t._type === 'api' ? `Задача #${t.id}` : `Заявка #${t.id}`}</span>
                    <span className="text-xs opacity-50 ml-2">{t.segmentCount || 0} сегментов</span>
                    {t._type === 'api' && t.assignee && <span className="text-xs opacity-40 ml-2">Разметчик: {t.assignee.full_name}</span>}
                    {t._type === 'local' && <span className="text-xs opacity-40 ml-2">От: {t.user} ({t.timestamp})</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${t._type === 'local' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {t._type === 'local' ? 'Локально' : 'На проверке'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    setScreen('TRANSCRIBER_WORKSPACE');
    return null;
  }

  // --- TRANSCRIBER WORKSPACE ---
  return (
    <div className={`h-screen w-screen flex flex-col p-3 overflow-hidden font-sans select-none transition-colors ${tc(darkMode)}`}>
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <form onSubmit={handleModalSubmit} className={`p-5 rounded-xl max-w-md w-full space-y-4 border ${card(darkMode)}`}>
            <div className="flex justify-between items-center">
              <h2 className="text-md font-bold">Загрузка файлов</h2>
              <button type="button" onClick={() => setShowWelcomeModal(false)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold block mb-1 opacity-50">Видео / Аудио</label>
              <input type="file" name="videoFile" accept="video/*,audio/*" className={`w-full text-xs p-2 rounded border ${inp(darkMode)}`} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold block mb-1 opacity-50">JSON предразметка Gecko</label>
              <input type="file" name="jsonFile" accept=".json" className={`w-full text-xs p-2 rounded border ${inp(darkMode)}`} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold block mb-1 opacity-50">Словарь терминов (CSV/TXT)</label>
              <input type="file" name="dictFile" accept=".csv,.txt" className={`w-full text-xs p-2 rounded border ${inp(darkMode)}`} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 py-2 rounded-lg text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">Открыть дорожку</button>
          </form>
        </div>
      )}

      <header className={`flex justify-between items-center p-3 mb-2 border rounded-xl shrink-0 transition-all ${card(darkMode)}`}>
        <div className="flex items-center space-x-3">
          {user?.role === 'Admin' && (
            <button onClick={() => { setScreen('ADMIN_DASHBOARD'); setVideoUrl(null); setSegments([]); }} className={`border text-xs font-bold px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-amber-400 border-amber-500/20' : 'bg-white hover:bg-gray-50 text-amber-600 border-gray-300'}`}>Дашборд</button>
          )}
          {user?.role === 'Verifier' && (
            <button onClick={() => { setScreen('VERIFIER_WORKSPACE'); setSegments([]); setCurrentTaskId(null); setCurrentInspectedRequestId(null); setVideoUrl(null); }} className={`border text-xs font-bold px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-emerald-400 border-emerald-500/20' : 'bg-white hover:bg-gray-50 text-emerald-600 border-gray-300'}`}>← К задачам</button>
          )}
          <h1 className="text-base font-bold tracking-tight">Gecko Next Editor</h1>
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500/20 text-emerald-400' : saveStatus === 'saving' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
            {saveStatus === 'saved' ? 'Сохранено' : saveStatus === 'saving' ? 'Сохранение...' : 'Не сохранено'}
          </div>
          <div className="text-xs opacity-60">{ROLE_NAMES[user?.role || 'Transcriber']}: <span className="font-bold text-indigo-500">{user?.name}</span></div>
          <button onClick={() => setShowWelcomeModal(true)} className={`text-xs px-3 py-1.5 border rounded-lg ${btn(darkMode)}`}>Загрузить файлы</button>
          <button onClick={() => setShowTermsModal(true)} className={`text-xs px-3 py-1.5 border rounded-lg ${darkMode ? 'bg-gray-800 border-amber-700/50 text-amber-400 hover:bg-gray-700' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'}`}>Термины</button>
          {(user?.role === 'Admin' || user?.role === 'Verifier') && currentInspectedRequestId && (<><button onClick={() => handleResolveRequest('APPROVED')} className="font-bold py-1.5 px-3 text-xs rounded-lg text-white bg-emerald-600 hover:bg-emerald-700">Принять</button><button onClick={() => handleResolveRequest('REJECTED')} className="font-bold py-1.5 px-3 text-xs rounded-lg text-white bg-red-600 hover:bg-red-700">Отклонить</button></>)}
          {segments.length > 0 && (user?.role === 'Admin' || projectStatus === 'COMPLETED') && (<button onClick={handleExport} className="font-bold py-1.5 px-3 text-xs rounded-lg text-white bg-sky-600 hover:bg-sky-700">Экспорт JSON</button>)}
          {projectStatus === 'IN_PROGRESS' && user?.role === 'Transcriber' && (<button onClick={handleSendToReview} className="font-bold py-1.5 px-4 text-xs rounded-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90">Сдать на проверку</button>)}
          {(projectStatus === 'REVIEW' || projectStatus === 'TODO') && user?.role === 'Transcriber' && (<button onClick={handleSendToReview} disabled={segments.length === 0} className={`font-bold py-1.5 px-4 text-xs rounded-lg text-white ${segments.length === 0 ? 'bg-gray-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90'}`}>{projectStatus === 'REVIEW' ? 'Отправить повторно' : 'Сдать на проверку'}</button>)}
          {projectStatus === 'COMPLETED' && (<span className="text-[10px] px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Принята</span>)}
        </div>
        <div className="flex items-center space-x-2">
          <ThemeSelector theme={theme} onChangeTheme={handleThemeChange} />
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">Выйти</button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        {/* LEFT SIDE: Video + Waveform */}
        <div style={{ width: `${mainSplitX}%` }} className="flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
          <div style={{ height: `${leftSplitY}%` }} className={`border rounded-xl flex items-center justify-center overflow-hidden relative ${darkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-gray-900'}`}>
            <video ref={videoPlayerRef} src={videoUrl || undefined} className="w-full h-full object-contain" controls />
          </div>
          <div onMouseDown={startResizeLeftY} className="h-2 cursor-row-resize flex items-center justify-center group shrink-0"><div className="w-20 h-[3px] bg-gray-500/30 group-hover:bg-indigo-500 rounded" /></div>
          <div style={{ height: `${100 - leftSplitY}%` }} className={`p-3 border rounded-xl flex flex-col min-h-0 ${card(darkMode)}`}>
            <div className="flex-1 overflow-y-auto min-h-0"><div ref={waveformRef} className={`rounded-xl p-1 min-h-[120px] ${darkMode ? 'bg-black' : 'bg-gray-50 border border-gray-200'}`} /></div>
            <div className="flex items-center justify-between gap-1 pt-2 shrink-0 flex-wrap">
              <div className="flex items-center space-x-1"><span className="text-[9px] opacity-50">Zoom:</span><input type="range" min="10" max="800" value={zoomLevel} disabled={!isPlayerReady} onChange={e => setZoomLevel(Number(e.target.value))} className="w-20 accent-indigo-600" /></div>
              <div className="flex items-center space-x-0.5">
                <span className="text-[9px] opacity-40 mr-1">Скорость:</span>
                {SPEEDS.map(s => <button key={s} onClick={() => setPlaybackSpeed(s)} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${playbackSpeed === s ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}>{s}x</button>)}
              </div>
              <div className="flex space-x-1.5 items-center">
                <button onClick={handleUndo} disabled={historyIndex <= 0} className={`text-[11px] px-2 py-1 rounded ${historyIndex <= 0 ? 'opacity-30 cursor-not-allowed' : (darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300')}`}>Отмена</button>
                <button onClick={() => wavesurfer.current?.playPause()} className={`text-[11px] px-2 py-1 rounded ${darkMode ? 'bg-indigo-700 text-white hover:bg-indigo-600' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'}`}>Старт/Пауза</button>
                {activeSegment && (<>
                  <button onClick={() => isolatePlayback(activeSegment.start_time, activeSegment.end_time)} className={`text-[11px] px-2 py-1 rounded text-white ${loopSegment ? 'bg-emerald-600' : 'bg-sky-600 hover:bg-sky-500'}`}>{loopSegment ? 'Цикл' : 'Слушать'}</button>
                  <button onClick={() => setLoopSegment(!loopSegment)} className={`text-[11px] px-1.5 py-1 rounded border ${loopSegment ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : (darkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-300 text-gray-500 hover:border-gray-400')}`}>{loopSegment ? '✓' : '↻'}</button>
                  <button onClick={splitCurrentSegment} className="text-[11px] px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white">Разрезать</button>
                  <button onClick={() => deleteSegment(activeSegment.id)} className="text-[11px] px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white">Удалить</button>
                </>)}
              </div>
            </div>
          </div>
        </div>

        <div onMouseDown={startResizeX} className="w-3 cursor-col-resize flex items-center justify-center shrink-0 group"><div className="h-24 w-[3px] bg-gray-500/30 group-hover:bg-indigo-500 rounded" /></div>

        {/* RIGHT SIDE: Segments/AI + Editor */}
        <div style={{ width: `${100 - mainSplitX}%` }} className="flex flex-col h-full min-h-0 overflow-hidden">
          <div style={{ height: `${rightSplitY}%` }} className={`flex flex-col p-3 border rounded-xl min-h-0 ${card(darkMode)}`}>
            <div className="flex items-center gap-1 mb-2 shrink-0">
              <button onClick={() => setRightPanelTab('segments')} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-lg tracking-wider transition-colors ${rightPanelTab === 'segments' ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>Сегменты ({segments.length})</button>
              <button onClick={() => setRightPanelTab('ai')} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-lg tracking-wider transition-colors ${rightPanelTab === 'ai' ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>AI Помощник</button>
            </div>
            {rightPanelTab === 'segments' ? (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {segments.map(s => {
                  const sel = activeSegmentId === s.id;
                  const spk = speakers.find(sp => sp.id === s.speaker);
                  return (
                    <div key={s.id} onClick={() => { setActiveSegmentId(s.id); wavesurfer.current?.setTime(s.start_time); }} className={`p-2 rounded-xl border cursor-pointer flex justify-between font-sans transition-all ${sel ? (darkMode ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-600 bg-indigo-50/70') : (darkMode ? 'border-gray-800 bg-black/40 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100/80')}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center text-[10px] font-mono mb-0.5">
                          <span className="text-indigo-500 font-bold">{s.start_time.toFixed(2)}s – {s.end_time.toFixed(2)}s</span>
                          <span className="font-bold" style={{ color: spk ? `rgb(${spk.color})` : undefined }}>{spk ? spk.name : s.speaker}</span>
                        </div>
                        <p className="text-xs truncate opacity-90">{s.text || <span className="opacity-40 italic">Без текста</span>}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1">
                <AIAssistant segments={segments} activeSegmentId={activeSegmentId} darkMode={darkMode} onJumpToSegment={(id) => { setActiveSegmentId(id); const seg = segments.find(s => s.id === id); if (seg) wavesurfer.current?.setTime(seg.start_time); }} />
              </div>
            )}
          </div>

          <div onMouseDown={startResizeRightY} className="h-2 cursor-row-resize flex items-center justify-center group shrink-0"><div className="w-20 h-[3px] bg-gray-500/30 group-hover:bg-indigo-500 rounded" /></div>

          <div style={{ height: `${100 - rightSplitY}%` }} className={`p-3 border rounded-xl flex flex-col min-h-0 ${card(darkMode)}`}>
            {activeSegment ? (
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center shrink-0">
                  <span className="text-xs font-bold">Спикер #{activeSegment.id}:</span>
                  <select value={activeSegment.speaker} onChange={e => handleFieldChange(activeSegment.id, { speaker: e.target.value })} onBlur={handleFieldBlur} className={`text-xs p-1 border rounded font-mono focus:outline-none ${inp(darkMode)}`}>
                    {speakers.map(spk => <option key={spk.id} value={spk.id}>{spk.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <input type="number" step="0.01" value={activeSegment.start_time} onChange={e => handleFieldChange(activeSegment.id, { start_time: parseFloat(e.target.value) || 0 })} onBlur={handleFieldBlur} className={`w-full border rounded p-1 text-xs text-center font-mono focus:outline-none ${darkMode ? 'border-gray-800 text-white bg-transparent' : 'border-gray-300 text-gray-900 bg-gray-50'}`} />
                  <input type="number" step="0.01" value={activeSegment.end_time} onChange={e => handleFieldChange(activeSegment.id, { end_time: parseFloat(e.target.value) || 0 })} onBlur={handleFieldBlur} className={`w-full border rounded p-1 text-xs text-center font-mono focus:outline-none ${darkMode ? 'border-gray-800 text-white bg-transparent' : 'border-gray-300 text-gray-900 bg-gray-50'}`} />
                </div>
                <textarea value={activeSegment.text} onChange={e => handleFieldChange(activeSegment.id, { text: e.target.value })} onBlur={handleFieldBlur} className={`w-full flex-1 min-h-0 p-2 text-xs resize-none rounded-lg focus:outline-none ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
                <div className="flex items-center shrink-0">
                  <label className={`flex items-center space-x-1 p-1 rounded-lg border cursor-pointer ${darkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    <input type="checkbox" checked={activeSegment.is_crosstalk} onChange={e => { handleFieldChange(activeSegment.id, { is_crosstalk: e.target.checked }); handleFieldBlur(); }} className="cursor-pointer accent-amber-500" />
                    <span className="text-[10px] select-none">Кроссток</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center flex-1 text-center font-sans text-xs border border-dashed rounded-xl p-4 ${darkMode ? 'border-gray-800 text-gray-400 opacity-40' : 'border-gray-300 bg-gray-50/50 text-gray-500'}`}>Выберите блок разметки для редактирования</div>
            )}
          </div>
        </div>
      </div>

      {showTermsModal && <TerminologyModule darkMode={darkMode} onClose={() => setShowTermsModal(false)} />}
      {showChecklist && <CheckListModal darkMode={darkMode} segments={segments} onSend={confirmSendToReview} onCancel={() => setShowChecklist(false)} />}
    </div>
  );
}
