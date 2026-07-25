// import { useState, useEffect, useRef } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { api } from '../../api/axios';
// import { useAuthStore } from '../../store/useAuthStore';
// import GoogleAuthButton from '../../components/GoogleButton';
// import { useToast } from '../../hooks/useToast';

// type Step = 'form' | 'otp';

// const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// export default function Register() {
//   const [step, setStep] = useState<Step>('form');
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [otp, setOtp] = useState('');
//   const [loading, setLoading] = useState(false);

//   const otpRef = useRef<HTMLInputElement>(null);
//   const navigate = useNavigate();
//   const setAuth = useAuthStore((s) => s.setAuth);
//   const toast = useToast();

//   const canSubmitForm = name.trim().length >= 2 && isValidEmail(email);

//   useEffect(() => {
//     if (step === 'otp') otpRef.current?.focus();
//   }, [step]);

//   const handleSendOtp = async () => {
//     if (!canSubmitForm) return;
//     setLoading(true);
//     try {
//       await api.post('/auth/otp/send', { email });
//       setStep('otp');
//       toast.success('Code sent!', 'Please check your inbox.');
//     } catch (err: any) {
//       toast.error('Failed to send OTP', err.response?.data?.message || 'Please try again later.');
//     } finally {
//       setLoading(false);
//       setOtp('')
//     }
//   };

//   const handleRegister = async () => {
//     if (otp.length !== 6) return;
//     setLoading(true);
//     try {
//       const { data } = await api.post('/auth/register', { name, email, otp });
//       toast.success('Registration successful', 'Logging in');
//       setAuth(data.data.user);
//       navigate('/');
//     } catch (err: any) {
//       toast.error('Registration failed', err.response?.data?.message || 'Something went wrong.');
//     } finally {
//       setLoading(false);
//       setOtp('');
//       setEmail("");
//       setName("")
//     }
//   };

//   const handleResendOtp = async () => {
//     setOtp('');
//     setLoading(true);
//     try {
//       await api.post('/auth/otp/send', { email });
//       toast.success('Code resent!', 'A new code has been sent to your email.');
//     } catch (err: any) {
//       toast.error('Failed to resend', err.response?.data?.message || 'Please try again later.');
//     } finally {
//       setLoading(false);
//       setOtp('');
//       setEmail("");
//       setName("")
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
//       <div className="w-full max-w-sm">

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

//           <div className="mb-8">
//             {step === 'otp' && (
//               <button
//                 onClick={() => setStep('form')}
//                 className="mb-6 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
//               >
//                 <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//                   <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                 </svg>
//                 Back
//               </button>
//             )}

//             <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
//               {step === 'form' ? 'Create account' : 'Verify your email'}
//             </h1>
//             <p className="mt-1.5 text-sm text-gray-500">
//               {step === 'form'
//                 ? 'Fill in your details to get started.'
//                 : <>We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.</>
//               }
//             </p>
//           </div>

//           {step === 'form' && (
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Full name
//                 </label>
//                 <input
//                   autoFocus
//                   type="text"
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   onKeyDown={(e) => e.key === 'Enter' && canSubmitForm && handleSendOtp()}
//                   placeholder="Alex Johnson"
//                   className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400
//                              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Email address
//                 </label>
//                 <input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   onKeyDown={(e) => e.key === 'Enter' && canSubmitForm && handleSendOtp()}
//                   placeholder="you@example.com"
//                   className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400
//                              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
//                 />
//               </div>

//               <button
//                 onClick={handleSendOtp}
//                 disabled={!canSubmitForm || loading}
//                 className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
//                            bg-blue-600 text-white hover:bg-blue-700
//                            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
//                            flex items-center justify-center gap-2"
//               >
//                 {loading ? <Spinner /> : 'Continue'}
//               </button>

//               <div className="flex items-center gap-3">
//                 <div className="flex-1 h-px bg-gray-100" />
//                 <span className="text-xs text-gray-400">or</span>
//                 <div className="flex-1 h-px bg-gray-100" />
//               </div>


//               <GoogleAuthButton
//                 setLoading={setLoading}
//                 actionText="signup_with"
//               />

//             </div>
//           )}

//           {step === 'otp' && (
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Verification code
//                 </label>
//                 <input
//                   ref={otpRef}
//                   type="text"
//                   inputMode="numeric"
//                   maxLength={6}
//                   value={otp}
//                   onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
//                   onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleRegister()}
//                   placeholder="000000"
//                   className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400
//                              tracking-[0.3em] text-center font-mono
//                              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
//                 />
//               </div>

//               <button
//                 onClick={handleRegister}
//                 disabled={otp.length !== 6 || loading}
//                 className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
//                            bg-blue-600 text-white hover:bg-blue-700
//                            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
//                            flex items-center justify-center gap-2"
//               >
//                 {loading ? <Spinner /> : 'Create account'}
//               </button>

//               <p className="text-center text-xs text-gray-400">
//                 Didn't get the code?{' '}
//                 <button
//                   onClick={handleResendOtp}
//                   disabled={loading}
//                   className="text-blue-600 hover:underline disabled:opacity-50"
//                 >
//                   Resend
//                 </button>
//               </p>
//             </div>
//           )}
//         </div>

//         <p className="mt-5 text-center text-sm text-gray-400">
//           Already have an account?{' '}
//           <Link to="/login" className="text-blue-600 hover:underline">
//             Sign in
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// }

// export function Spinner({ dark = false }: { dark?: boolean }) {
//   return (
//     <svg
//       className={`animate-spin h-4 w-4 ${dark ? 'text-gray-500' : 'text-white'}`}
//       viewBox="0 0 24 24"
//       fill="none"
//     >
//       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
//       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
//     </svg>
//   );
// }