import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md backdrop-blur-sm bg-opacity-95 transform transition-all hover:scale-[1.01]">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">ลืมรหัสผ่าน?</h1>
                    <p className="text-gray-500 text-sm">ไม่ต้องห่วง! กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
                </div>

                {success ? (
                    <div className="text-center animate-fade-in">
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 mb-6">
                            <div className="bg-green-100 p-3 rounded-full inline-flex mb-4 animate-bounce">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-green-800 mb-2">ส่งลิงก์เรียบร้อยแล้ว!</h3>
                            <p className="text-green-700 text-sm">
                                เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมล<br />
                                <span className="font-semibold">{email}</span><br />
                                เรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความของคุณ
                            </p>
                        </div>
                        <Link
                            to="/login"
                            className="text-green-600 hover:text-green-700 font-medium hover:underline flex items-center justify-center gap-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-3 animate-shake">
                                <div className="mt-0.5">⚠️</div>
                                <div>{error}</div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 ml-1">อีเมล</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-green-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 hover:bg-white"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    กำลังดำเนินการ...
                                </>
                            ) : (
                                'ส่งลิงก์รีเซ็ตรหัสผ่าน'
                            )}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">หรือ</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center text-gray-500 hover:text-gray-700 font-medium transition-colors hover:bg-gray-50 px-4 py-2 rounded-lg"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                กลับไปหน้าเข้าสู่ระบบ
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
