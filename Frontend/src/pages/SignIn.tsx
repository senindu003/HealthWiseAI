import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import RegistrationModal from "../components/RegistrationModal";
import GoogleAuthButton from "../components/GoogleAuthButton";

type ActiveModal = "none" | "register" | "forgot";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { showToast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>("none");

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  useEffect(() => {
    const state = location.state as { openRegister?: boolean } | null;
    if (state?.openRegister) {
      setActiveModal("register");
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await auth.login({ email, password, rememberMe });
      navigate("/onboarding");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotSubmitting(true);
    try {
      await auth.forgotPassword({ email: forgotEmail });
    } catch {
      // Backend already never reveals whether the account exists - treat any failure
      // the same as success so the UI can't leak that information either.
    } finally {
      setIsForgotSubmitting(false);
      setForgotSubmitted(true);
    }
  };

  const closeForgotModal = () => {
    setActiveModal("none");
    setForgotEmail("");
    setForgotSubmitted(false);
  };

  return (
    <div className="bg-background min-h-screen flex text-text-primary antialiased">
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        {/* Left Side: Image Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-low overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt="Medical Illustration"
              className="w-full h-full object-cover opacity-90 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9jThoHnGjpBQSP96Pj5FIi2ddxqws28SmfAkCygVxBjWrgYwJzSkL7J-IjlrMkAFsAYrRK2ECCl503obOHiHHy_e97B2LocG5fHDFWW8wnuGog9BYtsS0EPdwLN_T-FYEIjNxWr7v9QFYbiNLLW_8TEwzIX3gSCu5A9nhq67fOgd9xxnjg-GIp-6tesVVS2ivxytfGj_vDjQwPIk7Rsk8tm_sjRTht_kvBITSERD9yQFqZf9uZBiXOOYWec-UYnoMXm4KDZEa33E"
            />
          </div>
          <div className="relative z-10 flex flex-col justify-between p-section-gap h-full text-primary">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-gutter">
                <span className="material-symbols-outlined text-[32px] text-tertiary-container">
                  health_and_safety
                </span>
                <span className="font-headline-md text-headline-md tracking-tight">
                  HealthWise AI
                </span>
              </Link>
            </div>
            <div className="max-w-md">
              <h2 className="font-display-lg text-display-lg mb-gutter leading-tight">
                Clinical Precision Meets Human Elegance.
              </h2>
              <p className="font-body-lg text-body-lg text-text-secondary">
                Empowering medical professionals with intelligent insights and
                seamless data management.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-background relative">
          {/* Mobile brand header */}
          <div className="absolute top-margin-mobile left-margin-mobile lg:hidden flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-tertiary-container">
                health_and_safety
              </span>
              <span className="font-headline-md text-headline-md tracking-tight">
                HealthWise AI
              </span>
            </Link>
          </div>

          {/* Login card */}
          <div className="w-full max-w-[440px] bg-card-bg rounded-[24px] p-gutter md:p-section-gap shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/30 relative z-10 transition-all duration-300 hover:shadow-[0px_20px_48px_rgba(0,0,0,0.12)]">
            {/* Title */}
            <div className="text-center mb-section-gap">
              <h1 className="font-headline-lg text-headline-lg mb-2">
                Welcome Back
              </h1>
              <p className="font-body-md text-body-md text-text-secondary">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Form */}
            <form className="space-y-gutter" onSubmit={handleSubmit}>
              {/* Email field */}
              <div>
                <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="font-label-sm text-label-sm text-text-secondary">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveModal("forgot")}
                  className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-xl py-3.5 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
                {!isSubmitting && (
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-gutter">
              <div className="flex-1 h-px bg-outline-variant/30"></div>
              <span className="font-label-sm text-label-sm text-text-tertiary">
                Or continue with
              </span>
              <div className="flex-1 h-px bg-outline-variant/30"></div>
            </div>

            {/* Google sign-in button */}
            <GoogleAuthButton />

            {/* Create Account link */}
            <p className="text-center mt-gutter font-body-md text-body-md text-text-secondary">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setActiveModal("register")}
                className="text-primary font-label-md hover:text-primary/80 transition-colors"
              >
                Create Account
              </button>
            </p>
          </div>

          {/* Footer links */}
          <div className="absolute bottom-margin-mobile md:bottom-margin-desktop w-full text-center px-margin-mobile">
            <p className="font-label-sm text-label-sm text-text-tertiary space-x-4">
              <a
                className="hover:text-text-secondary transition-colors"
                href="#"
              >
                Privacy Policy
              </a>
              <span>&bull;</span>
              <a
                className="hover:text-text-secondary transition-colors"
                href="#"
              >
                Terms of Service
              </a>
              <span>&bull;</span>
              <a
                className="hover:text-text-secondary transition-colors"
                href="#"
              >
                Clinical Disclaimers
              </a>
            </p>
          </div>
        </div>
      </div>

      <RegistrationModal
        isOpen={activeModal === "register"}
        onClose={() => setActiveModal("none")}
        onSwitchToSignIn={() => setActiveModal("none")}
      />

      {activeModal === "forgot" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-margin-mobile"
          onClick={closeForgotModal}
        >
          <div
            className="w-full max-w-[440px] bg-card-bg rounded-[24px] p-gutter md:p-section-gap shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-gutter">
              <h1 className="font-headline-lg text-headline-lg mb-2">Reset Password</h1>
              <p className="font-body-md text-body-md text-text-secondary">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {forgotSubmitted ? (
              <div className="text-center space-y-gutter">
                <p className="font-body-md text-body-md text-text-secondary">
                  If an account exists for that email, we&apos;ve sent a reset link.
                </p>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-xl py-3.5 transition-all duration-200"
                >
                  Done
                </button>
              </div>
            ) : (
              <form className="space-y-gutter" onSubmit={handleForgotSubmit}>
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary mb-1.5 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                      mail
                    </span>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest font-body-md text-body-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-xl py-3.5 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isForgotSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
