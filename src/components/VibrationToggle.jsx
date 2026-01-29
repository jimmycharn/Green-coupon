import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function VibrationToggle({ className = "" }) {
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('vibrationEnabled');
        if (stored === 'false') setEnabled(false);
    }, []);

    const toggle = () => {
        const newState = !enabled;
        setEnabled(newState);
        localStorage.setItem('vibrationEnabled', newState);

        // Haptic feedback when enabling
        if (newState && navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    return (
        <button
            onClick={toggle}
            className={`p-2 rounded-full transition-colors hover:bg-opacity-30 ${enabled ? 'bg-white bg-opacity-20 text-white' : 'bg-black bg-opacity-20 text-white opacity-75'
                } ${className}`}
            title={enabled ? 'ปิดการสั่น' : 'เปิดการสั่น'}
        >
            {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>
    );
}

// Helper to check if vibration is allowed
export const canVibrate = () => {
    return localStorage.getItem('vibrationEnabled') !== 'false' && !!navigator.vibrate;
};
