import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

export default function ForgotPassword() {
  const navigate = useNavigate();

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('.glass-panel', {
      y: 60,
      scale: 0.95,
      opacity: 0,
      duration: 1.2,
      ease: 'power4.out',
    });
    tl.from('.glass-panel > *', {
      y: 20,
      opacity: 0,
      stagger: 0.08,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.9');
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}
      className="animate-fade-in"
    >
      {/* Decorative Blobs */}
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

      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background:
                'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)'
            }}
          >
            <BookOpen size={28} />
          </div>

          <h1
            style={{
              fontSize: '26px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}
          >
            Password Recovery
          </h1>

          <p
            style={{
              color: 'var(--text-secondary)',
              marginTop: '6px',
              fontSize: '14px'
            }}
          >
            Recover your EchoMind account
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface-solid)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            color: 'var(--text-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <HelpCircle size={40} style={{ color: 'var(--accent-blue)' }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>How to Recover Your Account</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              If you signed up using <strong>Google Auth</strong>, simply click "Continue with Google" on the login screen to access your account.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              For standard email accounts, direct password reset is currently unavailable. Please contact our support team at <strong style={{ color: 'var(--accent-blue)' }}>support@echomind.ai</strong> to verify ownership and reset your credentials.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            color: '#fff',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
            fontSize: '15px'
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}