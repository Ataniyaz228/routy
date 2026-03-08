'use client';

import { useState } from 'react';

interface AuthFormProps {
    onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: mode,
                    username: mode === 'register' ? username : undefined,
                    email,
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                return;
            }

            onSuccess();
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card glass-panel">
                <h1 className="auth-title">
                    {mode === 'login' ? 'Welcome Back' : 'Begin Your Quest'}
                </h1>
                <p className="auth-subtitle">
                    {mode === 'login'
                        ? 'Continue your learning adventure'
                        : 'Create your account and start building skill trees'}
                </p>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <>
                            <label>Username</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Choose a username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                            />
                        </>
                    )}

                    <label>Email</label>
                    <input
                        className="input"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label>Password</label>
                    <input
                        className="input"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />

                    <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                        {loading ? (
                            <span className="spinner spinner-sm" />
                        ) : mode === 'login' ? (
                            'Sign In'
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-toggle">
                    {mode === 'login' ? (
                        <>
                            Don&apos;t have an account?{' '}
                            <span onClick={() => { setMode('register'); setError(''); }}>
                                Sign Up
                            </span>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <span onClick={() => { setMode('login'); setError(''); }}>
                                Sign In
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
