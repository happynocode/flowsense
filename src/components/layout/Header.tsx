
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
    <header className="bg-midnight/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-cosmic-gradient rounded-xl flex items-center justify-center glow-purple transition-all duration-300 group-hover:scale-110">
              <Brain className="w-6 h-6 text-starlight" />
            </div>
            <span className="text-xl font-space-grotesk font-bold text-starlight">Neural Hub</span>
          </Link>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isActive('/') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                Command Center
              </Link>
              <Link
                to="/sources"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isActive('/sources') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                Data Sources
              </Link>
              <Link
                to="/digests"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isActive('/digests') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                Neural Digests
              </Link>
              <Link
                to="/subscription"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isActive('/subscription') 
                    ? 'text-electric-blue bg-electric-blue/10 glow-blue' 
                    : 'text-lunar-grey hover:text-starlight hover:bg-white/5'
                }`}
              >
                Power Level
              </Link>
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:glow-blue">
                    <Avatar className="h-10 w-10 border-2 border-electric-blue/30">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-cosmic-gradient text-starlight font-bold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-midnight/95 backdrop-blur-xl border-white/10" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-starlight">{user.name}</p>
                      <p className="text-xs leading-none text-lunar-grey">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild className="text-lunar-grey hover:text-starlight hover:bg-white/5 cursor-pointer">
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Neural Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-lunar-grey hover:text-starlight hover:bg-white/5 cursor-pointer">
                    <Link to="/subscription">
                      <Settings className="mr-2 h-4 w-4" />
                      Power Level
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={logout} className="text-nebula-pink hover:text-nebula-pink hover:bg-nebula-pink/10 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button className="btn-cosmic">Neural Interface</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
