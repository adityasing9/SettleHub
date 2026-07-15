import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Phone, CheckCircle, CreditCard, Landmark, ArrowRight, Loader } from "lucide-react";

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [upiId, setUpiId] = useState(user?.upiId || "");
  const [bankName, setBankName] = useState(user?.bankName || "");
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || "");
  const [bankIfsc, setBankIfsc] = useState(user?.bankIfsc || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      await updateProfile({
        name,
        phone,
        upiId,
        bankName,
        bankAccount,
        bankIfsc,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 pb-24 md:pb-6 select-none max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Profile Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">Configure your personal and payment details for settlements.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {success && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-medium">
            Profile updated successfully!
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger font-medium">
            {error}
          </div>
        )}

        {/* Core Personal Details */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5 pb-2">
            Personal Information
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase">Full Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase">Phone Number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Payments details */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5 pb-2">
            Settlement Payment details
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase">UPI ID Handle</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@upi or name@ybl"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
              />
            </div>
            <p className="text-[9px] text-gray-500 mt-0.5">
              This UPI ID will be shared with group members to let them pay you directly using standard UPI apps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Bank Name</label>
              <div className="relative">
                <Landmark size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Account Number</label>
              <div className="relative">
                <CreditCard size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Enter bank account"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase">IFSC Code</label>
            <div className="relative">
              <CheckCircle size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                placeholder="IFSC (e.g. HDFC0000123)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs uppercase text-white"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
        >
          {loading ? <Loader size={15} className="animate-spin" /> : "Save Profile Details"}
          <ArrowRight size={15} />
        </button>
      </form>
    </div>
  );
};
