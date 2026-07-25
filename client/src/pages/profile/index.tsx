import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../hooks/useToast';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);

  const canSubmit =
    newPassword.length >= 8 &&
    confirmPassword.length >= 8 &&
    newPassword === confirmPassword;

  const handleUpdatePassword = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.patch('/auth/set-password', { password: newPassword });
      toast.success("Password updated successful")
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('Update failed', err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const avatarInitial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0 mb-4 w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your profile, security preferences, and account integrations.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

     
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-4xl shadow-md mb-4 ring-4 ring-blue-50">
                {avatarInitial}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 w-full truncate">{user.name || 'No name set'}</h2>
              <p className="text-sm text-gray-500 w-full truncate">{user.email}</p>
              
              <div className="mt-4 flex justify-center w-full">
                <Badge color="blue">User</Badge>
              </div>
            </div>
          </div>


          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <h2 className="text-lg font-semibold text-gray-900">Security & Authentication</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Update your password to ensure your account remains secure.
                </p>
              </div>

              <div className="max-w-md space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleUpdatePassword()}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleUpdatePassword()}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400
                                focus:outline-none focus:ring-2 transition
                                ${confirmPassword && newPassword !== confirmPassword
                                  ? 'border-red-300 focus:ring-red-500/30 focus:border-red-500'
                                  : 'border-gray-200 focus:ring-blue-500/30 focus:border-blue-500'}`}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M6 4v2.5M6 8h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      Passwords don't match
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleUpdatePassword}
                    disabled={!canSubmit || loading}
                    className="py-2.5 px-6 rounded-lg text-sm font-medium transition-all
                               bg-blue-600 text-white hover:bg-blue-700
                               disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
                  >
                    {loading ? <Spinner /> : 'Update password'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: 'blue' | 'green'; children: React.ReactNode }) {
  const styles = {
    blue:  'bg-blue-50 text-blue-700 border border-blue-200',
    green: 'bg-green-50 text-green-700 border border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}