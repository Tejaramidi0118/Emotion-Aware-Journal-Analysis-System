import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ChevronRight, ChevronLeft, Check, Mail, X } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

const MUSIC_ECOSYSTEM = {
  Telugu: {
    artists: ['SP Balasubrahmanyam', 'Sid Sriram', 'Ilayaraja', 'Anirudh', 'Mangli', 'Karthik', 'S. Janaki', 'K. S. Chithra', 'Ram Miriyala', 'AR Rahman'],
    genres:  ['Tollywood Melody', 'Carnatic', 'Telugu Folk', 'Devotional', 'Mass Songs', 'Janapada', 'Soft Melodies']
  },
  Hindi: {
    artists: ['Arijit Singh', 'KK', 'Shreya Ghoshal', 'Sonu Nigam', 'Mohit Chauhan', 'Atif Aslam', 'Jubin Nautiyal', 'Udit Narayan'],
    genres:  ['Bollywood', 'Hindi Indie', 'Sufi', 'Ghazal', 'Romantic', 'Sad Songs']
  },
  Malayalam: {
    artists: ['KJ Yesudas', 'K. S. Chithra', 'Vineeth Sreenivasan', 'Shahabaz Aman'],
    genres:  ['Malayalam Melody', 'Mappila Songs', 'Devotional', 'Classical']
  },
  English: {
    artists: ['Coldplay', 'The Weeknd', 'Ed Sheeran', 'Taylor Swift', 'Billie Eilish', 'Imagine Dragons'],
    genres:  ['Lo-fi', 'Rock', 'Jazz', 'Indie', 'Ambient', 'EDM', 'Focus Music']
  }
};

const ACTIVITY_OPTIONS = [
  'Walking', 'Running', 'Gym / Weight Training', 'Yoga / Pilates', 'Cycling', 'Swimming',
  'Dancing', 'Sports (Football, Cricket, etc.)', 'Hiking / Outdoors', 'Martial Arts / Boxing'
];

const HOBBY_OPTIONS = [
  'Reading', 'Writing', 'Drawing & Painting', 'Photography & Videography', 'Cooking & Baking',
  'Gaming (Console, PC, Mobile)', 'Listening to Music', 'Singing & Playing Instruments',
  'Movies & Series', 'Coding & Tech Projects', 'AI & Machine Learning', 'Cybersecurity',
  'Traveling & Exploring', 'Fashion & Styling', 'Content Creation / Blogging', 'Gardening & Nature',
  'Spending Time with Family & Friends', 'DIY & Crafting', 'Learning New Skills'
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'Telugu' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ml', label: 'Malayalam' },
];

const WORK_CONTEXTS = [
  { value: 'student',          label: '🎓 Student' },
  { value: 'knowledge_worker', label: '💼 Employee' },
  { value: 'remote',           label: '🏠 Remote Worker' },
  { value: 'freelancer',       label: '💻 Freelancer' },
  { value: 'entrepreneur',     label: '🚀 Entrepreneur' },
  { value: 'other',            label: '✨ Other' },
];

const SLEEP_SCHEDULES = [
  { value: 'early_riser', label: '🌅 Early Riser (up before 7AM)' },
  { value: 'regular',     label: '🌤 Regular (7–9AM)' },
  { value: 'night_owl',   label: '🌙 Night Owl (sleep after 11PM)' },
];

export default function Signup() {
  const navigate     = useNavigate();
  const { saveUser } = useAuth();

  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [artistSearch, setArtistSearch] = useState('');
  const [signupMethod, setSignupMethod] = useState(null);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    preferred_language: 'en',
    interest_profile: {
      artists:         [],
      music:           [],
      music_languages: [],
      activities:      [],
      hobbies:         [],
      work_context:    'student',
      sleep_schedule:  'regular',
    }
  });

  useGSAP(() => {
    gsap.from('.glass-panel', {
      y: 60,
      scale: 0.95,
      opacity: 0,
      duration: 1.2,
      ease: 'power4.out',
    });
  });

  useEffect(() => {
    gsap.fromTo('.step-container', 
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, [step, signupMethod]);

  const ip = form.interest_profile;

  const toggle = (category, item) => {
    setForm(prev => {
      const list    = prev.interest_profile[category] || [];
      const updated = list.includes(item)
        ? list.filter(i => i !== item)
        : [...list, item];
      return { ...prev, interest_profile: { ...prev.interest_profile, [category]: updated } };
    });
  };

  const setIPField = (field, value) => {
    setForm(prev => ({
      ...prev,
      interest_profile: { ...prev.interest_profile, [field]: value }
    }));
  };

  const availableArtists = ip.music_languages.length > 0
    ? ip.music_languages.flatMap(lang => MUSIC_ECOSYSTEM[lang]?.artists || [])
    : Object.values(MUSIC_ECOSYSTEM).flatMap(e => e.artists);

  const uniqueAvailableArtists = [...new Set(availableArtists)];

  const filteredArtists = artistSearch.length > 0
    ? uniqueAvailableArtists.filter(a =>
        a.toLowerCase().includes(artistSearch.toLowerCase()) &&
        !ip.artists.includes(a)
      )
    : uniqueAvailableArtists.filter(a => !ip.artists.includes(a));

  const addArtist = (artist) => {
    if (ip.artists.length >= 5) return;
    setIPField('artists', [...ip.artists, artist]);
    setArtistSearch('');
  };

  const removeArtist = (artist) => {
    setIPField('artists', ip.artists.filter(a => a !== artist));
  };

  const validateStep1 = () => {
    if (signupMethod === 'google') return true;
    if (!form.full_name.trim()) { setError('Please enter your full name'); return false; }
    if (!form.email.trim())     { setError('Please enter your email'); return false; }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!form.password || form.password.length < 8) {
      setError('Password must be at least 8 characters'); return false;
    }
    setError(''); return true;
  };

  const handleGoogleSignup = async () => {
    try {
      setError('');
      const result = await signInWithGoogle();
      const user = result.user;

      setForm(prev => ({
        ...prev,
        full_name: user.displayName || user.email.split('@')[0] || 'Google User',
        email: user.email || '',
        password: `google-auth-dummy-${user.uid}`
      }));

      setSignupMethod('google');
      setStep(1);
    } catch (err) {
      setError("Google Sign In Failed");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await signup({
        ...form,
        interest_profile: {
          ...ip,
          music: ip.music.map(i => i.toLowerCase()),
          activities: ip.activities.map(i => i.toLowerCase()),
          hobbies: ip.hobbies.map(i => i.toLowerCase()),
        }
      });

      saveUser({
        userId: res.data.user_id,
        email: form.email,
        name: form.full_name
      });

      navigate('/dashboard');

    } catch (e) {
      setError(
        e.response?.data?.detail ||
        'Signup failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const C = (sel) => ({
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    background: sel ? 'var(--accent-blue-light)' : 'var(--surface-solid)',
    border: `1px solid ${sel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
    color: sel ? 'var(--accent-blue)' : 'var(--text-secondary)'
  });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }} className="animate-fade-in">
      
      {/* Decorative radial gradients */}
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 70%)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '10%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0) 70%)',
        zIndex: 0
      }} />

      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '36px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        
        {/* Progress Bar Header */}
        {signupMethod !== null && (
          <div>
            <div style={{ display: 'flex', gap: '6px', height: '6px', marginBottom: '12px' }}>
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: s < step ? 'var(--accent-blue)' : s === step ? 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)' : '#e2e8f0',
                    transition: 'background 0.3s ease'
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Step {step} of 3
            </div>
          </div>
        )}

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
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ================= INITIAL SELECTION SCREEN ================= */}
        {signupMethod === null && (
          <div className="step-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Create Account
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Join EchoMind to begin tracking your stress levels and mood logs.
              </p>
            </div>

            <button
              onClick={handleGoogleSignup}
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

            <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ padding: '0 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                OR
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <button
              onClick={() => setSignupMethod('email')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '700',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Mail size={18} />
              Sign up with Email
            </button>
          </div>
        )}

        {/* ================= STEP 1: Basic Info ================= */}
        {signupMethod !== null && step === 1 && (
          <div className="step-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {signupMethod === 'google' ? 'Customize Your Profile' : 'Create Account'}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {signupMethod === 'google' 
                  ? 'Tell us a bit about yourself to help customize your stress levels and mood logs.' 
                  : 'Join EchoMind to begin tracking your stress levels and mood logs.'}
              </p>
            </div>

            {signupMethod === 'email' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm({...form, full_name: e.target.value})}
                    style={{
                      width: '100%',
                      background: 'var(--surface-solid)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '14px',
                      boxShadow: 'var(--shadow-soft)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    style={{
                      width: '100%',
                      background: 'var(--surface-solid)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '14px',
                      boxShadow: 'var(--shadow-soft)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    style={{
                      width: '100%',
                      background: 'var(--surface-solid)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '14px',
                      boxShadow: 'var(--shadow-soft)'
                    }}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Preferred Journal Language
                </label>
                <select
                  value={form.preferred_language}
                  onChange={e => setForm({...form, preferred_language: e.target.value})}
                  style={{
                    width: '100%',
                    background: 'var(--surface-solid)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Work Context
                </label>
                <select
                  value={ip.work_context}
                  onChange={e => setIPField('work_context', e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-solid)', fontSize: '13px' }}
                >
                  {WORK_CONTEXTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Sleep Schedule
                </label>
                <select
                  value={ip.sleep_schedule}
                  onChange={e => setIPField('sleep_schedule', e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-solid)', fontSize: '13px' }}
                >
                  {SLEEP_SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setSignupMethod(null);
                  setError('');
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: '#fff',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <button
                onClick={() => { if (validateStep1()) setStep(2); }}
                style={{
                  flex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.15)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Music Profile ================= */}
        {step === 2 && (
          <div className="step-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Your Music Profile 🎵
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                We use your music preference to suggest actual tracks matching your analyzed mood.
              </p>
            </div>

            {/* Languages */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                🌍 Music Languages
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.keys(MUSIC_ECOSYSTEM).map(lang => (
                  <button
                    key={lang}
                    onClick={() => toggle('music_languages', lang)}
                    style={C(ip.music_languages.includes(lang))}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Artists selection */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                🎤 Favorite Artists (Select up to 5)
              </label>
              
              {ip.music_languages.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Please select at least one music language above.
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={artistSearch}
                    onChange={e => setArtistSearch(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--surface-solid)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      marginBottom: '8px'
                    }}
                  />

                  {/* Recommendations */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '100px', overflowY: 'auto' }}>
                    {filteredArtists.slice(0, 10).map(art => (
                      <button
                        key={art}
                        onClick={() => addArtist(art)}
                        style={C(false)}
                      >
                        ➕ {art}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Selected list */}
              {ip.artists.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Selected Artists
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {ip.artists.map(art => (
                      <span
                        key={art}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          background: 'var(--accent-blue-light)',
                          color: 'var(--accent-blue)',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {art}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeArtist(art)} />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Genres */}
            {ip.music_languages.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  🎸 Music Genres
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[...new Set(ip.music_languages.flatMap(lang => MUSIC_ECOSYSTEM[lang]?.genres || []))].map(gen => (
                    <button
                      key={gen}
                      onClick={() => toggle('music', gen)}
                      style={C(ip.music.includes(gen))}
                    >
                      {gen}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: '#fff',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.15)'
                }}
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Lifestyle Profile ================= */}
        {step === 3 && (
          <div className="step-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Activities & Hobbies 🎯
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Helps personalized RAG suggest relevant wellness activities matching your stress profile.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                🏃 Physical Activities & Actions You Enjoy
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                {ACTIVITY_OPTIONS.map(act => (
                  <button
                    key={act}
                    onClick={() => toggle('activities', act)}
                    style={C(ip.activities.includes(act))}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                🎨 Hobbies & Intellectual Interests
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                {HOBBY_OPTIONS.map(hob => (
                  <button
                    key={hob}
                    onClick={() => toggle('hobbies', hob)}
                    style={C(ip.hobbies.includes(hob))}
                  >
                    {hob}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: '#fff',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: loading ? '#93c5fd' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  border: 'none',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.15)',
                  cursor: 'pointer'
                }}
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                <Check size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>
            Log In
          </Link>
        </div>

      </div>
    </div>
  );
}