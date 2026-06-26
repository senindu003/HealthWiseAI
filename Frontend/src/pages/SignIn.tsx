import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/onboarding");
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
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="font-label-sm text-label-sm text-text-secondary">
                    Remember me
                  </span>
                </label>
                <a
                  href="#"
                  className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-xl py-3.5 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                Sign In
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
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
            <button className="w-full border border-outline-variant/50 rounded-xl py-3 flex items-center justify-center gap-3 hover:bg-surface-container-low transition-colors duration-200 font-label-md text-label-md text-text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 48 48"
              >
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                />
              </svg>
              Sign in with Google
            </button>

            {/* Create Account link */}
            <p className="text-center mt-gutter font-body-md text-body-md text-text-secondary">
              Don&apos;t have an account?{" "}
              <Link
                to="/onboarding"
                className="text-primary font-label-md hover:text-primary/80 transition-colors"
              >
                Create Account
              </Link>
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
    </div>
  );
}
