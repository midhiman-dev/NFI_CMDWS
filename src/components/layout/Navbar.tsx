import { LogOut, User, ChevronDown, Database, Beaker } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18next from '../../i18n';
import { getAuthState, logout, switchRole } from '../../utils/auth';
import { UserRole } from '../../types';
import { useAppContext } from '../../App';

export function Navbar() {
  const navigate = useNavigate();
  const authState = getAuthState();
  const { mode } = useAppContext();
  const { t, i18n } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    setShowMenu(false);
    navigate('/dashboard');
  };

  const handleLanguageChange = (lang: string) => {
    i18next.changeLanguage(lang);
    localStorage.setItem('nfi_lang', lang);
    setShowLangMenu(false);
  };

  const roleLabels: Record<UserRole, string> = {
    hospital_spoc: t('roles.hospital_spoc'),
    intake_reviewer: t('roles.intake_reviewer'),
    verifier: t('roles.verifier'),
    committee_member: t('roles.committee_member'),
    accounts: t('roles.accounts'),
    beni_volunteer: t('roles.beni_volunteer'),
    admin: t('roles.admin'),
  };

  return (
    <nav className="bg-[var(--nfi-primary-dark)] text-white shadow-lg sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://www.neonatesfoundationofindia.org/wp-content/uploads/2025/09/nfi-logo.png"
              alt="NFI Logo"
              className="h-10 bg-white px-2 py-1 rounded"
            />
            <div>
              <h1 className="text-xl font-bold">NFI CMDWS</h1>
              <p className="text-xs text-gray-300">Case Management & Document Workflow System</p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                mode === 'DB'
                  ? 'bg-blue-600 text-white'
                  : 'bg-orange-500 text-white'
              }`}
            >
              {mode === 'DB' ? <Database size={14} /> : <Beaker size={14} />}
              <span>Mode: {mode}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium"
              >
                {i18n.language === 'hi' ? 'हिंदी' : 'English'}
              </button>
              {showLangMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        i18n.language === 'en' ? 'bg-[var(--nfi-primary)] text-white' : 'text-gray-700'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => handleLanguageChange('hi')}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        i18n.language === 'hi' ? 'bg-[var(--nfi-primary)] text-white' : 'text-gray-700'
                      }`}
                    >
                      हिंदी
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {authState.activeUser && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="text-right">
                  <p className="text-sm font-medium">{authState.activeUser.fullName}</p>
                  <p className="text-xs text-gray-300">
                    {authState.activeRole ? roleLabels[authState.activeRole] : ''}
                  </p>
                </div>
                <ChevronDown size={16} />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {authState.activeUser.email}
                      </p>
                    </div>

                    {authState.activeUser.roles.length > 1 && (
                      <div className="py-2">
                        <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                          Switch Role
                        </p>
                        {authState.activeUser.roles.map((role) => (
                          <button
                            key={role}
                            onClick={() => handleRoleSwitch(role)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                              role === authState.activeRole ? 'bg-gray-50 text-[var(--nfi-primary)] font-medium' : 'text-gray-700'
                            }`}
                          >
                            <User size={16} />
                            {roleLabels[role]}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-gray-200 py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
