import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';

export interface NavTab {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
}

export interface NavGroup {
  heading: string;
  tabs: NavTab[];
}

interface Props {
  groups: NavGroup[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function CaseDetailNav({ groups, activeTab, onChange }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <MobileTrigger
        onOpen={() => setDrawerOpen(true)}
      />
      <MobileDrawer
        groups={groups}
        activeTab={activeTab}
        open={drawerOpen}
        onChange={(id) => { onChange(id); setDrawerOpen(false); }}
        onClose={() => setDrawerOpen(false)}
      />
      <DesktopRail
        groups={groups}
        activeTab={activeTab}
        onChange={onChange}
      />
    </>
  );
}

function MobileTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Open navigation"
      className="lg:hidden flex items-center justify-center w-9 h-9 bg-white border border-[#E5E7EB] rounded-lg text-[#156C78] hover:bg-gray-50 transition-colors"
    >
      <Menu size={18} />
    </button>
  );
}

function MobileDrawer({
  groups,
  activeTab,
  open,
  onChange,
  onClose,
}: Props & { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-200 ease-out lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <span className="text-sm font-semibold text-[#111827]">Navigation</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X size={18} className="text-[#6B7280]" />
          </button>
        </div>
        <nav className="py-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 52px)' }}>
          {groups.map(group => (
            <NavGroupList
              key={group.heading}
              group={group}
              activeTab={activeTab}
              onChange={onChange}
            />
          ))}
        </nav>
      </div>
    </>
  );
}

function DesktopRail({ groups, activeTab, onChange }: Props) {
  return (
    <nav className="hidden lg:flex flex-col w-56 shrink-0 border-r border-[#E5E7EB] bg-[#F9FAFB] overflow-y-auto">
      <div className="py-4 space-y-5">
        {groups.map(group => (
          <NavGroupList
            key={group.heading}
            group={group}
            activeTab={activeTab}
            onChange={onChange}
          />
        ))}
      </div>
    </nav>
  );
}

function NavGroupList({
  group,
  activeTab,
  onChange,
}: {
  group: NavGroup;
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
        {group.heading}
      </p>
      <div className="space-y-0.5 px-2">
        {group.tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2 text-[13px] rounded-md transition-all relative
                ${isActive
                  ? 'bg-[#156C78] text-white font-semibold shadow-sm'
                  : 'text-[#4B5563] hover:bg-[#E5E7EB]/60 hover:text-[#111827]'
                }
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[4px] rounded-r-sm bg-[#F08225]" />
              )}
              <span className={`shrink-0 w-5 h-5 flex items-center justify-center ${isActive ? 'text-white' : 'text-[#6B7280]'}`}>
                {tab.icon}
              </span>
              <span className="flex-1 text-left truncate">{tab.label}</span>
              {tab.count != null && (
                <span className={`text-[11px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-medium ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E5E7EB] text-[#6B7280]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
