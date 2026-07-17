const API_BASE = window.location.protocol === 'file:' 
  ? 'http://127.0.0.1:8000'
  : '/api';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    role_id: number;
    role: { id: number; name: string; permissions: string | null };
    status: string;
    created_at: string;
  };
}

export interface UserOut {
  id: number;
  full_name: string;
  email: string;
  role_id: number;
  role: { id: number; name: string };
  status: string;
}

let cachedToken: string | null = null;

export function setToken(token: string | null) {
  cachedToken = token;
  if (token) {
    localStorage.setItem('gecko_token', token);
  } else {
    localStorage.removeItem('gecko_token');
  }
}

export function getToken(): string | null {
  if (!cachedToken) {
    cachedToken = localStorage.getItem('gecko_token');
  }
  return cachedToken;
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = Array.isArray(err.detail)
      ? err.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
      : (err.detail || `HTTP ${res.status}`);
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function requestBlob(path: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.blob();
}

export const api = {
  // Auth
  login(email: string, password: string): Promise<LoginResponse> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  me(): Promise<LoginResponse['user']> {
    return request('/auth/me');
  },
  register(data: { full_name: string; email: string; password: string; role_id: number }): Promise<UserOut> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  },

  // Users
  listUsers(): Promise<UserOut[]> { return request('/users'); },
  getUser(id: number): Promise<UserOut> { return request(`/users/${id}`); },
  createUser(data: { full_name: string; email: string; password: string; role_id: number }): Promise<UserOut> {
    return request('/users', { method: 'POST', body: JSON.stringify(data) });
  },
  updateUser(id: number, data: Record<string, any>): Promise<UserOut> {
    return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteUser(id: number): Promise<null> { return request(`/users/${id}`, { method: 'DELETE' }); },

  // Roles
  listRoles(): Promise<{ id: number; name: string }[]> { return request('/roles'); },

  // Audit
  listAuditLogs(): Promise<any[]> { return request('/audit'); },

  // Projects
  listProjects(): Promise<any[]> { return request('/projects'); },
  getProject(id: number): Promise<any> { return request(`/projects/${id}`); },
  createProject(data: { name: string; description?: string; customer?: string; deadline?: string }): Promise<any> {
    return request('/projects', { method: 'POST', body: JSON.stringify(data) });
  },
  updateProject(id: number, data: Record<string, any>): Promise<any> {
    return request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteProject(id: number): Promise<null> { return request(`/projects/${id}`, { method: 'DELETE' }); },

  // Tasks
  listTasks(params?: { status?: string; project_id?: number }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status_filter', params.status);
    if (params?.project_id) qs.set('project_id', String(params.project_id));
    const q = qs.toString();
    return request(`/tasks${q ? '?' + q : ''}`);
  },
  getTask(id: number): Promise<any> { return request(`/tasks/${id}`); },
  getTaskStats(id: number): Promise<any> { return request(`/tasks/${id}/stats`); },
  createTask(data: { project_id: number; media_file_id?: number; assignee_id?: number; verifier_id?: number; priority?: string }): Promise<any> {
    return request('/tasks', { method: 'POST', body: JSON.stringify(data) });
  },
  updateTask(id: number, data: Record<string, any>): Promise<any> {
    return request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteTask(id: number): Promise<null> { return request(`/tasks/${id}`, { method: 'DELETE' }); },

  // Segments
  getSegments(taskId: number): Promise<any[]> { return request(`/tasks/${taskId}/segments`); },
  createSegment(taskId: number, data: { start_time: number; end_time: number; text?: string; speaker_id?: number; is_crosstalk?: boolean; confidence?: number }): Promise<any> {
    return request(`/tasks/${taskId}/segments`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateSegment(id: number, data: Record<string, any>): Promise<any> {
    return request(`/segments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteSegment(id: number): Promise<null> { return request(`/segments/${id}`, { method: 'DELETE' }); },
  splitSegment(data: { segment_id: number; split_time: number }): Promise<any> {
    return request('/segments/split', { method: 'POST', body: JSON.stringify(data) });
  },
  mergeSegments(segment_ids: number[]): Promise<any> {
    return request('/segments/merge', { method: 'POST', body: JSON.stringify({ segment_ids }) });
  },
  importSegments(taskId: number, data: any[]): Promise<any> {
    return request(`/tasks/${taskId}/segments/import`, { method: 'POST', body: JSON.stringify(data) });
  },
  exportSegments(taskId: number): Promise<any> { return request(`/tasks/${taskId}/segments/export`); },

  // Comments
  getComments(taskId: number): Promise<any[]> { return request(`/tasks/${taskId}/comments`); },
  addComment(taskId: number, data: { task_id: number; segment_id?: number; text: string }): Promise<any> {
    return request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateComment(id: number, data: { text?: string; status?: string }): Promise<any> {
    return request(`/comments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Verification
  verifyTask(taskId: number, data: { task_id: number; decision: string; score?: number; comment?: string }): Promise<any> {
    return request(`/tasks/${taskId}/verify`, { method: 'POST', body: JSON.stringify(data) });
  },
  getVerifications(taskId: number): Promise<any[]> { return request(`/tasks/${taskId}/verifications`); },

  // Quality Checks
  getQualityChecks(taskId: number): Promise<any[]> { return request(`/tasks/${taskId}/quality-checks`); },
  runQualityChecks(taskId: number): Promise<any> {
    return request(`/tasks/${taskId}/quality-checks`, { method: 'POST' });
  },

  // Speakers
  getSpeakers(taskId: number): Promise<any[]> { return request(`/tasks/${taskId}/speakers`); },
  createSpeaker(taskId: number, data: { original_name: string; display_name?: string; editable?: boolean }): Promise<any> {
    return request(`/tasks/${taskId}/speakers`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateSpeaker(id: number, data: Record<string, any>): Promise<any> {
    return request(`/speakers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteSpeaker(id: number): Promise<null> { return request(`/speakers/${id}`, { method: 'DELETE' }); },

  // Transcripts
  getTranscripts(taskId: number): Promise<any[]> { return request(`/tasks/${taskId}/transcripts`); },
  createTranscript(taskId: number, data: { source_json?: string; current_json?: string }): Promise<any> {
    return request(`/tasks/${taskId}/transcripts`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Terms
  getTerms(projectId: number, params?: { status_filter?: string; type_filter?: string; search?: string }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.status_filter) qs.set('status_filter', params.status_filter);
    if (params?.type_filter) qs.set('type_filter', params.type_filter);
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return request(`/projects/${projectId}/terms${q ? '?' + q : ''}`);
  },
  createTerm(projectId: number, data: { value: string; normalized_value?: string; type?: string; category?: string; comment?: string }): Promise<any> {
    return request(`/projects/${projectId}/terms`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateTerm(id: number, data: Record<string, any>): Promise<any> {
    return request(`/terms/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteTerm(id: number): Promise<null> { return request(`/terms/${id}`, { method: 'DELETE' }); },
  approveTerm(id: number): Promise<any> { return request(`/terms/${id}/approve`, { method: 'POST' }); },
  rejectTerm(id: number): Promise<any> { return request(`/terms/${id}/reject`, { method: 'POST' }); },
  importTerms(projectId: number, data: any[]): Promise<any> {
    return request(`/projects/${projectId}/terms/import`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Media
  listMedia(projectId: number): Promise<any[]> { return request(`/projects/${projectId}/media`); },
  getMedia(id: number): Promise<any> { return request(`/media/${id}`); },
  async uploadMedia(projectId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('project_id', String(projectId));
    formData.append('file', file);
    return request('/media/upload', { method: 'POST', body: formData });
  },
  deleteMedia(id: number): Promise<null> { return request(`/media/${id}`, { method: 'DELETE' }); },

  // Instructions
  async uploadInstruction(projectId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/projects/${projectId}/instruction`, { method: 'POST', body: formData });
  },
  getInstructionUrl(projectId: number): string {
    return `${API_BASE}/projects/${projectId}/instruction/download?token=${encodeURIComponent(getToken() || '')}`;
  },
  deleteInstruction(projectId: number): Promise<null> {
    return request(`/projects/${projectId}/instruction`, { method: 'DELETE' });
  },

  // Export
  exportTask(taskId: number, format: string = 'gecko_json'): Promise<any> {
    return request(`/tasks/${taskId}/export`, { method: 'POST', body: JSON.stringify({ format }) });
  },
  listExports(taskId?: number): Promise<any[]> {
    const qs = taskId ? `?task_id=${taskId}` : '';
    return request(`/exports${qs}`);
  },
  async downloadExport(exportId: number): Promise<Blob> {
    return requestBlob(`/exports/${exportId}/download`);
  },

  // Analytics
  getDashboard(): Promise<any> { return request('/analytics/dashboard'); },
  getProjectAnalytics(projectId: number): Promise<any> { return request(`/analytics/projects/${projectId}`); },
  getUserAnalytics(): Promise<any[]> { return request('/analytics/users'); },
  getQualityAnalytics(): Promise<any> { return request('/analytics/quality'); },
  getTermsAnalytics(): Promise<any> { return request('/analytics/terms'); },
};
