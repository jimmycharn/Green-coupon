import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Lock, Mail } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            // Check role to redirect
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            if (profile.role === 'student') navigate('/student');
            else if (profile.role === 'shop') navigate('/shop');
            else if (profile.role === 'staff') navigate('/staff');
            else if (profile.role === 'admin') navigate('/admin');
            else navigate('/');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-full mb-4 shadow-lg">
                        <CreditCard className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Green Coupon</h1>
                    <p className="text-gray-500">ระบบคูปองโรงเรียน</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50"
                                placeholder="กรอก Email"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50"
                                placeholder="กรอกรหัสผ่าน"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>

                    <div className="flex justify-center mt-4">
                        <Link to="/forgot-password" className="text-sm text-green-600 hover:text-green-700 font-medium">
                            ลืมรหัสผ่าน?
                        </Link>
                    </div>
                </form>

                <p className="text-center text-gray-500 mt-6">
                    ยังไม่มีบัญชี?{' '}
                    <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
                        ลงทะเบียน
                    </Link>
                </p>
            </div>
        </div>
    );
}
