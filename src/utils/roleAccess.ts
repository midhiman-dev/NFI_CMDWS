import type { AuthState, Case, UserRole } from '../types';

type RouteRoleMap = Record<string, UserRole[]>;

const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  hospital_spoc: '/dashboard',
  verifier: '/cases',
  clinical: '/cases',
  clinical_reviewer: '/cases',
  hospital_doctor: '/cases',
  committee_member: '/cases',
  beni_volunteer: '/cases',
  accounts: '/reports/accounts-mis-daily',
  leadership: '/reports/leadership-monthly',
  admin: '/admin/users',
};

export const ROUTE_ACCESS: RouteRoleMap = {
  '/dashboard': ['hospital_spoc', 'clinical', 'clinical_reviewer', 'hospital_doctor', 'verifier', 'committee_member', 'beni_volunteer', 'accounts', 'leadership', 'admin'],
  '/cases': ['hospital_spoc', 'clinical', 'clinical_reviewer', 'hospital_doctor', 'verifier', 'committee_member', 'beni_volunteer', 'accounts', 'admin'],
  '/cases/new': ['hospital_spoc', 'admin'],
  '/cases/:caseId/wizard': ['hospital_spoc', 'admin'],
  '/cases/:caseId': ['hospital_spoc', 'clinical', 'clinical_reviewer', 'hospital_doctor', 'verifier', 'committee_member', 'beni_volunteer', 'accounts', 'admin'],
  '/reports': ['accounts', 'leadership', 'admin'],
  '/reports/runs': ['accounts', 'leadership', 'admin'],
  '/reports/hospital-mis-monthly': ['accounts', 'leadership', 'admin'],
  '/reports/daily-mis-programs': ['accounts', 'leadership', 'admin'],
  '/reports/leadership-monthly': ['leadership', 'admin'],
  '/reports/accounts-mis-daily': ['accounts', 'admin'],
  '/finance/inputs': ['accounts', 'admin'],
  '/admin/users': ['admin'],
  '/admin/masters/hospitals': ['admin'],
  '/admin/masters/hospital-process-map': ['admin'],
  '/admin/masters/document-types': ['admin'],
  '/admin/templates/document-requirements': ['admin'],
  '/admin/templates/followup-metrics': ['admin'],
  '/admin/bgrc-cycles': ['admin'],
  '/admin/data-health': ['admin'],
  '/admin/exports/beneficiary-master': ['admin'],
  '/admin/exports/rejection-master': ['admin'],
  '/admin/reporting': ['admin'],
  '/admin/reporting/kpi-catalog': ['admin'],
  '/admin/reporting/dataset-registry': ['admin'],
  '/admin/reporting/template-registry': ['admin'],
  '/admin/reporting/template-bindings': ['admin'],
  '/admin/reporting/report-runs': ['admin'],
};

export function getResolvedActiveRole(authState: AuthState): UserRole | null {
  if (!authState.activeUser) return null;
  if (authState.activeRole && authState.activeUser.roles.includes(authState.activeRole)) {
    return authState.activeRole;
  }
  return authState.activeUser.roles[0] ?? null;
}

export function getDefaultRouteForRole(role: UserRole | null): string {
  if (!role) return '/login';
  return ROLE_DEFAULT_ROUTE[role] || '/dashboard';
}

export function getDefaultRouteForAuth(authState: AuthState): string {
  return getDefaultRouteForRole(getResolvedActiveRole(authState));
}

export function canAccessRoute(role: UserRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function normalizeHospitalId(value?: string | null): string | null {
  if (!value) return null;
  return value.toLowerCase().replace(/[_\s]/g, '-');
}

export function getScopedHospitalId(authState: AuthState): string | null {
  const role = getResolvedActiveRole(authState);
  if (role !== 'hospital_spoc') return null;
  return normalizeHospitalId(authState.activeUser?.hospitalId);
}

export function isCaseVisibleToAuth(authState: AuthState, caseHospitalId?: string | null): boolean {
  const scopedHospitalId = getScopedHospitalId(authState);
  if (!scopedHospitalId) return true;
  return normalizeHospitalId(caseHospitalId) === scopedHospitalId;
}

export function filterCasesForAuth<T extends Pick<Case, 'hospitalId'>>(authState: AuthState, cases: T[]): T[] {
  const scopedHospitalId = getScopedHospitalId(authState);
  if (!scopedHospitalId) return cases;
  return cases.filter((c) => normalizeHospitalId(c.hospitalId) === scopedHospitalId);
}
