import React from 'react';
import { UserRole, ROLE_NAMES } from '../types';

interface Props {
  darkMode: boolean;
  userList: { id: number; full_name: string; email: string; role: { name: string }; status: string }[];
  reviewRequests: any[];
  onToggleTheme: () => void;
  onLogout: () => void;
  onCreateUser: (e: React.FormEvent) => void;
  addUsername: string; setAddUsername: (v: string) => void;
  addPassword: string; setAddPassword: (v: string) => void;
  addName: string; setAddName: (v: string) => void;
  addRole: UserRole; setAddRole: (v: UserRole) => void;
  onInspectRequest: (req: any) => void;
  onToggleUserStatus: (id: number, status: string) => void;
}

export default function AdminDashboard({
  darkMode, userList, reviewRequests, onToggleTheme, onLogout,
  onCreateUser, addUsername, setAddUsername, addPassword, setAddPassword,
  addName, setAddName, addRole, setAddRole, onInspectRequest, onToggleUserStatus,
}: Props) {
  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
  const inputBg = darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900';
  const mutedBg = darkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`h-screen w-screen p-6 flex flex-col font-sans transition-colors ${bg}`}>
      <header className={`flex justify-between items-center mb-6 border-b pb-4 transition-colors ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className="text-xl font-black tracking-tight text-amber-500">Панель Администратора</h1>
          <p className="text-xs opacity-50">Управление пользователями, ролями и задачами</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onToggleTheme} className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</button>
          <button onClick={onLogout} className="bg-red-600/20 text-red-500 border border-red-500/30 text-xs px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">Выйти</button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        <div className={`col-span-2 border rounded-2xl p-4 flex flex-col min-h-0 transition-all ${card}`}>
          <h3 className="text-sm font-bold text-emerald-500 mb-3">Поступившие пулы на верификацию</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {reviewRequests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-xs">
                <span className="text-2xl mb-1">—</span> Нет активных заявок.
              </div>
            ) : (
              reviewRequests.map((req: any) => (
                <div key={req.id} className={`p-4 border rounded-xl flex justify-between items-center transition-all ${darkMode ? 'bg-black/40 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-sm">{req.user}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        req.status === 'PENDING' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                        req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {req.status === 'PENDING' ? 'ОЖИДАЕТ' : req.status === 'APPROVED' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}
                      </span>
                    </div>
                    <p className="text-xs opacity-50 font-mono mt-1">Дата: {req.timestamp} | Сегментов: {req.segmentCount}</p>
                  </div>
                  <button onClick={() => onInspectRequest(req)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors">Проверить</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col space-y-4 transition-all ${card}`}>
          <form onSubmit={onCreateUser} className={`p-4 rounded-xl border space-y-3 transition-colors ${darkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-bold text-indigo-500 text-xs uppercase tracking-wider">Зарегистрировать пользователя</h4>
            <input required placeholder="ФИО" value={addName} onChange={e => setAddName(e.target.value)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
            <input required placeholder="Email" type="email" value={addUsername} onChange={e => setAddUsername(e.target.value)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
            <input required placeholder="Пароль" type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`} />
            <select value={addRole} onChange={e => setAddRole(e.target.value as UserRole)} className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none ${inputBg}`}>
              <option value="Admin">Администратор</option>
              <option value="Supervisor">Супервайзер</option>
              <option value="Transcriber">Разметчик</option>
              <option value="Verifier">Верификатор</option>
              <option value="ML Engineer">ML-инженер</option>
              <option value="Customer">Заказчик</option>
            </select>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">Создать</button>
          </form>

          <div className={`flex-1 rounded-xl border p-3 overflow-y-auto space-y-1 transition-colors ${mutedBg}`}>
            <h5 className="text-[10px] uppercase font-bold opacity-40 tracking-wider mb-2">Пользователи ({userList.length})</h5>
            {userList.map(u => (
              <div key={u.id} className={`flex justify-between items-center p-2 border rounded font-mono text-xs transition-colors ${darkMode ? 'bg-black/50 border-gray-900' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-bold">{u.full_name}</div>
                  <div className="text-[10px] opacity-50 truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    u.role.name === 'Admin' ? 'bg-amber-500/20 text-amber-500' :
                    u.role.name === 'Supervisor' ? 'bg-purple-500/20 text-purple-500' :
                    u.role.name === 'Verifier' ? 'bg-emerald-500/20 text-emerald-500' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>{u.role.name}</span>
                  <button
                    onClick={() => onToggleUserStatus(u.id, u.status === 'blocked' ? 'active' : 'blocked')}
                    className={`text-[9px] px-1 py-0.5 rounded border ${u.status === 'blocked' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}
                  >
                    {u.status === 'blocked' ? 'Разбл.' : 'Активен'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
