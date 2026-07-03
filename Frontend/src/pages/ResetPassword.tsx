import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordStrengthChecklist, { getPasswordChecks, passwordChecksPass } from '../components/PasswordStrengthChecklist';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const auth = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = passwordChecksPass(getPasswordChecks(newPassword)) && passwordsMatch && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;
    setIsSubmitting(true);
    try {
      await auth.resetPassword({ token, newPassword });
      showToast('success', 'Password updated. Please sign in.');
      navigate('/signin');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex text-text-primary antialiased">
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-low overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between p-section-gap h-full text-primary">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-gutter">
                <span className="material-symbols-outlined text-[32px] text-tertiary-container">health_and_safety</span>
                <span className="font-headline-md text-headline-md tracking-tight">HealthWise AI</span>
              </Link>
            </div>
            <div className="max-w-md">
              <h2 className="font-display-lg text-display-lg mb-gutter leading-tight">Set a new password.</h2>
              <p className="font-body-lg text-body-lg text-text-secondary">
                Choose a strong password to keep your health data secure.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-background relative">
          <div className="absolute top-margin-mobile left-margin-mobile lg:hidden flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-tertiary-container">health_and_safety</span>
              <span className="font-headline-md text-headline-md tracking-tight">HealthWise AI</span>
            </Link>
          </div>

          <div className="w-full max-w-[440px] bg-card-bg rounded-[24px] p-gutter md:p-section-gap shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/30 relative z-10">
            <div className="text-center mb-section-gap">
              <h1 className="font-headline-lg text-headline-lg mb-2">Reset Your Password</h1>
              <p className="font-body-md text-body-md text-text-secondary">Enter a new password for your account</p>
            </div>

            {!token ? (
              <div className="text-center space-y-4">
                <p className="font-body-md text-body-md text-error">
                  This reset link is invalid or incomplete. Please request a new one.
                </p>
                <Link to="/signin" className="text-primary font-label-md hover:text-primary/80 transition-colors">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form className="space-y-gutter" onSubmit={handleSubmit}>
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">New Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">Confirm New Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>

                <PasswordStrengthChecklist password={newPassword} confirmPassword={confirmPassword} showConfirmMatch />

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-xl py-3.5 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
