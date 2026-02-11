import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Scan, History, X, CreditCard, User, Bell, RefreshCw, Lock } from 'lucide-react';
import QRScanner from '../components/QRScanner';
import RealtimeStatus from '../components/RealtimeStatus';
import VibrationToggle, { canVibrate } from '../components/VibrationToggle';

export default function StudentDashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [notification, setNotification] = useState(null);
    const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const previousBalanceRef = useRef(null);
    const userIdRef = useRef(null);

    // Show notification
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        if (canVibrate()) {
            navigator.vibrate(200);
        }
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                previousBalanceRef.current = data.balance;
            }

            setProfile(data);
            userIdRef.current = user.id;
            return user.id;
        }
        setLoading(false);
        return null;
    }, []);

    const fetchTransactions = useCallback(async (userId) => {
        const uid = userId || userIdRef.current;
        if (!uid) return;
        const { data } = await supabase
            .from('transactions')
            .select('*, sender:sender_id(full_name), receiver:receiver_id(full_name)')
            .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
            .order('created_at', { ascending: false })
            .limit(10);
        setTransactions(data || []);
    }, []);

    useEffect(() => {
        let channel = null;
        let mounted = true;

        const init = async () => {
            const userId = await fetchProfile();
            if (mounted && userId) {
                await fetchTransactions(userId);
                setLoading(false);

                // Subscribe to Realtime
                // Use a unique channel name to avoid conflicts
                const channelName = `student_dashboard_${userId}_${Date.now()}`;
                console.log('Subscribing to channel:', channelName);

                channel = supabase
                    .channel(channelName)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'profiles',
                            filter: `id=eq.${userId}`
                        },
                        (payload) => {
                            console.log('Realtime update:', payload);
                            const oldBalance = previousBalanceRef.current || 0;
                            const newBalance = payload.new.balance;
                            const diff = newBalance - oldBalance;

                            setProfile(payload.new);
                            previousBalanceRef.current = newBalance;

                            if (diff > 0) {
                                showNotification(`+฿${diff.toLocaleString()} เติมเงินสำเร็จ!`, 'success');
                            } else if (diff < 0) {
                                showNotification(`-฿${Math.abs(diff).toLocaleString()}`, 'info');
                            }

                            fetchTransactions(userId);
                        }
                    )
                    .subscribe((status) => {
                        console.log('Realtime status:', status);
                        if (mounted) {
                            setRealtimeStatus(status);
                        }
                    });
            }
        };

        init();

        return () => {
            mounted = false;
            if (channel) {
                console.log('Unsubscribing from channel');
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const handleScan = async (data) => {
        setShowScanner(false);
        try {
            const shopData = JSON.parse(data);
            if (shopData.type !== 'shop') throw new Error('QR Code ไม่ถูกต้อง กรุณาสแกน QR ของร้านค้า');

            const amount = prompt(`ชำระเงินให้ ${shopData.name}\nกรอกจำนวนเงิน:`);
            if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;

            const { data: result, error } = await supabase.rpc('transfer_funds', {
                p_sender_id: profile.id,
                p_receiver_id: shopData.id,
                p_amount: parseFloat(amount),
                p_type: 'payment'
            });

            if (error) throw error;
            if (!result.success) throw new Error(result.message);

            showNotification(`ชำระเงิน ฿${parseFloat(amount).toLocaleString()} สำเร็จ!`);
            fetchProfile();
            fetchTransactions(profile.id);
        } catch (err) {
            alert(err.message);
        }
    };



    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert('รหัสผ่านไม่ตรงกัน');
            return;
        }
        if (newPassword.length < 6) {
            alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            alert('เปลี่ยนรหัสผ่านสำเร็จ');
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        await fetchProfile();
        await fetchTransactions();
        showNotification('รีเฟรชสำเร็จ', 'info');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const qrData = JSON.stringify({
        id: profile?.id,
        type: 'student',
        name: profile?.full_name,
        studentId: profile?.student_id
    });

    return (
        <div className="space-y-6">
            <RealtimeStatus status={realtimeStatus} />

            <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ดนักเรียน</h1>

            <div className="flex justify-end">
                <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sm text-green-600 hover:text-green-700 underline"
                >
                    เปลี่ยนรหัสผ่าน
                </button>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 animate-pulse ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                    <Bell className="w-5 h-5" />
                    <span className="font-medium">{notification.message}</span>
                </div>
            )}

            {/* Virtual Card */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-10 -mb-10"></div>

                {/* Refresh Button */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <VibrationToggle />
                    <button
                        onClick={handleRefresh}
                        className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                        title="รีเฟรช"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="w-5 h-5 text-green-200" />
                        <p className="text-green-100 text-sm">ยอดเงินคงเหลือ</p>
                    </div>
                    <h2 className="text-4xl font-bold mb-6">
                        ฿{Number(profile?.balance || 0).toLocaleString()}
                    </h2>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-green-200 text-xs uppercase tracking-wider">ชื่อ</p>
                            <p className="font-medium text-lg">{profile?.full_name || 'ไม่ระบุ'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-green-200 text-xs uppercase tracking-wider">รหัส</p>
                            <p className="font-medium">{profile?.student_id || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setShowScanner(true)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Scan className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-gray-700">สแกนจ่าย</span>
                </button>

                <button
                    onClick={() => setShowQRModal(true)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                        <QRCodeSVG value={qrData} size={70} />
                    </div>
                    <span className="font-medium text-gray-700 text-sm">QR ของฉัน</span>
                </button>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-4 text-gray-700">
                    <History className="w-5 h-5" />
                    <h3 className="font-bold">รายการล่าสุด</h3>
                </div>
                <div className="space-y-3">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-50">
                            <div>
                                <p className="font-medium text-gray-800">
                                    {tx.type === 'payment' ? `ชำระเงิน - ${tx.receiver?.full_name || 'ร้านค้า'}` :
                                        tx.type === 'topup' ? 'เติมเงิน' : 'คืนเงิน'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(tx.created_at).toLocaleString('th-TH', {
                                        dateStyle: 'short',
                                        timeStyle: 'short'
                                    })}
                                </p>
                            </div>
                            <span className={`font-bold ${tx.type === 'topup' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {tx.type === 'topup' ? '+' : '-'}฿{tx.amount}
                            </span>
                        </div>
                    ))}
                    {transactions.length === 0 && (
                        <p className="text-center text-gray-400 py-4">ยังไม่มีรายการ</p>
                    )}
                </div>
            </div>

            {/* QR Scanner Modal */}
            {showScanner && (
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* QR Code Modal */}
            {showQRModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
                        <button
                            onClick={() => setShowQRModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">QR Code ของฉัน</h3>
                            <p className="text-gray-500 text-sm mb-6">ให้เจ้าหน้าที่สแกนเพื่อเติมเงินหรือคืนเงิน</p>

                            <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-inner inline-block mb-6">
                                <QRCodeSVG value={qrData} size={200} level="H" includeMargin={true} />
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <User className="w-4 h-4" />
                                        <span className="text-sm">ชื่อ</span>
                                    </div>
                                    <span className="font-medium text-gray-800">{profile?.full_name || 'ไม่ระบุ'}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <CreditCard className="w-4 h-4" />
                                        <span className="text-sm">รหัส</span>
                                    </div>
                                    <span className="font-medium text-gray-800">{profile?.student_id || '-'}</span>
                                </div>

                                <div className="border-t border-gray-200 pt-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 text-sm">ยอดเงินคงเหลือ</span>
                                        <span className="font-bold text-xl text-green-600">
                                            ฿{Number(profile?.balance || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Reset Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-sm relative shadow-2xl transform transition-all scale-100">
                        <button
                            onClick={() => setShowPasswordModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Lock className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">เปลี่ยนรหัสผ่าน</h3>
                            <p className="text-gray-500 text-sm mt-1">กำหนดรหัสผ่านใหม่สำหรับการเข้าใช้งาน</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 ml-1">รหัสผ่านเดิม</label>
                                <input
                                    type="password"
                                    required
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 hover:bg-white"
                                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 ml-1">รหัสผ่านใหม่</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 hover:bg-white"
                                    placeholder="อย่างน้อย 6 ตัวอักษร"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 ml-1">ยืนยันรหัสผ่านใหม่</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 hover:bg-white"
                                    placeholder="กรอกอีกครั้ง"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                        กำลังบันทึก...
                                    </span>
                                ) : (
                                    'บันทึกการเปลี่ยนแปลง'
                                )}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                ลืมรหัสผ่าน?
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
