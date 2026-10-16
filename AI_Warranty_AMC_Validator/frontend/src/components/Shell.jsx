import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  HardDrive,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
  CalendarClock,
  Building2,
  BarChart3,
  History,
  Settings,
  Bell,
  Search,
  LogOut,
  ShieldAlert,
  Users,
  LineChart,
  ListTodo,
  Lightbulb,
  Briefcase,
  UserCheck
} from 'lucide-react';

export default function Shell({ children, user, onLogout, notifications = [] }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const role = user?.role || 'User';
  const isAdmin = role === 'Administrator';
  const isManager = role === 'Contract Manager';
  const isUser = role === 'User';

  // Navigation configurations based on role
  let navItems = [];

  if (isUser) {
    // Role 3: User navigation
    navItems = [
      { path: '/user-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { path: '/assets', label: 'My Hardware Assets', icon: HardDrive },
      { path: '/documents', label: 'My Documents', icon: FileText },
      { path: '/my-cases', label: 'My Review Cases', icon: Briefcase },
      { path: '/suggestions', label: 'Recommendations', icon: Lightbulb },
      { path: '/renewals', label: 'Warranty Expirations', icon: CalendarClock },
    ];
  } else if (isManager) {
    // Role 2: Manager navigation
    navItems = [
      { path: '/manager-dashboard', label: 'Manager Command Center', icon: LayoutDashboard },
      { path: '/manager/users', label: 'My Assigned Users', icon: Users },
      { path: '/my-cases', label: 'Case Reviews Queue', icon: Briefcase },
      { path: '/suggestions', label: 'Suggestions & Advisory', icon: Lightbulb },
      { path: '/assets', label: 'All Managed Assets', icon: HardDrive },
      { path: '/documents', label: 'Document Library', icon: FileText },
      { path: '/contracts', label: 'Contract Manager', icon: FileSpreadsheet },
      { path: '/renewals', label: 'Renewal Pipeline', icon: CalendarClock },
      { path: '/my-work', label: 'Tasks & Workflow', icon: ListTodo },
    ];
  } else {
    // Role 1 & Default: Administrator / Global nav (Clean, streamlined)
    navItems = [
      { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      { path: '/assets', label: 'Asset Register', icon: HardDrive },
      { path: '/documents', label: 'Document Library', icon: FileText },
      { path: '/my-cases', label: 'All Review Cases', icon: Briefcase },
      { path: '/suggestions', label: 'All Suggestions', icon: Lightbulb },
      { path: '/validation', label: 'Validation Engine', icon: CheckCircle2 },
      { path: '/contracts', label: 'Contract Manager', icon: FileSpreadsheet },
      { path: '/renewals', label: 'Renewal Pipeline', icon: CalendarClock },
      { path: '/audit-logs', label: 'Audit Trail', icon: History },
    ];
  }

  // Admin exclusive governance navigation
  const adminNav = [
    { path: '/admin/user-requests', label: 'User Requests & Assignments', icon: UserCheck },
    { path: '/admin/users', label: 'User & Role Management', icon: Users },
    { path: '/admin/managers', label: 'Manager Monitoring', icon: LineChart },
    { path: '/admin/tasks', label: 'Task Assignments', icon: ListTodo },
    { path: '/settings', label: 'Validation Rules & System', icon: Settings },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/assets?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      {/* Collapsible Left Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 select-none shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
            IQ
          </div>
          <div>
            <div className="text-white font-semibold text-base leading-tight tracking-tight">WarrantyIQ</div>
            <div className="text-slate-400 text-xs font-mono">
              {isAdmin ? 'Admin Console' : isManager ? 'Manager Console' : 'User Portal'}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {/* Main workspace section */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {isUser ? 'My Workspace' : isManager ? 'Manager Workflow' : 'Operations'}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Administrator Governance Section */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                Administration
              </div>
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-slate-900/60 border border-slate-800/80">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-xs font-medium truncate">{user?.full_name || 'System Operator'}</div>
              <div className="text-slate-400 text-[11px] truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {user?.role || 'User'}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Logout session"
              className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-80 md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assets by serial, tag, model, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder-slate-400 transition"
            />
          </form>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-md shadow-lg py-2 z-30">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">System Alerts</span>
                    <span className="text-xs text-blue-600 font-medium">{unreadCount} Active</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">No active alerts.</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-slate-50 transition">
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            {n.title}
                          </div>
                          <div className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-800">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500">{user?.role} • {user?.department || 'Operations'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
