import { useState } from 'react';
import { Mail, User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginView: React.FC = () => {
  const { login, register, members } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (isRegister) {
      if (!name.trim()) return;
      register(email.trim(), name.trim());
    } else {
      // Find name if it exists in pre-seeded members, otherwise mock name from email
      const matchedUser = members.find((m) => m.email?.toLowerCase() === email.toLowerCase());
      const userName = matchedUser ? matchedUser.name : email.split('@')[0];
      login(email.trim(), userName);
    }
  };

  const handleQuickLogin = (emailAddress: string, displayName: string) => {
    login(emailAddress, displayName);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
        overflowY: 'auto',
        padding: '24px',
      }}
      className="login-view-container"
    >
      {/* Decorative Blur Blobs specifically for Login view */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '15%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '10%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="glass"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          color: '#0f172a', // Enforce light text contrast
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '2.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              marginBottom: '16px',
            }}
          >
            🤝
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Welcome to SettleHub
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
            {isRegister ? 'Create your account to start splitting' : 'Sign in to access your ledger audits'}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && (
            <div>
              <label style={{ color: '#475569', fontWeight: 600 }}>Your Name</label>
              <div style={{ display: 'flex', gap: '8px', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)', padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                <User size={16} style={{ color: '#64748b', alignSelf: 'center' }} />
                <input
                  type="text"
                  placeholder="Aadi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ border: 'none', padding: 0, background: 'transparent', color: '#0f172a' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ color: '#475569', fontWeight: 600 }}>Email Address</label>
            <div style={{ display: 'flex', gap: '8px', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)', padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
              <Mail size={16} style={{ color: '#64748b', alignSelf: 'center' }} />
              <input
                type="email"
                placeholder="aadi@settlehub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ border: 'none', padding: 0, background: 'transparent', color: '#0f172a' }}
              />
            </div>
          </div>

          <div>
            <label style={{ color: '#475569', fontWeight: 600 }}>Password</label>
            <div style={{ display: 'flex', gap: '8px', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)', padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
              <Lock size={16} style={{ color: '#64748b', alignSelf: 'center' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ border: 'none', padding: 0, background: 'transparent', color: '#0f172a' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '12px',
              marginTop: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              backgroundColor: '#2563eb',
              color: 'white',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            {isRegister ? 'Register Account' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          </span>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {isRegister ? 'Sign In instead' : 'Register now'}
          </button>
        </div>

        {/* Quick Demo Accounts */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '20px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={12} style={{ color: '#eab308' }} /> Developer Test accounts
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => handleQuickLogin('aadi@settlehub.com', 'Aadi (You)')}
              className="btn btn-secondary btn-sm"
              style={{
                justifyContent: 'flex-start',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '0.75rem',
                padding: '8px 12px',
                borderRadius: '8px'
              }}
            >
              🔑 Log In as <b>Aadi (You)</b>
            </button>
            <button
              onClick={() => handleQuickLogin('sneha@gmail.com', 'Sneha Patel')}
              className="btn btn-secondary btn-sm"
              style={{
                justifyContent: 'flex-start',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '0.75rem',
                padding: '8px 12px',
                borderRadius: '8px'
              }}
            >
              🔑 Log In as <b>Sneha Patel (Roommate)</b>
            </button>
            <button
              onClick={() => handleQuickLogin('ishan@gmail.com', 'Ishan Sharma')}
              className="btn btn-secondary btn-sm"
              style={{
                justifyContent: 'flex-start',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '0.75rem',
                padding: '8px 12px',
                borderRadius: '8px'
              }}
            >
              🔑 Log In as <b>Ishan Sharma (Trip Friend)</b>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
