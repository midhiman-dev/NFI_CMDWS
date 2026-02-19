import { AuthState, User, UserRole } from '../types';

const AUTH_KEY = 'nfi_cmdws_auth';

export function getAuthState(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
  }
  return { activeUser: null, activeRole: null };
}

export function setAuthState(state: AuthState): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving auth state:', error);
  }
}

export function login(user: User, role: UserRole): void {
  setAuthState({ activeUser: user, activeRole: role });
}

export function logout(): void {
  setAuthState({ activeUser: null, activeRole: null });
}

export function switchRole(role: UserRole): void {
  const state = getAuthState();
  if (state.activeUser && state.activeUser.roles.includes(role)) {
    setAuthState({ ...state, activeRole: role });
  }
}

export function isAuthenticated(): boolean {
  const state = getAuthState();
  return state.activeUser !== null && state.activeRole !== null;
}

export function hasRole(role: UserRole): boolean {
  const state = getAuthState();
  return state.activeRole === role;
}

export function hasAnyRole(roles: UserRole[]): boolean {
  const state = getAuthState();
  return state.activeRole !== null && roles.includes(state.activeRole);
}
