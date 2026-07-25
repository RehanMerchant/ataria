import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';

export default function UserButton() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      clearAuth();
      navigate('/login');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  if (!user) return null;

  const avatarInitial = user.name 
    ? user.name.charAt(0).toUpperCase() 
    : user.email.charAt(0).toUpperCase();
    
  const displayName = user.name || user.email.split('@')[0];

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
  
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center cursor-pointer gap-2 rounded-sm bg-background text-sm text-foreground transition-colors"
        aria-label="User menu"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background-lable text-xs font-bold text-foreground-label">
          {avatarInitial}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-52 origin-top-right overflow-hidden rounded-md border border-background-lable bg-background shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex flex-col space-y-0.5 overflow-hidden leading-none">
              <span className="truncate text-sm text-foreground">
                {displayName}
              </span>
              <span className="truncate text-xs text-foreground-muted">
                {user.email}
              </span>
            </div>
          </div>
          <div className="my-1 h-px bg-background-lable"></div>
          
          <div className="p-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground font-light hover:bg-background-lable transition-colors"
            >
              <UserIcon className="h-5 w-5  text-foreground" />
              Profile
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="flex w-full cursor-pointer font-light items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-background-lable transition-colors"
            >
              <Settings className="h-5 w-5  text-foreground" />
              Settings
            </button>
          </div>
          <div className="my-1 h-px bg-background-lable"></div>
          <div className="p-1">
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-700 hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}