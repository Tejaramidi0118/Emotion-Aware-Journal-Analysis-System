import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, KeyRound, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import MorphingOrb from '../components/MorphingOrb';

export default function Login() {
  const navigate = useNavigate();
  const { saveUser } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('.glass-panel', {
      y: 60,
      scale: 0.95,
      opacity: 0,
      duration: 1.2,
      ease: 'power4.out'
    });
    tl.from('.glass-panel > *', {
      y: 20,
      opacity: 0,
      stagger: 0.08,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.9');
  });

  
  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res     = await login(form);
      const token   = res.data.access_token;
      let payload = {};
      try {

        payload = JSON.parse(
          atob(token.split('.')[1])
        );
      } catch {

        throw new Error(
          'Invalid token received'
        );
      }
      saveUser({
        userId: payload.sub,
        email:  payload.email || form.email,
        name:   payload.name  || form.email.split('@')[0],
        token
      });
      navigate('/dashboard');
    } catch (e) {
      setError(e.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithGoogle();
      const user = result.user;

      const res = await login({
        email: user.email,
        password: `google-auth-dummy-${user.uid}`
      });

      const token = res.data.access_token;
      let payload = {};
      try {
        payload = JSON.parse(atob(token.split('.')[1]));
      } catch {
        throw new Error('Invalid token received');
      }

      saveUser({
        userId: payload.sub,
        email: payload.email || user.email,
        name: payload.name || user.displayName || user.email.split('@')[0],
        token
      });
      navigate('/dashboard');
    } catch (e) {
      setError(
        e.response?.data?.detail || 
        'Google Login failed. Make sure you have created an account first.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }} className="animate-fade-in">
      
      {/* Absolute Decorative Blobs */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '15%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0) 70%)',
        zIndex: 0
      }} />

      {/* Login Card Container */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        
        {/* Logo and Headings */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            height: '76px',
            width: '76px'
          }}>
            <MorphingOrb size={76} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Welcome to EchoMind
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Your premium, emotion-aware journal companion
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--accent-rose-light)',
            border: '1px solid var(--accent-rose)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: 'var(--accent-rose)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-solid)',
            color: 'var(--text-primary)',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-soft)',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" strokeLinecap="round" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ padding: '0 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            OR
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Input Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '800',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%',
                  background: 'var(--surface-solid)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 40px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  boxShadow: 'var(--shadow-soft)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '800',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <KeyRound size={16} />
              </span>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%',
                  background: 'var(--surface-solid)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 40px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  boxShadow: 'var(--shadow-soft)'
                }}
              />
            </div>
            <div
              style={{
                textAlign: 'right',
                marginTop: '-6px'
              }}
            >
              <button
                onClick={() => navigate('/forgot-password')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Forgot Password?
              </button>
            </div>
          </div>

        </div>

        {/* Action button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '700',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
            marginTop: '8px'
          }}
        >
          {loading ? (
            'Verifying...'
          ) : (
            <>
              <span>Log In</span>
              <Sparkles size={16} />
            </>
          )}
        </button>

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>
            Sign up now
          </Link>
        </div>

      </div>
    </div>
  );
}