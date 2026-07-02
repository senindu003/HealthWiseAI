import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Thin wrapper shared by SignIn and RegistrationModal so the Google Identity Services
// wiring (button rendering, ID token hand-off, error toast) lives in exactly one place.
export default function GoogleAuthButton() {
  const auth = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      showToast('error', 'Google sign-in failed. Please try again.');
      return;
    }
    try {
      await auth.loginWithGoogle({ idToken: credentialResponse.credential });
      navigate('/onboarding');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="w-full flex justify-center [&>div]:w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => showToast('error', 'Google sign-in failed. Please try again.')}
        width="100%"
        text="continue_with"
      />
    </div>
  );
}
