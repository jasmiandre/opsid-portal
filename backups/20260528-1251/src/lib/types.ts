// Centralised types — single source of truth.
export type AppKey = 'mail' | 'cloud' | 'erp' | 'auth';

export interface User {
  username: string;
  name: string;
  email: string;
  dept: string;
  role: 'Staff' | 'Manager' | 'Admin';
  status: 'active' | 'inactive';
}

export interface Tenant {
  domain: string;
  company: string;
  color: string;
  status: 'active' | 'pending';
  users: number;
  ssl: 'valid' | 'pending';
  realm: string;
}

export interface VM {
  name: string;
  role: string;
  ip: string;
  status?: string;
  cpu: number;
  ram: number;
  disk?: number;
  load?: number;
  net?: number;
}

export interface KcProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isTenantAdmin: boolean;
  organizationSlug: string;
  tenantName: string;
  tenantId: number | null;
  tenantDomain: string;
  planNextcloudGb: number;
  planEmailGb: number;
  planOdooGb: number;
}

export type Scene = 'landing' | 'dashboard' | 'admin' | 'apps' | 'drive' | 'mail' | 'calendar' | 'tasks' | 'activity';
export type DashTab = 'dashboard' | 'profile' | 'settings';
export type AdminTab = 'users' | 'tenants' | 'tenant-profile' | 'health' | 'audit';
