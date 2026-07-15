import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, CheckCircle, ArrowRight, Loader } from "lucide-react";

export const Auth: React.FC = () => {
  const { login, registerUser, verifyCode } = useAuth();
  const navigate = useNavigate();

  // Mode can be: LOGIN, REGISTER, VERIFY, FORGOT
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "VERIFY" | "FORGOT">("LOGIN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "LOGIN") {
        await login(email, password);
        navigate("/");
      } 
      else if (mode === "REGISTER") {
        const res = await registerUser(email, password, name, phone, upiId);
        setInfo(`Registration successful! Enter the code: ${res.verificationCode} to verify.`);
        setMode("VERIFY");
      } 
      else if (mode === "VERIFY") {
        await verifyCode(email, verificationCode);
        setInfo("Email verified successfully! You can now log in.");
        setMode("LOGIN");
      } 
      else if (mode === "FORGOT") {
        // Forgot password
        const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) {
          setInfo(`Instructions sent! Mock Link: ${data.resetLink}`);
        } else {
          setError(data.error || "Password reset failed");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden select-none">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-card rounded-2xl p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2 mb-2">
            <span className="h-8 w-8 rounded bg-primary flex items-center justify-center text-sm">⚡</span>
            SmartSplit
          </span>
          <p className="text-xs text-gray-400">
            {mode === "LOGIN" && "Simplify group expense settlements instantly"}
            {mode === "REGISTER" && "Create a secure account to track shared ledger"}
            {mode === "VERIFY" && "Verify your email to active account"}
            {mode === "FORGOT" && "Recover your account credentials"}
          </p>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger font-medium">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-medium break-all">
            {info}
          </div>
        )}

        {/* Input Forms */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "REGISTER" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">UPI ID (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. name@ybl"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {(mode === "LOGIN" || mode === "REGISTER" || mode === "FORGOT") && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>
          )}

          {(mode === "LOGIN" || mode === "REGISTER") && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>
          )}

          {mode === "VERIFY" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Verification Code</label>
              <div className="relative">
                <CheckCircle size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm tracking-widest text-center font-bold"
                />
              </div>
            </div>
          )}

          {/* Forgot link on login */}
          {mode === "LOGIN" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode("FORGOT")}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <>
                {mode === "LOGIN" && "Sign In"}
                {mode === "REGISTER" && "Create Account"}
                {mode === "VERIFY" && "Verify & Activate"}
                {mode === "FORGOT" && "Send Reset Link"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer switches */}
        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-gray-400">
          {mode === "LOGIN" ? (
            <p>
              Don't have an account?{" "}
              <button onClick={() => setMode("REGISTER")} className="text-primary hover:underline font-semibold cursor-pointer">
                Sign Up
              </button>
            </p>
          ) : mode === "REGISTER" ? (
            <p>
              Already have an account?{" "}
              <button onClick={() => setMode("LOGIN")} className="text-primary hover:underline font-semibold cursor-pointer">
                Sign In
              </button>
            </p>
          ) : (
            <button onClick={() => setMode("LOGIN")} className="text-primary hover:underline font-semibold cursor-pointer">
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
