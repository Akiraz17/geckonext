const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

export const api = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me(): Promise<LoginResponse['user']> {
    return request('/auth/me');
  },

  listUsers(): Promise<UserOut[]> {
    return request('/users');
  },

  createUser(data: { full_name: string; email: string; password: string; role_id: number }): Promise<UserOut> {
    return request('/users', { method: 'POST', body: JSON.stringify(data) });
  },

  updateUser(id: number, data: Record<string, any>): Promise<UserOut> {
    return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteUser(id: number): Promise<null> {
    return request(`/users/${id}`, { method: 'DELETE' });
  },

  listRoles(): Promise<{ id: number; name: string }[]> {
    return request('/roles');
  },

  // Projects
  listProjects(): Promise<any[]> {
    return request('/projects');
  },
  createProject(data: { name: string; description?: string; customer?: string; deadline?: string }): Promise<any> {
    return request('/projects', { method: 'POST', body: JSON.stringify(data) });
  },
  updateProject(id: number, data: Record<string, any>): Promise<any> {
    return request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteProject(id: number): Promise<null> {
    return request(`/projects/${id}`, { method: 'DELETE' });
  },

  // Tasks
  listTasks(): Promise<any[]> {
    return request('/tasks');
  },
  getTask(id: number): Promise<any> {
    return request(`/tasks/${id}`);
  },
  createTask(data: { project_id: number; media_file_id?: number; assignee_id?: number; verifier_id?: number; priority?: string }): Promise<any> {
    return request('/tasks', { method: 'POST', body: JSON.stringify(data) });
  },
  updateTask(id: number, data: Record<string, any>): Promise<any> {
    return request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Segments
  getSegments(taskId: number): Promise<any[]> {
    return request(`/tasks/${taskId}/segments`);
  },
  updateSegment(id: number, data: Record<string, any>): Promise<any> {
    return request(`/segments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  importSegments(taskId: number, data: any[]): Promise<any> {
    return request(`/tasks/${taskId}/segments/import`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Comments
  getComments(taskId: number): Promise<any[]> {
    return request(`/tasks/${taskId}/comments`);
  },
  addComment(taskId: number, data: { task_id: number; segment_id?: number; text: string }): Promise<any> {
    return request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Verification
  verifyTask(taskId: number, data: { task_id: number; decision: string; score?: number; comment?: string }): Promise<any> {
    return request(`/tasks/${taskId}/verify`, { method: 'POST', body: JSON.stringify(data) });
  },
  getVerifications(taskId: number): Promise<any[]> {
    return request(`/tasks/${taskId}/verifications`);
  },

  // Media
  listMedia(projectId: number): Promise<any[]> {
    return request(`/projects/${projectId}/media`);
  },
};
