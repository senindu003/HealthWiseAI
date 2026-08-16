import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../lib/api";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const tokens = await register(form);
      sessionStorage.setItem("accessToken", tokens.accessToken);
      sessionStorage.setItem("refreshToken", tokens.refreshToken);
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("isDemoMode", "false");
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800">
      <div className="w-full max-w-[460px] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 md:p-8">
        <Link
          to="/"
          className="text-xs font-black uppercase tracking-wider text-indigo-600"
        >
          HealthWise AI
        </Link>
        <div className="mt-6 space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="text-xs font-medium leading-relaxed text-slate-500">
            Set up your secure HealthWise AI workspace.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              name="firstName"
              value={form.firstName}
              onChange={update}
              autoComplete="given-name"
            />
            <Field
              label="Last name"
              name="lastName"
              value={form.lastName}
              onChange={update}
              autoComplete="family-name"
            />
          </div>
          <Field
            label="Email address"
            name="email"
            type="email"
            value={form.email}
            onChange={update}
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            autoComplete="new-password"
            hint="At least 8 characters"
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={update}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-medium text-slate-500">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="font-bold text-indigo-600 hover:text-indigo-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, ...inputProps }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        required
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
        {...inputProps}
      />
      {hint && (
        <span className="block text-[10px] font-medium text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}
