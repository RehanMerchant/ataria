import { useState, useEffect, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import GoogleAuthButton from '../../components/GoogleButton';
import { useToast } from '../../hooks/useToast';
import { ChevronLeft } from 'lucide-react';

type Step = 'email' | 'credentials' | 'otp';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function Login() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const toast = useToast();

  // Combined OTP string for submission
  const otpString = otpValues.join('');

  useEffect(() => {
    if (step === 'credentials') passwordRef.current?.focus();
    if (step === 'otp') {
      // Small timeout ensures the DOM has rendered the new inputs before focusing
      setTimeout(() => otpRefs.current[0]?.focus(), 10);
    }
  }, [step]);

  const handleEmailNext = () => {
    if (!isValidEmail(email)) return;
    setStep('credentials');
  };

  const handlePasswordLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      toast.success("Credentials verified", "Logging in");
      setAuth(data.data.user);
      navigate('/');
    } catch (err: any) {
      toast.error('Login failed', err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/otp/send', { email });
      setStep('otp');
      toast.success('Code sent!', 'Please check your inbox.');
    } catch (err: any) {
      toast.error('Failed to send OTP', err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpString.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, otp: otpString });
      setAuth(data.data.user);
      toast.success("Otp verified successfully", "Logging in");
      navigate('/');
    } catch (err: any) {
      toast.error('Verification failed', err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpValues(Array(6).fill(''));
    setLoading(true);
    try {
      await api.post('/auth/otp/send', { email });
      toast.success('Code resent!', 'A new code has been sent to your email.');
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error('Failed to resend', err.response?.data?.message || 'Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // --- OTP Input Handlers ---
  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtpValues = [...otpValues];
    newOtpValues[index] = digit;
    setOtpValues(newOtpValues);

    // Auto-focus next input if a digit was entered
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      // If the current box is empty, move focus back to the previous box and clear it
      if (!otpValues[index] && index > 0) {
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
      // Highlight the text in the previous box
      setTimeout(() => otpRefs.current[index - 1]?.select(), 0);
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
      setTimeout(() => otpRefs.current[index + 1]?.select(), 0);
    } else if (e.key === 'Enter' && otpString.length === 6) {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtpValues = [...otpValues];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) newOtpValues[i] = pastedData[i];
    }
    setOtpValues(newOtpValues);

    // Focus the last filled input, or the very end
    const focusIndex = Math.min(pastedData.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };
  // --------------------------

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-surface border rounded-sm border-surface-border shadow-soft py-8 px-6">
          <div className="mb-8">
            {step !== 'email' && (
              <button
                onClick={() => setStep(step === 'otp' ? 'credentials' : 'email')}
                className="mb-6 flex items-center gap-0.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft />
                Back
              </button>
            )}

            <h1 className="text-2xl text-foreground font-extralight">
              {step === 'email' && 'Sign in'}
              {step === 'credentials' && 'Welcome back'}
              {step === 'otp' && 'Check your inbox'}
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              {step === 'email' && 'Enter your email to continue.'}
              {step === 'credentials' && <><span className="font-medium text-foreground-muted">{email}</span></>}
              {step === 'otp' && <>We sent a 6-digit code to <span className="font-medium text-foreground-muted">{email}</span>.</>}
            </p>
          </div>

          {step === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-label mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && isValidEmail(email) && handleEmailNext()}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-sm border border-surface-border bg-background text-sm text-foreground placeholder:text-foreground-muted
                             focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition"
                />
              </div>
              <button
                onClick={handleEmailNext}
                disabled={!isValidEmail(email)}
                className="w-full btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-xs text-foreground-muted uppercase font-medium">or</span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>

              <GoogleAuthButton
                setLoading={setLoading}
                actionText="signin_with"
              />
            </div>
          )}

          {step === 'credentials' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-foreground-label mb-1.5">
                    Password
                  </label>
                </div>
                <input
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && password && handlePasswordLogin()}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-sm border border-surface-border bg-background text-sm text-foreground placeholder:text-foreground-muted
                             focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition"
                />
              </div>

              <button
                onClick={handlePasswordLogin}
                disabled={!password || loading}
                className="w-full btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Spinner /> : 'Login'}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-xs text-foreground-muted uppercase font-medium">or</span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-2.5 btn-secondary transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1 5l6.5 4L14 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Login with OTP instead
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-6 animate-fade-in">
              <fieldset disabled={loading}>
                <legend className="sr-only">Enter the 6-digit one-time password</legend>
                <div className="flex justify-between items-center gap-2">
                  {otpValues.map((value, index) => (
                    <input
                      key={index}
                      ref={(el) => { if (el) otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={1}
                      value={value}
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      aria-label={`Digit ${index + 1} of 6`}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-lg font-mono rounded-sm border border-surface-border bg-background text-foreground 
                                 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition disabled:opacity-50"
                    />
                  ))}
                </div>
              </fieldset>

              <button
                onClick={handleVerifyOtp}
                disabled={otpString.length !== 6 || loading}
                className="w-full btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Spinner /> : 'Verify & Sign in'}
              </button>

              <p className="text-center text-xs text-foreground-muted">
                Didn't get the code?{' '}
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-accent-blue hover:underline disabled:opacity-50"
                >
                  Resend
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <svg
      className={`animate-spin size-6 ${dark ? 'text-foreground-muted' : 'text-white'}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}