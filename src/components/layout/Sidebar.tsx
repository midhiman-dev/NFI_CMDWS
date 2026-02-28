import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  Users,
  Building2,
  FileText,
  Download,
  BarChart3,
  Settings,
  Menu,
  X,
  DollarSign,
  LineChart,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAuthState } from '../../utils/auth';
import { UserRole } from '../../types';

interface MenuItemConfig {
  id: string;
  to: string;
  labelKey: string;
  roles: UserRole[];
}

const mainMenuConfig: MenuItemConfig[] = [
  {
    id: 'dashboard',
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    roles: ['hospital_spoc', 'clinical', 'verifier', 'committee_member', 'accounts', 'beni_volunteer', 'admin', 'leadership'],
  },
  {
    id: 'cases',
    to: '/cases',
    labelKey: 'nav.cases',
    roles: ['hospital_spoc', 'clinical', 'verifier', 'committee_member', 'accounts', 'beni_volunteer', 'admin', 'leadership'],
  },
  {
    id: 'new-case',
    to: '/cases/new',
    labelKey: 'nav.newCase',
    roles: ['hospital_spoc', 'admin'],
  },
  {
    id: 'reports',
    to: '/reports',
    labelKey: 'nav.reports',
    roles: ['accounts', 'admin', 'leadership'],
  },
  {
    id: 'finance-inputs',
    to: '/finance/inputs',
    labelKey: 'nav.financeInputs',
    roles: ['accounts', 'admin'],
  },
];

const adminMenuConfig: MenuItemConfig[] = [
  {
    id: 'users',
    to: '/admin/users',
    labelKey: 'nav.users',
    roles: ['admin'],
  },
  {
    id: 'hospitals',
    to: '/admin/masters/hospitals',
    labelKey: 'nav.hospitals',
    roles: ['admin'],
  },
  {
    id: 'hospital-process-map',
    to: '/admin/masters/hospital-process-map',
    labelKey: 'nav.hospitalProcessMap',
    roles: ['admin'],
  },
  {
    id: 'templates',
    to: '/admin/templates/document-requirements',
    labelKey: 'nav.templates',
    roles: ['admin'],
  },
  {
    id: 'exports',
    to: '/admin/exports/beneficiary-master',
    labelKey: 'nav.exports',
    roles: ['admin'],
  },
  {
    id: 'reporting-admin',
    to: '/admin/reporting',
    labelKey: 'nav.reportingAdmin',
    roles: ['admin'],
  },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const authState = getAuthState();
  const userRole = authState.activeRole;
  const { t } = useTranslation();

  const iconMap: Record<string, React.ReactNode> = {
    'dashboard': <LayoutDashboard size={20} />,
    'cases': <FolderOpen size={20} />,
    'new-case': <PlusCircle size={20} />,
    'reports': <BarChart3 size={20} />,
    'finance-inputs': <DollarSign size={20} />,
    'users': <Users size={20} />,
    'hospitals': <Building2 size={20} />,
    'hospital-process-map': <Building2 size={20} />,
    'templates': <FileText size={20} />,
    'exports': <Download size={20} />,
    'reporting-admin': <LineChart size={20} />,
  };

  const filteredMenuItems = mainMenuConfig.filter((item) => userRole && item.roles.includes(userRole));
  const filteredAdminItems = adminMenuConfig.filter((item) => userRole && item.roles.includes(userRole));

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-4 left-4 z-50 bg-[var(--nfi-primary)] text-white p-3 rounded-full shadow-lg hover:bg-[var(--nfi-primary-dark)] transition-colors"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-[var(--nfi-border)] z-40
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64 flex flex-col
        `}
      >
        <div className="flex-1 overflow-y-auto nfi-scrollbar py-6 pb-20">
          <nav className="space-y-1 px-3">
            {filteredMenuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[var(--nfi-primary)] text-white'
                      : 'text-[var(--nfi-text)] hover:bg-gray-100'
                  }`
                }
              >
                {iconMap[item.id] || <FileText size={20} />}
                <span className="font-medium">{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          {filteredAdminItems.length > 0 && (
            <>
              <div className="px-7 py-4">
                <div className="flex items-center gap-2 text-[var(--nfi-text-secondary)]">
                  <Settings size={16} />
                  <span className="text-xs font-semibold uppercase">Administration</span>
                </div>
              </div>

              <nav className="space-y-1 px-3">
                {filteredAdminItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[var(--nfi-primary)] text-white'
                          : 'text-[var(--nfi-text)] hover:bg-gray-100'
                      }`
                    }
                  >
                    {iconMap[item.id] || <FileText size={20} />}
                    <span className="font-medium">{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
