import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Award, Calendar, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function StreakCard({ userId }) {
  const navigate        = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/journal/streak/${userId}`)
      .then(r => r.json())
      .then(d => {
        console.log('Streak API response:', d);
        setData(d);
      })
      .catch(err => {
        console.error('Streak fetch error:', err);
        setData({ streak:0, longest_streak:0, total_entries:0, journaled_today:false });
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div style={{
      background: 'transparent',
      padding: '12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Calculating streak details...
      </div>
    </div>
  );

  const streak          = typeof data?.streak         === 'number' ? data.streak         : 0;
  const longest_streak  = typeof data?.longest_streak === 'number' ? data.longest_streak : 0;
  const total_entries   = typeof data?.total_entries  === 'number' ? data.total_entries  : 0;
  const journaled_today = data?.journaled_today === true;

  const getMessage = () => {
    if (streak === 0 && !journaled_today) return "Start your streak today!";
    if (streak > 0 && !journaled_today)   return `Don't break your ${streak}-day streak!`;
    if (streak >= 30) return "Legendary journaler! 🏆";
    if (streak >= 14) return "Two weeks strong! 💎";
    if (streak >= 7)  return "One week streak! 🔥";
    if (streak >= 3)  return "Great momentum! Keep going ⚡";
    if (streak === 1) return "First day! Keep it going 🌱";
    return "Good start! Keep going";
  };

  const getBadge = () => {
    if (streak >= 30) return { label: '🏆 Legend',    color: '#d97706', bg: '#fefce8' };
    if (streak >= 14) return { label: '💎 Dedicated', color: '#7c3aed', bg: '#f5f3ff' };
    if (streak >= 7)  return { label: '🔥 On Fire',   color: '#dc2626', bg: '#fef2f2' };
    if (streak >= 3)  return { label: '⚡ Building',  color: '#3b82f6', bg: '#eff6ff' };
    return null;
  };

  const badge = getBadge();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      
      {/* Visual Indicator Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        
        {/* Flame Graphic */}
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          background: streak === 0 ? '#f1f5f9' : 'var(--accent-rose-light)',
          color: streak === 0 ? 'var(--text-muted)' : 'var(--accent-rose)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <Flame size={24} fill={streak === 0 ? 'transparent' : 'var(--accent-rose)'} />
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            background: 'var(--accent-rose)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '800',
            borderRadius: '10px',
            padding: '2px 6px',
            display: streak === 0 ? 'none' : 'block'
          }}>
            {streak}
          </div>
        </div>

        {/* Text descriptions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {getMessage()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>📝 {total_entries} total</span>
            <span>•</span>
            <span>Best: {longest_streak}d</span>
          </div>
        </div>

      </div>

      {/* Badges and action status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        
        {badge ? (
          <span style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '700',
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.color}30`
          }}>
            {badge.label}
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Calendar size={12} /> Active Journey
          </span>
        )}

        {journaled_today ? (
          <span style={{
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'var(--primary-wellness-light)',
            color: 'var(--primary-wellness)',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            ✓ Done today
          </span>
        ) : (
          <button
            onClick={() => navigate('/journal')}
            style={{
              padding: '6px 12px',
              background: 'var(--accent-blue-light)',
              color: 'var(--accent-blue)',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            <span>Write</span>
            <ChevronRight size={10} />
          </button>
        )}

      </div>

    </div>
  );
}