import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordStrengthChecklist, { getPasswordChecks, passwordChecksPass } from './PasswordStrengthChecklist';
import GoogleAuthButton from './GoogleAuthButton';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

export default function RegistrationModal({ isOpen, onClose, onSwitchToSignIn }: RegistrationModalProps) {
  const auth = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const emailLooksValid = EMAIL_PATTERN.test(email);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    fullName.trim().length > 0 &&
    address.trim().length > 0 &&
    emailLooksValid &&
    passwordChecksPass(getPasswordChecks(password)) &&
    passwordsMatch &&
    agreedToTerms &&
    !isSubmitting;

  const resetForm = () => {
    setFullName('');
    setAddress('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAgreedToTerms(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await auth.register({ fullName: fullName.trim(), address: address.trim(), email: email.trim(), password, agreedToTerms });
      resetForm();
      onClose();
      navigate('/onboarding');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-margin-mobile" onClick={handleClose}>
      <div
        className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto bg-card-bg rounded-[24px] p-gutter md:p-section-gap shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-gutter">
          <h1 className="font-headline-lg text-headline-lg mb-2">Create Your Account</h1>
          <p className="font-body-md text-body-md text-text-secondary">
            Join HealthWise AI to receive personalized health assessments and clinical insights.
          </p>
        </div>

        <form className="space-y-gutter" onSubmit={handleSubmit}>
          <div>
            <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">Full Name</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                person
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-text-tertiary text-xl">
                location_on
              </span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Medical Plaza, Suite 400"
                rows={2}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
              />
            </div>
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@medicalcenter.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
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
            <div className="mt-2">
              <PasswordStrengthChecklist password={password} />
            </div>
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">Confirm Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                lock
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <div className="mt-2">
              <PasswordStrengthChecklist password={password} confirmPassword={confirmPassword} showConfirmMatch />
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="font-label-sm text-label-sm text-text-secondary">I agree to Terms & Privacy Policy</span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-xl py-3.5 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-gutter">
          <div className="flex-1 h-px bg-outline-variant/30"></div>
          <span className="font-label-sm text-label-sm text-text-tertiary">Or continue with</span>
          <div className="flex-1 h-px bg-outline-variant/30"></div>
        </div>

        <GoogleAuthButton />

        <p className="text-center mt-gutter font-body-md text-body-md text-text-secondary">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              resetForm();
              onSwitchToSignIn();
            }}
            className="text-primary font-label-md hover:text-primary/80 transition-colors"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
