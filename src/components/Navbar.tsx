'use client';

import { User } from '@/lib/types';

interface NavbarProps {
    user: User | null;
    onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
    return (
        <nav className="navbar">
            <a href="/" className="navbar-brand">
                <div className="navbar-brand-icon">R</div>
                ROUTY
            </a>

            <div className="navbar-actions">
                {user ? (
                    <>
                        <a href="/dashboard" className="btn btn-ghost btn-sm">
                            Trees
                        </a>
                        <div className="navbar-user">
                            <div className="navbar-avatar">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-0)' }}>
                                    {user.username}
                                </div>
                                <div className="navbar-xp">
                                    {user.xp} XP · LV{user.level}
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={onLogout}>
                            Exit
                        </button>
                    </>
                ) : (
                    <a href="/auth" className="btn btn-primary btn-sm">
                        Start
                    </a>
                )}
            </div>
        </nav>
    );
}
