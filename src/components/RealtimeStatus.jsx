import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function RealtimeStatus({ status }) {
    // status can be: 'SUBSCRIBED', 'TIMED_OUT', 'CLOSED', 'CHANNEL_ERROR', 'CONNECTING'

    const getStatusConfig = () => {
        switch (status) {
            case 'SUBSCRIBED':
                return {
                    color: 'bg-green-500',
                    text: 'Online',
                    icon: <Wifi className="w-3 h-3 text-white" />
                };
            case 'CONNECTING':
                return {
                    color: 'bg-yellow-500',
                    text: 'Connecting...',
                    icon: <Wifi className="w-3 h-3 text-white opacity-50" />
                };
            case 'TIMED_OUT':
            case 'CLOSED':
            case 'CHANNEL_ERROR':
            default:
                return {
                    color: 'bg-red-500',
                    text: 'Offline',
                    icon: <WifiOff className="w-3 h-3 text-white" />
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md ${config.color} transition-all duration-300`}>
            {config.icon}
            <span className="text-xs font-bold text-white">{config.text}</span>
        </div>
    );
}
