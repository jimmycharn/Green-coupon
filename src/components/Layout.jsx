import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, User, ShoppingBag, CreditCard } from 'lucide-react';

export default function Layout() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-green-600 text-white shadow-md">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold flex items-center gap-2">
                        <CreditCard className="w-6 h-6" />
                        Green Coupon
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-green-700 rounded-full transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
