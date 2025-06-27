import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu, FileText, Settings, User, LogOut, Brain } from 'lucide-react';
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
          <Button variant="ghost" size="sm" className="bg-white border-gray-200 shadow-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="w-72 bg-white border-r border-gray-200 shadow-xl"
        >
          <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-6 border-b border-gray-200 bg-white">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-sm">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-space-grotesk font-bold text-gray-900">FlowSense</span>
            </div>
            
            {/* Navigation Menu */}
            <nav className="flex-1 space-y-2 py-6 bg-white">
              <Link
                to="/sources"
                onClick={closeNav}
                className={`mobile-nav-item ${
                  isActive('/sources') ? 'mobile-nav-active' : ''
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Data Sources</span>
              </Link>
              
              <Link
                to="/digests"
                onClick={closeNav}
                className={`mobile-nav-item ${
                  isActive('/digests') ? 'mobile-nav-active' : ''
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Smart Digests</span>
              </Link>
              
              <Link
                to="/subscription"
                onClick={closeNav}
                className={`mobile-nav-item ${
                  isActive('/subscription') ? 'mobile-nav-active' : ''
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>Power Level</span>
              </Link>
            </nav>

            {/* User Section */}
            <div className="border-t border-gray-200 pt-4 mt-auto bg-white">
              <div className="flex items-center space-x-3 px-4 py-3 mb-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user.email}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                  closeNav();
                }}
                className="w-full justify-start px-4 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
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
