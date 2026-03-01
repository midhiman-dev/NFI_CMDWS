import { LogOut, User, ChevronDown, Database, Beaker, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18next from '../../i18n';
import { getAuthState, logout, switchRole } from '../../utils/auth';
import { UserRole } from '../../types';
import { useAppContext } from '../../App';
import { APP_NAME } from '../../constants/branding';

const ENABLE_DB_MODE = import.meta.env.VITE_ENABLE_DB_MODE === 'true';

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
              <h1 className="text-xl font-bold truncate max-w-[320px]">{APP_NAME}</h1>
              <p className="text-xs text-gray-300">Case Management & Document Workflow System</p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold group relative ${
                !ENABLE_DB_MODE
                  ? 'bg-slate-600 text-white'
                  : mode === 'DB'
                  ? 'bg-blue-600 text-white'
                  : 'bg-orange-500 text-white'
              }`}
              title={!ENABLE_DB_MODE ? 'Database mode disabled (pilot demo)' : undefined}
            >
              {!ENABLE_DB_MODE ? (
                <AlertCircle size={14} />
              ) : mode === 'DB' ? (
                <Database size={14} />
              ) : (
                <Beaker size={14} />
              )}
              <span>
                {!ENABLE_DB_MODE ? 'Demo Only' : `Mode: ${mode}`}
              </span>
              {!ENABLE_DB_MODE && (
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
                  Database mode disabled (pilot demo)
                </div>
              )}
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
