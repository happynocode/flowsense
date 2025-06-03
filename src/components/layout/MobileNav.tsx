
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu, Home, FileText, Settings, User, LogOut, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const MobileNav = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  const closeNav = () => setOpen(false);

  if (!user) return null;

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="glass border border-cyan-500/30 hover:border-cyan-400 text-white">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 glass-strong border-r border-cyan-500/30">
          <div className="flex flex-col h-full">
            <div className="flex items-center space-x-3 pb-6 border-b border-cyan-500/20">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="text-white h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold gradient-text">Daily Digest</span>
                <p className="text-xs text-gray-400">AI Platform</p>
              </div>
            </div>
            
            <nav className="flex-1 space-y-2 py-6">
              <Link
                to="/"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive('/') 
                    ? 'glass-strong border border-cyan-400 text-cyan-400 shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5 hover:border hover:border-cyan-500/30'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Neural Hub</span>
              </Link>
              
              <Link
                to="/sources"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive('/sources') 
                    ? 'glass-strong border border-cyan-400 text-cyan-400 shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5 hover:border hover:border-cyan-500/30'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Data Sources</span>
              </Link>
              
              <Link
                to="/digests"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive('/digests') 
                    ? 'glass-strong border border-cyan-400 text-cyan-400 shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5 hover:border hover:border-cyan-500/30'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>AI Digests</span>
              </Link>
              
              <Link
                to="/subscription"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive('/subscription') 
                    ? 'glass-strong border border-cyan-400 text-cyan-400 shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5 hover:border hover:border-cyan-500/30'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Neural Settings</span>
              </Link>
            </nav>

            <div className="border-t border-cyan-500/20 pt-4 mt-auto">
              <div className="glass p-3 rounded-xl mb-3 border border-cyan-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full flex items-center justify-center border border-cyan-500/30">
                    <User className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                  closeNav();
                }}
                className="w-full justify-start px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-400/30 rounded-xl"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect Neural Link
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;
