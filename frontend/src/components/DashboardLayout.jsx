import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  UploadCloud, 
  TrendingUp, 
  GitCompare, 
  LogOut, 
  Activity,
  Menu,
  X,
  User
} from "lucide-react";

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard Overview", href: "/", icon: LayoutDashboard },
    { name: "Upload Report", href: "/upload", icon: UploadCloud },
    { name: "Parameter Trends", href: "/trends", icon: TrendingUp },
    { name: "Compare Reports", href: "/compare", icon: GitCompare },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#070a13] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-20 border-r border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center px-6 gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">AuraMed</span>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">AI Explainer</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout in Sidebar */}
        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-slate-950/40 border border-slate-800/30 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.username || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-all duration-200"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-64 h-full">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-slate-850 bg-slate-950/20 backdrop-blur-md z-10 md:px-8">
          <div className="flex items-center md:hidden">
            {/* Logo on mobile */}
            <Activity className="h-6 w-6 text-cyan-400 mr-2" />
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">AuraMed</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/30 uppercase tracking-wider">
              College Project Mode
            </span>
          </div>

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* User profile dropdown indicator on desktop */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-slate-400">Welcome, <strong className="text-slate-200 font-semibold">{user?.username}</strong></span>
            <div className="h-8 w-8 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-xs uppercase">
              {user?.username ? user.username.substring(0, 2) : "US"}
            </div>
          </div>
        </header>

        {/* Mobile Slide-out Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Overlay */}
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            
            {/* Menu Drawer */}
            <div className="relative flex flex-col w-64 max-w-xs bg-slate-900 border-r border-slate-850 p-5 z-50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Activity className="h-6 w-6 text-cyan-400" />
                  <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">AuraMed</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-850">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : "text-slate-400 hover:bg-slate-800/40"
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-slate-850 pt-4 mt-auto">
                <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-slate-950/40 border border-slate-850 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-200 truncate">{user?.username}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto bg-slate-950/20 p-6 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
