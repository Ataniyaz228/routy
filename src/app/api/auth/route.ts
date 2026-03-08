import { NextRequest, NextResponse } from 'next/server';
import { registerUser, loginUser, createToken, getCurrentUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const { action, username, email, password } = await req.json();

        if (action === 'register') {
            if (!username || !email || !password) {
                return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
            }

            const user = await registerUser(username, email, password);
            const token = await createToken(user.id);

            const cookieStore = await cookies();
            cookieStore.set('routy-token', token, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
            });

            return NextResponse.json({ user });
        }

        if (action === 'login') {
            if (!email || !password) {
                return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
            }

            const user = await loginUser(email, password);
            if (!user) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            const token = await createToken(user.id);

            const cookieStore = await cookies();
            cookieStore.set('routy-token', token, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            return NextResponse.json({ user });
        }

        if (action === 'logout') {
            const cookieStore = await cookies();
            cookieStore.delete('routy-token');
            return NextResponse.json({ success: true });
        }

        if (action === 'me') {
            const user = await getCurrentUser();
            if (!user) {
                return NextResponse.json({ user: null });
            }
            return NextResponse.json({ user });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: unknown) {
        console.error('Auth error:', error);
        const message = error instanceof Error ? error.message : 'Auth failed';

        // Handle duplicate email/username
        if (message.includes('duplicate key') || message.includes('unique')) {
            return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
