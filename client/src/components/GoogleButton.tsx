import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { api } from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../hooks/useToast';
interface GoogleAuthButtonProps {
  setLoading: (loading: boolean) => void;
  actionText?: 'signin_with' | 'signup_with' | 'continue_with';
}

export default function GoogleAuthButton({
  setLoading,
  actionText = 'continue_with'
}: GoogleAuthButtonProps) {
  
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const toast = useToast();

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setLoading(true);

    try {
      // NOTE: useGoogleLogin returns an access_token, not an ID token (credential).
      const { data } = await api.post('/auth/google', {
        token: tokenResponse.access_token, 
      });
      toast.success("Account verified successfully", "Logging in");
      setAuth(data.data.user);
      navigate('/');
    } catch (err: any) {
      toast.error(
        'Authentication Failed',
        err.response?.data?.message || 'Google authentication failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Initialize the custom Google login hook
  const login = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      toast.error('Google Login Error', 'The popup was closed or failed to load.');
    },
  });

  // Map the actionText prop to readable button text
  const buttonText = {
    signin_with: 'Sign in with Google',
    signup_with: 'Sign up with Google',
    continue_with: 'Continue with Google',
  }[actionText];

  return (
    <div className="flex justify-center w-full">
      <button
        onClick={() => login()}
        type="button"
        className="w-full py-2.5 btn-secondary flex gap-4 text-sm font-medium "
      >

        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {buttonText}
      </button>
    </div>
  );
}