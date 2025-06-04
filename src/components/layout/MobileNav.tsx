
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu, Home, FileText, Settings, User, LogOut, Brain } from 'lucide-react';
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
          <Button variant="ghost" size="sm" className="glass-card border-0 text-starlight hover:glow-blue">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-midnight/95 backdrop-blur-xl border-white/10">
          <div className="flex flex-col h-full">
            <div className="flex items-center space-x-3 pb-6">
              <div className="w-10 h-10 bg-cosmic-gradient rounded-xl flex items-center justify-center glow-purple">
                <Brain className="w-6 h-6 text-starlight" />
              </div>
              <span className="text-xl font-space-grotesk font-bold text-starlight">Neural Hub</span>
            </div>
            
            <nav className="flex-1 space-y-3">
              <Link
                to="/"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive('/') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                <Home className="h-5 w-5" />
                <span>Command Center</span>
              </Link>
              
              <Link
                to="/sources"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive('/sources') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Data Sources</span>
              </Link>
              
              <Link
                to="/digests"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive('/digests') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Neural Digests</span>
              </Link>
              
              <Link
                to="/subscription"
                onClick={closeNav}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive('/subscription') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>Power Level</span>
              </Link>
            </nav>

            <div className="border-t border-white/10 pt-4 mt-auto">
              <div className="flex items-center space-x-3 px-4 py-3 mb-3">
                <div className="w-10 h-10 bg-aurora-gradient rounded-full flex items-center justify-center glow-teal">
                  <span className="text-sm font-bold text-midnight">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-starlight truncate">{user.name}</p>
                  <p className="text-xs text-lunar-grey truncate">{user.email}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                  closeNav();
                }}
                className="w-full justify-start px-4 text-nebula-pink hover:text-nebula-pink hover:bg-nebula-pink/10 hover:glow-pink"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;
