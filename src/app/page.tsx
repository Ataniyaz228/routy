'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/lib/types';

const SUGGESTIONS = [
  'Become a Web Developer',
  'Learn Machine Learning',
  'Master Guitar',
  'Learn Japanese',
  'Become a Data Scientist',
  'Learn UI/UX Design',
  'Master Chess',
  'Learn Digital Marketing',
];

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'me' }),
    })
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => { });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(`/tree/${data.treeId}`);
      } else {
        alert(data.error || 'Failed to generate tree');
      }
    } catch {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
  };

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div className="loading-text">Building your skill tree...</div>
        </div>
      )}

      <main className="landing">
        {/* Floating decoration */}
        <div className="floating-nodes">
          <div className="floating-node" />
          <div className="floating-node" />
          <div className="floating-node" />
          <div className="floating-node" />
          <div className="floating-node" />
          <div className="floating-node" />
          <div className="floating-node-line" />
          <div className="floating-node-line" />
        </div>

        <div className="landing-hero">
          <div className="landing-badge">
            AI-Powered Learning Paths
          </div>

          <h1 className="landing-title">
            Your Journey,<br />Your Skill Tree
          </h1>

          <p className="landing-subtitle">
            Transform any learning goal into an interactive RPG-style skill tree.
            Complete quests, unlock new branches, and level up your knowledge.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="landing-input-wrapper">
              <input
                className="input input-lg"
                type="text"
                placeholder="What do you want to master?"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={loading}
              />
              <button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={loading || !goal.trim()}
              >
                {loading ? '...' : '→'} Generate
              </button>
            </div>
          </form>

          <div className="landing-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="suggestion-chip"
                onClick={() => setGoal(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
