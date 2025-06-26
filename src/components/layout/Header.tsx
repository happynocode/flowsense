import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { LogOut, Settings, User, Brain } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-space-grotesk font-bold text-gray-800">FlowSense</span>
          </Link>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/sources"
                className={`nav-item ${
                  isActive('/sources') ? 'nav-item-active' : ''
                }`}
              >
                Sources
              </Link>
              <Link
                to="/digests"
                className={`nav-item ${
                  isActive('/digests') ? 'nav-item-active' : ''
                }`}
              >
                Digests
              </Link>
              <Link
                to="/subscription"
                className={`nav-item ${
                  isActive('/subscription') ? 'nav-item-active' : ''
                }`}
              >
                Subscription
              </Link>
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative w-10 h-10 rounded-full hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all duration-200">
                    <Avatar className="w-10 h-10 border-2 border-blue-200">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <button className="btn-primary">
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
