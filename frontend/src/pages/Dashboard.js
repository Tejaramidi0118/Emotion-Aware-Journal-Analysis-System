import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitTextJournal, getPendingFeedback, submitFeedback } from '../services/api';
import StreakCard from '../components/StreakCard';
import { API_BASE_URL } from "../services/api";
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  BookOpen, BarChart3, History as HistoryIcon, Sparkles, Mic, MicOff,
  Check, Settings, LogOut, ChevronRight, AlertCircle, Play, X
} from 'lucide-react';

const parseTimestamp = (ts) => {
  if (!ts) return new Date();
  let formatted = ts.toString().replace(' ', 'T');
  const timePart = formatted.split('T')[1] || '';
  const hasTimezone = formatted.endsWith('Z') || timePart.includes('+') || (timePart.includes('-') && !timePart.startsWith('-'));
  if (!hasTimezone) {
    formatted += 'Z';
  }
  return new Date(formatted);
};

const EMOTION_EMOJI = {
  joy: '😊', trust: '🤝', fear: '😨', surprise: '😲',
  sadness: '😢', disgust: '🤢', anger: '😠', anticipation: '🤔',
  love: '❤️', optimism: '🌟', pessimism: '😞', neutral: '😐'
};

const EMOTION_COLORS = {
  joy:          '#10b981',
  trust:        '#3b82f6',
  fear:         '#f59e0b',
  surprise:     '#8b5cf6',
  sadness:      '#6366f1',
  disgust:      '#ec4899',
  anger:        '#ef4444',
  anticipation: '#0ea5e9',
  love:         '#f43f5e',
  optimism:     '#84cc16',
  pessimism:    '#94a3b8',
  neutral:      '#64748b'
};

const ENERGY_CONFIG = {
  deep_work:        { label: 'Deep Work Day 🚀',    color: '#059669', bg: '#f0fdf4', desc: 'You are in great flow. Tackle your most important task.' },
  light_start:      { label: 'Light Start 🌱',       color: '#0891b2', bg: '#ecfeff', desc: 'Begin gently. Small wins lead to momentum.' },
  moderate_work:    { label: 'Steady Day ⚖️',        color: '#2563eb', bg: '#eff6ff', desc: 'Balanced energy. Mix focus with regular breaks.' },
  short_break:      { label: 'Take a Break ☕',      color: '#d97706', bg: '#fffbeb', desc: 'A short reset will help you finish the day strong.' },
  wind_down_plan:   { label: 'Wind Down & Plan 📅',  color: '#7c3aed', bg: '#f5f3ff', desc: 'Wrap up today and set yourself up for tomorrow.' },
  recovery_evening: { label: 'Recovery Evening 🌿',  color: '#059669', bg: '#f0fdf4', desc: 'Evening is yours. Do something that restores you.' },
  rest_tonight:     { label: 'Rest Tonight 🌙',      color: '#6366f1', bg: '#eef2ff', desc: 'Good day. Sleep well and plan for tomorrow.' },
  rest_now:         { label: 'Rest Now 💛',           color: '#d97706', bg: '#fffbeb', desc: "It's late and you're drained. Rest is the priority." },
  rest_tomorrow:    { label: 'Rest Tomorrow 🌙',      color: '#6366f1', bg: '#eef2ff', desc: 'Plan a lighter day tomorrow.' },
  productive_tomorrow: { label: 'Plan Tomorrow 📅',  color: '#2563eb', bg: '#eff6ff', desc: "Good energy today. Channel it into tomorrow's plan." },
};

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

const WORK_CONTEXTS = [
  { value: 'student',          label: '🎓 Student' },
  { value: 'knowledge_worker', label: '💼 Knowledge Worker' },
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

const TONE_OPTIONS = [
  { value: 'friendly',     label: '😊 Friendly & Warm',    desc: 'Like a close friend who genuinely cares' },
  { value: 'motivational', label: '🔥 Motivational',        desc: 'Push me to do better and keep going' },
  { value: 'calm',         label: '🧘 Calm & Gentle',       desc: 'Soft, soothing and non-pressuring' },
  { value: 'direct',       label: '⚡ Direct & Honest',     desc: 'No fluff, just clear and practical' },
  { value: 'professional', label: '💼 Professional',        desc: 'Structured, formal and goal-oriented' },
];

// Helper for case-insensitive checks
const inList = (list, item) =>
  (list || []).some(s => s.toString().toLowerCase() === item.toString().toLowerCase());

export default function Dashboard({ defaultTab }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Route tab synchronization
  const getInitialTab = () => {
    if (defaultTab) return defaultTab;
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('tab') || 'journal';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Synergized state from both dashboard & subpages
  const [text, setText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState('');

  
  // Last Analyzed Entry
  const [lastEntry, setLastEntry] = useState(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('header.glass-panel', {
      y: -50,
      opacity: 0,
      duration: 1.0,
      ease: 'power3.out'
    });
    tl.from('.workspace-column', {
      y: 40,
      opacity: 0,
      stagger: 0.12,
      duration: 1.0,
      ease: 'power3.out'
    }, '-=0.8');
  });

  useEffect(() => {
    gsap.fromTo('.animate-fade-in',
      { opacity: 0, y: 15, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, [activeTab]);

  useEffect(() => {
    if (lastEntry) {
      gsap.fromTo('.right-panel .glass-panel',
        { scale: 0.96, opacity: 0.8 },
        { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }, [lastEntry]);
  
  // History & Feedback
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState({});
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [feedbackScore, setFeedbackScore] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Profile preferences
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileTab, setProfileTab] = useState('music');
  const [artistSearch, setArtistSearch] = useState('');

  // Audio Recording State
  const [recording, setRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const recIntervalRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  // Sync tab state on location query changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [location]);

  // Load Initial Dashboard data
  useEffect(() => {
    if (!user?.userId) return;

    // 1. Fetch Streak & Last Entry from history
    const stored = localStorage.getItem('lastEntry');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.user_id || parsed.user_id === user.userId) {
          setLastEntry(parsed);
        }
      } catch {
        localStorage.removeItem('lastEntry');
      }
    }

    // Fetch history
    setHistoryLoading(true);
    fetch(`${API_BASE_URL}/journal/history/${user.userId}?limit=30`)
      .then(r => r.json())
      .then(d => {
        const h = d.history || [];
        setHistory(h);
        if (h.length > 0) {
          setLastEntry(h[0]);
          localStorage.setItem('lastEntry', JSON.stringify({
            ...h[0],
            user_id: user.userId
          }));
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));

    // 2. Fetch pending feedback
    fetch(`${API_BASE_URL}/journal/feedback/pending/${user.userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.has_pending) setPendingFeedback(d);
      })
      .catch(() => {});



    // 4. Fetch Profile Preferences
    fetch(`${API_BASE_URL}/auth/profile/${user.userId}`)
      .then(r => r.json())
      .then(d => {
        const ip = d.interest_profile || {};
        setProfile({
          artists:         Array.isArray(ip.artists)         ? ip.artists         : [],
          music:           Array.isArray(ip.music)           ? ip.music           : [],
          music_languages: Array.isArray(ip.music_languages) ? ip.music_languages : [],
          activities:      Array.isArray(ip.activities)      ? ip.activities      : [],
          hobbies:         Array.isArray(ip.hobbies)         ? ip.hobbies         : [],
          tone:            ip.tone           || 'friendly',
          work_context:    ip.work_context   || 'student',
          sleep_schedule:  ip.sleep_schedule || 'regular',
        });
      })
      .catch(() => setProfile({
        artists:[], music:[], music_languages:[],
        activities:[], hobbies:[],
        tone:'friendly', work_context:'student', sleep_schedule:'regular'
      }))
      .finally(() => setProfileLoading(false));
  }, [user]);

  // Audio timer
  useEffect(() => {
    if (recording) {
      recIntervalRef.current = setInterval(() => {
        setRecDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recIntervalRef.current);
      setRecDuration(0);
    }
    return () => clearInterval(recIntervalRef.current);
  }, [recording]);

  // Voice recording triggers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current  = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
      mediaRef.current.start();
      setRecording(true);
      setJournalError('');
    } catch {
      setJournalError('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (!mediaRef.current) return;
    mediaRef.current.stop();
    setRecording(false);
    mediaRef.current.onstop = async () => {
      const blob     = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('user_id', user.userId);
      formData.append('audio', blob, 'recording.wav');
      setJournalLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/journal/voice`, {
          method: 'POST', body: formData
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setLastEntry(data);
        localStorage.setItem('lastEntry', JSON.stringify({ ...data, user_id: user.userId }));
        // Prepend to history
        setHistory(prev => [data, ...prev]);
        setText('');
        // Alert if feedback pending
        fetchFeedbackPending();
      } catch {
        setJournalError('Voice processing failed. Please write your thoughts down instead.');
      } finally {
        setJournalLoading(false);
      }
    };
  };

  const fetchFeedbackPending = () => {
    fetch(`${API_BASE_URL}/journal/feedback/pending/${user.userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.has_pending) setPendingFeedback(d);
      })
      .catch(() => {});
  };

  // Text journal submission
  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    setJournalLoading(true); setJournalError('');
    try {
      const moodPrefixes = {
        happy: "I am feeling happy today. ",
        okay: "I am feeling okay today. ",
        low: "I am feeling low today. "
      };
      const prefix = selectedMood ? moodPrefixes[selectedMood] : "";
      const submissionText = `${prefix}${text}`;

      const res = await submitTextJournal({ text: submissionText, user_id: user.userId });
      setLastEntry(res.data);
      localStorage.setItem('lastEntry', JSON.stringify({ ...res.data, user_id: user.userId }));
      setHistory(prev => [res.data, ...prev]);
      setText('');
      setSelectedMood(null);
      // Check for pending feedback
      fetchFeedbackPending();
    } catch (e) {
      setJournalError(e.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setJournalLoading(false);
    }
  };

  // Quick check-in moods
  const handleQuickMood = (mood) => {
    setSelectedMood(prev => prev === mood ? null : mood);
    setActiveTab('journal');
  };

  const handleFeedbackSubmit = async () => {
    if (!pendingFeedback) return;
    setFeedbackLoading(true);
    try {
      await submitFeedback({
        user_id:          user.userId,
        entry_id:         pendingFeedback.entry_id,
        suggestion_item:  pendingFeedback.suggestion?.substring(0, 50) || 'suggestion',
        feedback_score:   feedbackScore,
        dominant_emotion: pendingFeedback.dominant_emotion
      });
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setPendingFeedback(null);
        setFeedbackSubmitted(false);
        setFeedbackScore(0);
      }, 3000);
    } catch {
      alert('Failed to submit feedback.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Profile management
  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      await fetch(`${API_BASE_URL}/auth/profile/${user.userId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ interest_profile: profile })
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      alert('Failed to save profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const toggleProfileField = (field, item) => {
    const storeVal = ['activities','hobbies','music'].includes(field)
      ? item.toLowerCase() : item;
    setProfile(prev => {
      const list   = prev[field] || [];
      const exists = list.some(s => s.toLowerCase() === storeVal.toLowerCase());
      return {
        ...prev,
        [field]: exists
          ? list.filter(s => s.toLowerCase() !== storeVal.toLowerCase())
          : [...list, storeVal]
      };
    });
  };

  const setProfileField = (field, val) =>
    setProfile(prev => ({ ...prev, [field]: val }));

  const addArtist = (artist) => {
    if ((profile?.artists || []).length >= 5) return;
    if ((profile?.artists || []).includes(artist)) return;
    setProfileField('artists', [...(profile?.artists || []), artist]);
    setArtistSearch('');
  };

  const removeArtist = (artist) =>
    setProfileField('artists', (profile?.artists || []).filter(a => a !== artist));

  // Compute profile artists & genres
  const selectedLangs = profile?.music_languages || [];
  const availableArtists = selectedLangs.length > 0
    ? [...new Set(selectedLangs.flatMap(l => MUSIC_ECOSYSTEM[l]?.artists || []))]
    : [...new Set(Object.values(MUSIC_ECOSYSTEM).flatMap(e => e.artists))];

  const displayArtists = artistSearch.length > 0
    ? availableArtists.filter(a =>
        a.toLowerCase().includes(artistSearch.toLowerCase()) &&
        !(profile?.artists || []).includes(a))
    : availableArtists.filter(a => !(profile?.artists || []).includes(a));

  const availableGenres = selectedLangs.length > 0
    ? [...new Set(selectedLangs.flatMap(l => MUSIC_ECOSYSTEM[l]?.genres || []))]
    : [...new Set(Object.values(MUSIC_ECOSYSTEM).flatMap(e => e.genres))];

  // Helper for format time
  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Recharts Analytics calculations
  const chartHistory = [...history].reverse();
  const emsData = chartHistory.map((h, i) => {
    const d = parseTimestamp(h.timestamp);
    return {
      date:    `${d.getDate()} ${d.toLocaleString('en',{month:'short'})}`,
      EMS:     Math.round(parseFloat(h.ems) || 0),
      Burnout: Math.round(parseFloat(h.burnout_risk) || 0),
      index:   i
    };
  });

  const emotionCounts = {};
  chartHistory.forEach(h => {
    if (h.dominant_emotion) {
      emotionCounts[h.dominant_emotion] = (emotionCounts[h.dominant_emotion] || 0) + 1;
    }
  });

  const top4Emotions = Object.entries(emotionCounts)
    .sort((a,b) => b[1]-a[1]).slice(0,4).map(([e]) => e);

  const emotionTimeData = chartHistory.map(h => {
    const row = {
      date: parseTimestamp(h.timestamp).toLocaleDateString('en-IN', {day:'numeric', month:'short'})
    };
    top4Emotions.forEach(e => {
      row[e] = parseFloat((h.emotion_scores?.[e] || 0).toFixed(2));
    });
    return row;
  });

  const donutData = Object.entries(emotionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value);

  const avgEMS = history.length > 0 
    ? Math.round(history.reduce((a,h) => a+(h.ems||0),0) / history.length) 
    : 0;
  const avgBurnout = history.length > 0 
    ? Math.round(history.reduce((a,h) => a+(h.burnout_risk||0),0) / history.length) 
    : 0;
  const topEmotion = donutData[0]?.name || 'neutral';

  const emsColor = (ems) => {
    if (ems >= 70) return 'var(--accent-rose)';
    if (ems >= 40) return 'var(--accent-amber)';
    return 'var(--primary-wellness)';
  };

  const energy = lastEntry?.energy_label
    ? ENERGY_CONFIG[lastEntry.energy_label]
    : null;

  const renderCheckInVoice = () => (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
          Today's Check-In
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          How are you today?
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
          Select a mood to begin or quick-journal. Your insights are private.
        </p>
      </div>

      {/* Mood selector buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { mood: 'happy', label: 'Happy', emoji: '😊', bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
          { mood: 'okay', label: 'Okay', emoji: '😐', bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' },
          { mood: 'low', label: 'Low', emoji: '😞', bg: '#fef2f2', border: '#fca5a5', color: '#b91c1c' }
        ].map(m => {
          const isSelected = selectedMood === m.mood;
          return (
            <button
              key={m.mood}
              onClick={() => handleQuickMood(m.mood)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '14px 10px',
                borderRadius: '16px',
                background: m.bg,
                border: isSelected ? `2px solid ${m.color}` : `1px solid ${m.border}`,
                color: m.color,
                boxShadow: isSelected ? `0 8px 20px -4px ${m.color}55` : 'var(--shadow-soft)',
                transform: isSelected ? 'scale(1.05)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <span style={{ fontSize: '24px', marginBottom: '4px' }}>{m.emoji}</span>
              <span style={{ fontSize: '12px', fontWeight: isSelected ? '800' : '700' }}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Voice Check-in */}
      <div style={{
        background: '#f8fafc',
        border: '1px dashed var(--border-subtle)',
        borderRadius: '16px',
        padding: '18px 14px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Voice Journaling
        </div>

        {/* Record Button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={journalLoading}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: recording ? 'var(--accent-rose)' : 'var(--accent-blue)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
            marginBottom: '10px',
            animation: recording ? 'pulse-gentle 1.2s infinite' : 'none'
          }}
        >
          {recording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {recording ? `Recording: ${formatSeconds(recDuration)}` : 'Tap to start recording'}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
          {recording ? 'Speak naturally...' : 'Autodetects Telugu, Hindi, Malayalam, English'}
        </p>

        {/* Waveform Visualization when recording */}
        {recording && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            height: '30px',
            marginTop: '12px'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(bar => (
              <div
                key={bar}
                style={{
                  width: '3px',
                  backgroundColor: 'var(--accent-rose)',
                  borderRadius: '3px',
                  animation: 'bar-grow 1s ease-in-out infinite',
                  animationDelay: `${bar * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStreakCard = () => (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        Wellness Journey
      </div>
      <StreakCard userId={user?.userId} />
    </div>
  );

  const renderSnapshot = () => (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          Today's Snapshot
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
          Wellness Metrics
        </h3>
      </div>

      {lastEntry ? (
        <>
          {/* Wellness Score & Burnout indicators */}
          <div style={{ display: 'flex', gap: '12px' }}>
            
            {/* Wellness Indicator */}
            <div style={{
              flex: 1,
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '26px', fontWeight: '800', color: emsColor(lastEntry.ems) }}>
                {Math.round(lastEntry.ems)}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Stress (EMS)
              </div>
            </div>

            {/* Burnout Risk Indicator */}
            <div style={{
              flex: 1,
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '26px',
                fontWeight: '800',
                color: lastEntry.burnout_risk >= 70 ? 'var(--accent-rose)' : lastEntry.burnout_risk >= 40 ? 'var(--accent-amber)' : 'var(--primary-wellness)'
              }}>
                {Math.round(lastEntry.burnout_risk)}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Burnout Risk
              </div>
            </div>

          </div>

          {/* Mood detected chips */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Mood Detected
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                background: 'var(--accent-blue-light)',
                color: 'var(--accent-blue)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                textTransform: 'capitalize'
              }}>
                {EMOTION_EMOJI[lastEntry.dominant_emotion]} {lastEntry.dominant_emotion}
              </span>

              {/* Other active emotions */}
              {lastEntry.active_emotions?.filter(e => e !== lastEntry.dominant_emotion).map(e => (
                <span key={e} style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: '#f1f5f9',
                  color: 'var(--text-secondary)',
                  textTransform: 'capitalize'
                }}>
                  {EMOTION_EMOJI[e]} {e}
                </span>
              ))}
            </div>
          </div>

          {/* Today's Energy config */}
          {energy && (
            <div style={{
              padding: '14px',
              borderRadius: '16px',
              background: energy.bg,
              borderLeft: `4px solid ${energy.color}`,
              boxShadow: 'var(--shadow-soft)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                Energy Allocation
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: energy.color }}>
                {energy.label}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                {energy.desc}
              </p>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
          Write/record your first entry to see live stress & burnout indicators here.
        </div>
      )}
    </div>
  );

  const renderAICompanion = () => (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, minHeight: 0 }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          AI Companion
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
          Personalized Suggestion
        </h3>
      </div>

      {lastEntry ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1, minHeight: 0, minWidth: 0, paddingRight: '2px' }}>
          
          {/* Personalized Suggestion Text */}
          <div style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.7',
            padding: '4px 0 12px 0',
            borderBottom: '1px dashed var(--border-subtle)'
          }}>
            {lastEntry.suggestion}
            
            {/* Triggers if any */}
            {lastEntry.triggers?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Stressors:</span>
                {lastEntry.triggers.map(t => (
                  <span key={t} style={{ fontSize: '10px', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', textTransform: 'uppercase' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Music Recommendations list */}
          {((lastEntry.music_recommendations || lastEntry.music_tracks)?.length > 0) && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                🎵 Songs for your mood
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(lastEntry.music_recommendations || lastEntry.music_tracks).map((song, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '12px',
                    background: '#fff',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: 'var(--accent-rose-light)',
                      color: 'var(--accent-rose)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      🎵
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.title}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                        {song.artist}
                      </div>
                    </div>
                    <a
                      href={song.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Play size={10} fill="#fff" /> Play
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
          Tailored wellness plans and comforting audio recommendations will populate here.
        </div>
      )}

      {/* Pending feedback prompt bottom box */}
      {pendingFeedback && (
        <div
          onClick={() => setActiveTab('feedback')}
          style={{
            marginTop: 'auto',
            padding: '14px',
            borderRadius: '16px',
            background: 'var(--accent-amber-light)',
            border: '1px solid var(--accent-amber)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div style={{ fontSize: '20px' }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
              Feedback Request
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Rate our suggestion help level →
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--accent-amber)' }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-wrapper">
      
      {/* Navigation Header */}
      <header className="glass-panel" style={{
        margin: '16px 24px 8px 24px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '20px',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('journal')}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <BookOpen size={20} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-blue)', letterSpacing: '-0.02em', fontFamily: 'var(--font-family)' }}>
            EchoMind
          </span>
        </div>

        {/* Desktop Tabs */}
        <nav style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'journal', label: 'Journal', icon: BookOpen },
            { id: 'insights', label: 'Insights', icon: BarChart3 },
            { id: 'history', label: 'History', icon: HistoryIcon },
            { id: 'profile', label: 'Profile', icon: Settings }
          ].map(t => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`nav-${t.id}`}
                onClick={() => {
                  setActiveTab(t.id);
                  setJournalError('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: isSel ? 'var(--accent-blue-light)' : 'transparent',
                  color: isSel ? 'var(--accent-blue)' : 'var(--text-secondary)'
                }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* User initials & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Active Client
            </div>
          </div>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.15)'
            }}>
              {(user?.name || 'US').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            
            <button
              onClick={() => { logout(); navigate('/login'); }}
              title="Logout"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--border-subtle)',
                background: '#fff',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-soft)'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main 3-Panel Workspace Grid */}
      <main className="main-workspace-grid">
        
        {/* ================= LEFT PANEL ================= */}
        <section className="workspace-column scrollable left-panel">
          {renderCheckInVoice()}
          {renderStreakCard()}
        </section>

        {/* ================= CENTER PANEL ================= */}
        <section className="workspace-column center-panel">
          
          {/* Main Workspace Frame */}
          <div className="glass-panel" style={{
            flex: 1,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minHeight: 0,
            minWidth: 0
          }}>
            
            {/* Show Journal Tab */}
            {activeTab === 'journal' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '18px', minHeight: 0, minWidth: 0 }} className="animate-fade-in">
                <div className="mobile-show">
                  {renderCheckInVoice()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      Always For You
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      Journal Entry
                    </h1>
                  </div>

                  {selectedMood && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: selectedMood === 'happy' ? '#ecfdf5' : selectedMood === 'low' ? '#fef2f2' : '#f1f5f9',
                      border: `1px solid ${selectedMood === 'happy' ? '#a7f3d0' : selectedMood === 'low' ? '#fca5a5' : '#e2e8f0'}`,
                      color: selectedMood === 'happy' ? '#047857' : selectedMood === 'low' ? '#b91c1c' : '#475569',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}>
                      <span>Input Context: {selectedMood === 'happy' ? '😊 Happy' : selectedMood === 'low' ? '😞 Low' : '😐 Okay'}</span>
                      <X size={14} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => setSelectedMood(null)} />
                    </div>
                  )}
                </div>

                {journalError && (
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
                    <span>{journalError}</span>
                  </div>
                )}

                {/* Premium Textarea */}
                <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    disabled={journalLoading}
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '260px',
                      background: 'var(--surface-solid)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '20px',
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      lineHeight: '1.7',
                      resize: 'none',
                      boxShadow: 'var(--shadow-inset)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '16px',
                    fontSize: '11px',
                    color: 'var(--text-muted)'
                  }}>
                    {text.length} characters
                  </div>
                </div>

                {/* CTA Buttons Row */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={handleTextSubmit}
                    disabled={journalLoading || !text.trim()}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: '700',
                      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)',
                      opacity: (!text.trim() || journalLoading) ? 0.6 : 1
                    }}
                  >
                    <Sparkles size={16} />
                    {journalLoading ? '✨ Analyzing mood...' : 'Analyze & Get Suggestion'}
                  </button>
                  
                  <button
                    onClick={() => { setText(''); setJournalError(''); }}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-subtle)',
                      background: '#fff',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Reset
                  </button>
                </div>
                {lastEntry && (
                  <div className="mobile-show" style={{ marginTop: '16px' }}>
                    {renderAICompanion()}
                  </div>
                )}
              </div>
            )}

            {/* Show Insights / Analytics Tab */}
            {activeTab === 'insights' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '20px', minHeight: 0, minWidth: 0 }} className="animate-fade-in">
                <div className="mobile-show">
                  {renderSnapshot()}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Data & Trends
                  </div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    My Emotional Analytics
                  </h1>
                </div>

                {history.length < 3 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>📊</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      More data needed
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: '1.6', marginBottom: '20px' }}>
                      Write {3 - history.length} more journal {3 - history.length === 1 ? 'entry' : 'entries'} to unlock your personalization stress analytics and trends.
                    </p>
                    <button
                      onClick={() => setActiveTab('journal')}
                      style={{
                        padding: '12px 24px',
                        background: 'var(--accent-blue)',
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}
                    >
                      Write Journal Now
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1, minHeight: 0, minWidth: 0, paddingRight: '4px' }}>
                    
                    {/* Stats cards grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Journal Entries', val: history.length, color: 'var(--accent-blue)', bg: '#eff6ff' },
                        { label: 'Avg Stress (EMS)', val: `${avgEMS}/100`, color: emsColor(avgEMS), bg: '#fdf2f8' },
                        { label: 'Avg Burnout', val: `${avgBurnout}/100`, color: avgBurnout >= 70 ? 'var(--accent-rose)' : 'var(--primary-wellness)', bg: '#f0fdf4' }
                      ].map((s, idx) => (
                        <div key={idx} style={{ padding: '14px', borderRadius: '16px', background: s.bg, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                            {s.label}
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, marginTop: '6px' }}>
                            {s.val}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chart 1: Stress & Burnout */}
                    <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: '#fff' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>
                        📈 Stress & Burnout Trend
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={emsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="cems" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="cburn" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Area type="monotone" dataKey="EMS" stroke="#3b82f6" fill="url(#cems)" strokeWidth={2} />
                          <Area type="monotone" dataKey="Burnout" stroke="#ef4444" fill="url(#cburn)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Row: Donut + Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      
                      {/* Donut Chart */}
                      <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: '#fff' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                          🍩 Emotion Distribution
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ResponsiveContainer width="60%" height={120}>
                            <PieChart>
                              <Pie data={donutData} innerRadius={24} outerRadius={44} dataKey="value" strokeWidth={0}>
                                {donutData.map((entry, i) => (
                                  <Cell key={i} fill={EMOTION_COLORS[entry.name] || '#94a3b8'} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {donutData.slice(0, 3).map((d, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: EMOTION_COLORS[d.name] || '#94a3b8' }} />
                                <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50px' }}>
                                  {d.name}
                                </span>
                                <span style={{ fontWeight: '700', marginLeft: 'auto' }}>{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bar chart */}
                      <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: '#fff' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                          📊 Weekly Stress Levels
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                          <BarChart data={emsData.slice(-7)} margin={{ top: 5, right: 0, left: -30, bottom: 0 }} barSize={12}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Bar dataKey="EMS" radius={[4, 4, 0, 0]}>
                              {emsData.slice(-7).map((entry, i) => (
                                <Cell key={i} fill={emsColor(entry.EMS)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Show History Tab */}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '20px', minHeight: 0, minWidth: 0 }} className="animate-fade-in">
                <div className="mobile-show">
                  {renderStreakCard()}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Reflection Log
                  </div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Previous Insights
                  </h1>
                </div>

                {historyLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading entries...</div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📖</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>No entries yet</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Submit a text or voice journal on the Journal tab.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, minHeight: 0, minWidth: 0, paddingRight: '4px' }}>
                    {history.map((entry, idx) => {
                      const isExpanded = expandedEntries[idx];
                      const isLong = entry.text && entry.text.length > 150;
                      const displayText = isLong && !isExpanded 
                        ? `${entry.text.substring(0, 150)}...` 
                        : entry.text;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setLastEntry(entry);
                            localStorage.setItem('lastEntry', JSON.stringify({ ...entry, user_id: user.userId }));
                          }}
                          style={{
                            padding: '16px',
                            background: '#fff',
                            borderRadius: '16px',
                            border: `1px solid ${lastEntry?.timestamp === entry.timestamp ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start',
                            boxShadow: 'var(--shadow-soft)'
                          }}
                        >
                          <div style={{ fontSize: '24px' }}>
                            {EMOTION_EMOJI[entry.dominant_emotion] || '😐'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                                {entry.dominant_emotion}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {parseTimestamp(entry.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              marginTop: '6px'
                            }}>
                              {displayText}
                            </p>
                            {isLong && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedEntries(prev => ({
                                    ...prev,
                                    [idx]: !prev[idx]
                                  }));
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--accent-blue)',
                                  fontSize: '11.5px',
                                  fontWeight: '700',
                                  padding: '4px 0',
                                  marginTop: '2px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                {isExpanded ? 'See Less' : 'See More'}
                              </button>
                            )}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', alignItems: 'center' }}>
                              <span>EMS: <strong style={{ color: emsColor(entry.ems) }}>{Math.round(entry.ems)}</strong></span>
                              <span>•</span>
                              <span>Burnout: <strong>{Math.round(entry.burnout_risk)}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Show Profile Tab */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '18px', minHeight: 0, minWidth: 0 }} className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      Preferences
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      Profile Setup
                    </h1>
                  </div>
                  {profileSaved && (
                    <span style={{ fontSize: '13px', color: 'var(--primary-wellness)', fontWeight: '700', background: 'var(--primary-wellness-light)', padding: '4px 12px', borderRadius: '20px' }}>
                      ✓ Settings Saved
                    </span>
                  )}
                </div>

                {profileLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading settings...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '14px', overflowY: 'auto', minHeight: 0, minWidth: 0, paddingRight: '4px' }}>
                    
                    {/* Inner profile tabs */}
                    <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                      {[
                        { id: 'music', label: 'Music Preference' },
                        { id: 'lifestyle', label: 'Activities & Hobbies' },
                        { id: 'tone', label: 'RAG Tone' },
                        { id: 'context', label: 'Schedule' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setProfileTab(tab.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            background: profileTab === tab.id ? 'var(--accent-blue-light)' : 'transparent',
                            color: profileTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Profile Tab content */}
                    {profileTab === 'music' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            Music Languages
                          </label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {Object.keys(MUSIC_ECOSYSTEM).map(lang => {
                              const sel = (profile?.music_languages || []).includes(lang);
                              return (
                                <button
                                  key={lang}
                                  onClick={() => toggleProfileField('music_languages', lang)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    border: `1px solid ${sel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                                    background: sel ? 'var(--accent-blue-light)' : '#fff',
                                    color: sel ? 'var(--accent-blue)' : 'var(--text-secondary)'
                                  }}
                                >
                                  {lang}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            Search & Add Artists (Max 5)
                          </label>
                          
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={artistSearch}
                              onChange={e => setArtistSearch(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '13px'
                              }}
                            />
                          </div>

                          {artistSearch.trim() && displayArtists.length > 0 && (
                            <div style={{
                              maxHeight: '140px',
                              overflowY: 'auto',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '10px',
                              background: '#fff',
                              marginBottom: '10px'
                            }}>
                              {displayArtists.slice(0, 5).map(art => (
                                <div
                                  key={art}
                                  onClick={() => addArtist(art)}
                                  style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                >
                                  ➕ {art}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Selected Artists */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {(profile?.artists || []).map(art => (
                              <span
                                key={art}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  background: 'var(--accent-blue-light)',
                                  color: 'var(--accent-blue)',
                                  fontWeight: '600',
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

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            Music Genres
                          </label>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {availableGenres.map(gen => {
                              const sel = inList(profile?.music, gen);
                              return (
                                <button
                                  key={gen}
                                  onClick={() => toggleProfileField('music', gen)}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '14px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: `1px solid ${sel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                                    background: sel ? 'var(--accent-blue-light)' : '#fff',
                                    color: sel ? 'var(--accent-blue)' : 'var(--text-secondary)'
                                  }}
                                >
                                  {gen}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    )}

                    {profileTab === 'lifestyle' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            Physical Activities
                          </label>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {ACTIVITY_OPTIONS.map(act => {
                              const sel = inList(profile?.activities, act);
                              return (
                                <button
                                  key={act}
                                  onClick={() => toggleProfileField('activities', act)}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '14px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: `1px solid ${sel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                                    background: sel ? 'var(--accent-blue-light)' : '#fff',
                                    color: sel ? 'var(--accent-blue)' : 'var(--text-secondary)'
                                  }}
                                >
                                  {act}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            Hobbies & Interests
                          </label>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {HOBBY_OPTIONS.map(hob => {
                              const sel = inList(profile?.hobbies, hob);
                              return (
                                <button
                                  key={hob}
                                  onClick={() => toggleProfileField('hobbies', hob)}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '14px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: `1px solid ${sel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                                    background: sel ? 'var(--accent-blue-light)' : '#fff',
                                    color: sel ? 'var(--accent-blue)' : 'var(--text-secondary)'
                                  }}
                                >
                                  {hob}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    )}

                    {profileTab === 'tone' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Suggestion Voice / Tone
                        </label>
                        {TONE_OPTIONS.map(opt => (
                          <div
                            key={opt.value}
                            onClick={() => setProfileField('tone', opt.value)}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '12px',
                              border: `1px solid ${profile?.tone === opt.value ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                              background: profile?.tone === opt.value ? 'var(--accent-blue-light)' : '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{opt.label}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
                            </div>
                            {profile?.tone === opt.value && <Check size={16} style={{ color: 'var(--accent-blue)' }} />}
                          </div>
                        ))}
                      </div>
                    )}

                    {profileTab === 'context' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            Work Context
                          </label>
                          <select
                            value={profile?.work_context || 'student'}
                            onChange={e => setProfileField('work_context', e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: '#fff', fontSize: '13px' }}
                          >
                            {WORK_CONTEXTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            Sleep Schedule
                          </label>
                          <select
                            value={profile?.sleep_schedule || 'regular'}
                            onChange={e => setProfileField('sleep_schedule', e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: '#fff', fontSize: '13px' }}
                          >
                            {SLEEP_SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>

                      </div>
                    )}

                    <button
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                      style={{
                        padding: '12px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '14px',
                        marginTop: '10px'
                      }}
                    >
                      {profileSaving ? 'Saving Changes...' : 'Save Settings'}
                    </button>

                  </div>
                )}
              </div>
            )}

            {/* Show Feedback Slider Tab */}
            {activeTab === 'feedback' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '20px', minHeight: 0, minWidth: 0 }} className="animate-fade-in">
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Improvement RAG
                  </div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Wellness Feedback
                  </h1>
                </div>

                {!pendingFeedback ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>✓</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      No pending feedback
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: '1.6', marginBottom: '20px' }}>
                      You have graded all suggestions. Post another journal entry to receive new wellness recommendations.
                    </p>
                    <button
                      onClick={() => setActiveTab('journal')}
                      style={{
                        padding: '12px 24px',
                        background: 'var(--accent-blue)',
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}
                    >
                      Go to Journal
                    </button>
                  </div>
                ) : feedbackSubmitted ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-wellness)', marginBottom: '8px' }}>
                      Thank you!
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: '1.6' }}>
                      Your rating of {feedbackScore > 0 ? `+${feedbackScore}` : feedbackScore} will adjust future suggestion generation weights.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', paddingRight: '4px' }}>
                    
                    <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--accent-amber-light)', border: '1px solid var(--accent-amber)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Last Suggestion Received
                      </div>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.6', fontStyle: 'italic' }}>
                        "{pendingFeedback.suggestion}"
                      </p>
                    </div>

                    <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: '#fff' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>
                        How much did this help? (-5 to +5)
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: '38px', fontWeight: '800', color: feedbackScore > 0 ? 'var(--primary-wellness)' : feedbackScore === 0 ? 'var(--text-secondary)' : 'var(--accent-rose)' }}>
                          {feedbackScore > 0 ? `+${feedbackScore}` : feedbackScore}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {feedbackScore >= 4 ? 'Very helpful! 🎉' :
                           feedbackScore >= 2 ? 'Somewhat helpful 👍' :
                           feedbackScore === 1 ? 'Slightly helpful' :
                           feedbackScore === 0 ? 'Neutral 😐' :
                           feedbackScore >= -2 ? 'Not helpful 👎' : 'Made things worse 😞'}
                        </div>
                      </div>

                      <input
                        type="range"
                        min="-5"
                        max="5"
                        value={feedbackScore}
                        onChange={e => setFeedbackScore(parseInt(e.target.value))}
                        style={{ width: '100%', height: '6px', borderRadius: '3px', accentColor: 'var(--accent-blue)', outline: 'none' }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        <span>-5 Worse</span>
                        <span>0 Neutral</span>
                        <span>+5 Helpful</span>
                      </div>
                    </div>

                    <button
                      onClick={handleFeedbackSubmit}
                      disabled={feedbackLoading}
                      style={{
                        padding: '14px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                        color: '#fff',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}
                    >
                      {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                    </button>

                  </div>
                )}
              </div>
            )}

          </div>

        </section>

        {/* ================= RIGHT PANEL ================= */}
        <section className="workspace-column scrollable right-panel">
          {renderSnapshot()}
          {renderAICompanion()}
        </section>

      </main>
    </div>
  );
}