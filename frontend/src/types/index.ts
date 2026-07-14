import React from 'react';

export type UserRole = 'Admin' | 'Supervisor' | 'Transcriber' | 'Verifier' | 'ML Engineer' | 'Customer';
export type AppScreen = 'LOGIN' | 'ADMIN_DASHBOARD' | 'SUPERVISOR_DASHBOARD' | 'TRANSCRIBER_WORKSPACE' | 'VERIFIER_WORKSPACE' | 'ML_ENGINEER_DASHBOARD' | 'CUSTOMER_DASHBOARD';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  roleId: number;
}

export interface Segment {
  id: number;
  start_time: number;
  end_time: number;
  text: string;
  is_crosstalk: boolean;
  speaker: string;
  terms: { text: string; type: string; start?: number; end?: number }[];
  isLocked?: boolean;
}

export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface ReviewRequest {
  id: number;
  user: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  segmentCount: number;
  segmentsSnapshot: Segment[];
  comment?: string;
}

export interface VerificationComment {
  id: number;
  segmentId: number;
  text: string;
  author: string;
  timestamp: string;
  resolved: boolean;
}

export const ROLES: UserRole[] = ['Admin', 'Supervisor', 'Transcriber', 'Verifier', 'ML Engineer', 'Customer'];

export const ROLE_NAMES: Record<UserRole, string> = {
  'Admin': 'Администратор',
  'Supervisor': 'Супервайзер',
  'Transcriber': 'Разметчик',
  'Verifier': 'Верификатор',
  'ML Engineer': 'ML-инженер',
  'Customer': 'Заказчик',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  'Admin': 'Управление пользователями, проектами, настройками и правами доступа',
  'Supervisor': 'Контроль проекта, распределение задач, аналитика качества',
  'Transcriber': 'Разметка аудио/видео: редактирование сегментов и текста',
  'Verifier': 'Проверка разметки, замечания, приёмка или возврат на доработку',
  'ML Engineer': 'Доступ к выгрузкам, версиям данных, статистике ошибок',
  'Customer': 'Просмотр отчётов и статуса проекта без права редактирования',
};

export function getRoleHomeScreen(role: UserRole): AppScreen {
  switch (role) {
    case 'Admin': return 'ADMIN_DASHBOARD';
    case 'Supervisor': return 'SUPERVISOR_DASHBOARD';
    case 'Transcriber': return 'TRANSCRIBER_WORKSPACE';
    case 'Verifier': return 'VERIFIER_WORKSPACE';
    case 'ML Engineer': return 'ML_ENGINEER_DASHBOARD';
    case 'Customer': return 'CUSTOMER_DASHBOARD';
  }
}
