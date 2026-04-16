import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0f172a',
            color: '#e2e8f0',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <AlertTriangle size={64} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '4rem', fontWeight: 800, margin: 0, color: '#f1f5f9' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Page Not Found</h2>
            <p style={{ color: '#94a3b8', maxWidth: 400, marginBottom: '2rem' }}>
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link to="/" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#FF4D4D',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 600
            }}>
                <Home size={18} />
                Back to Dashboard
            </Link>
        </div>
    );
}
