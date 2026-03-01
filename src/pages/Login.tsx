import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockStore } from '../store/mockStore';
import { login, isAuthenticated } from '../utils/auth';
import { User, UserRole } from '../types';
import { NfiButton } from '../components/design-system/NfiButton';
import { NfiCard } from '../components/design-system/NfiCard';
import { APP_NAME } from '../constants/branding';

export function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    setUsers(mockStore.getUsers());
  }, []);

  const handleUserChange = (userId: string) => {
    const user = users.find((u) => u.userId === userId);
    setSelectedUser(user || null);
    if (user) {
      setSelectedRole(user.roles[0]);
    }
  };

  const handleLogin = () => {
    if (selectedUser && selectedRole) {
      login(selectedUser, selectedRole);
      navigate('/dashboard');
    }
  };

  const roleLabels: Record<UserRole, string> = {
    hospital_spoc: t('roles.hospital_spoc'),
    clinical: t('roles.clinical'),
    clinical_reviewer: t('roles.clinical'),
    hospital_doctor: t('roles.clinical'),
    verifier: t('roles.verifier'),
    committee_member: t('roles.committee_member'),
    accounts: t('roles.accounts'),
    beni_volunteer: t('roles.beni_volunteer'),
    admin: t('roles.admin'),
    leadership: t('roles.leadership'),
  };

  const roleHierarchy: UserRole[] = [
    'admin',
    'leadership',
    'committee_member',
    'verifier',
    'clinical_reviewer',
    'hospital_doctor',
    'clinical',
    'hospital_spoc',
    'accounts',
    'beni_volunteer',
  ];

  const getPrimaryRole = (roles: UserRole[]): UserRole => {
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }
    return roles[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <NfiCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://www.neonatesfoundationofindia.org/wp-content/uploads/2025/09/nfi-logo.png"
            alt="NFI Logo"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-[var(--nfi-text)]">{APP_NAME}</h1>
          <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
            Case Management & Document Workflow System
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">
              {t('login.selectUser')}
            </label>
            <select
              value={selectedUser?.userId || ''}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.fullName} — {roleLabels[getPrimaryRole(user.roles)]}
                </option>
              ))}
            </select>
          </div>

          {selectedUser && selectedUser.roles.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">
                {t('login.role')}
              </label>
              <select
                value={selectedRole || ''}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              >
                {selectedUser.roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <NfiButton
            onClick={handleLogin}
            disabled={!selectedUser || !selectedRole}
            className="w-full"
          >
            {t('login.login')}
          </NfiButton>

          <div className="text-center pt-4 border-t border-[var(--nfi-border)]">
            <p className="text-xs text-[var(--nfi-text-secondary)]">
              Demo mode: Select any user to login
            </p>
          </div>
        </div>
      </NfiCard>
    </div>
  );
}
