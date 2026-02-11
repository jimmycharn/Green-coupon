import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Check if user is authenticated (via magic link)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, might be expired or invalid link
                setError('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ');
            }
        };
        checkSession();
    }, []);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        if (password.length < 6) {
            setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center backdrop-blur-sm bg-opacity-95 animate-fade-in">
                    <div className="bg-green-100 p-4 rounded-full inline-flex mb-6 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
                    <p className="text-gray-500 mb-6">รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว<br />กำลังพาท่านไปหน้าเข้าสู่ระบบ...</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-100 mt-4 overflow-hidden">
                        <div className="bg-green-500 h-1.5 rounded-full animate-progress"></div>
                    </div>
                    {/* Add animation keyframes in standard CSS if needed, or rely on Tailwind utility hacks or just accept static if configuration missing */}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md backdrop-blur-sm bg-opacity-95 transform transition-all hover:scale-[1.01]">
                <div className="text-center mb-8">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Lock className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">ตั้งรหัสผ่านใหม่</h1>
                    <p className="text-gray-500 mt-2">กรุณากรอกรหัสผ่านใหม่ของคุณ</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>{error}</div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 ml-1">รหัสผ่านใหม่</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-green-500" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 hover:bg-white"
                                placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 ml-1">ยืนยันรหัสผ่านใหม่</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-green-500" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 hover:bg-white"
                                placeholder="กรอกรหัสผ่านอีกครั้ง"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                กำลังบันทึก...
                            </>
                        ) : (
                            'เปลี่ยนรหัสผ่าน'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
