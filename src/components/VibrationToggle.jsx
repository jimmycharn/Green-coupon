import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function VibrationToggle({ role = 'default', className = "" }) {
    const storageKey = `vibrationEnabled_${role}`;
    const [enabled, setEnabled] = useState(() => {
        return localStorage.getItem(storageKey) !== 'false';
    });
    const [justToggled, setJustToggled] = useState(false);

    const toggle = () => {
        const newState = !enabled;
        setEnabled(newState);
        localStorage.setItem(storageKey, newState.toString());

        // Brief flash animation
        setJustToggled(true);
        setTimeout(() => setJustToggled(false), 600);

        // Haptic feedback when enabling
        if (newState && navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    return (
        <button
            onClick={toggle}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${justToggled ? 'scale-110' : 'scale-100'
                } ${enabled
                    ? 'bg-white bg-opacity-25 text-white hover:bg-opacity-35'
                    : 'bg-black bg-opacity-30 text-white text-opacity-60 hover:bg-opacity-40'
                } ${className}`}
            title={enabled ? 'ปิดการสั่น' : 'เปิดการสั่น'}
        >
            {enabled ? (
                <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>สั่น</span>
                </>
            ) : (
                <>
                    <BellOff className="w-3.5 h-3.5" />
                    <span>ไม่สั่น</span>
                </>
            )}
        </button>
    );
}

// Helper to check if vibration is allowed for a specific role
export const canVibrate = (role = 'default') => {
    return localStorage.getItem(`vibrationEnabled_${role}`) !== 'false' && !!navigator.vibrate;
};
