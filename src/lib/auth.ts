import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from './db';
import { User } from './types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'routy-secret-key-change-in-production');

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function createToken(userId: string): Promise<string> {
    return new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return { userId: payload.userId as string };
    } catch {
        return null;
    }
}

export async function getCurrentUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('routy-token')?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const result = await pool.query(
        'SELECT id, username, email, avatar_url, xp, level, created_at FROM users WHERE id = $1',
        [payload.userId]
    );

    return result.rows[0] || null;
}

export async function registerUser(
    username: string,
    email: string,
    password: string
): Promise<User> {
    const hashedPassword = await hashPassword(password);

    const result = await pool.query(
        `INSERT INTO users (username, email, password_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, username, email, avatar_url, xp, level, created_at`,
        [username, email, hashedPassword]
    );

    return result.rows[0];
}

export async function loginUser(
    email: string,
    password: string
): Promise<User | null> {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    const user = result.rows[0];
    if (!user) return null;

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return null;

    const { password_hash, ...safeUser } = user;
    return safeUser;
}
