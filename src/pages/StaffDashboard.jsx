import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import QRScanner from '../components/QRScanner';
import RealtimeStatus from '../components/RealtimeStatus';
import VibrationToggle, { canVibrate } from '../components/VibrationToggle';
import { PlusCircle, MinusCircle, UserCheck, CheckCircle, History, CreditCard, Search, Users, Wallet, RefreshCw, Lock } from 'lucide-react';

export default function StaffDashboard() {
    const [mode, setMode] = useState(null); // 'topup' or 'refund'
    const [showScanner, setShowScanner] = useState(false);
    const [showStudentList, setShowStudentList] = useState(false);
    const [scannedUser, setScannedUser] = useState(null);
    const [scannedUserBalance, setScannedUserBalance] = useState(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [staffBalance, setStaffBalance] = useState(0); // Cash on Hand
    const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');

    // Change Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Fetch staff profile (for Cash on Hand)
    const fetchStaffProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', user.id)
                .single();
            setStaffBalance(data?.balance || 0);
        }
    }, []);

    // Fetch recent transactions by this staff
    const fetchRecentTransactions = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('transactions')
                .select('*, receiver:receiver_id(full_name), sender:sender_id(full_name)')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .in('type', ['topup', 'refund'])
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentTransactions(data || []);
        }
    }, []);

    // Fetch all students
    const fetchStudents = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'student')
            .order('full_name');
        setStudents(data || []);
    };

    useEffect(() => {
        fetchStaffProfile();
        fetchRecentTransactions();

        // Better approach: Set up subscription after getting user ID
        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel(`staff_${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log('Realtime update:', payload);
                        setStaffBalance(payload.new.balance);
                        if (canVibrate()) navigator.vibrate([200, 100, 200]);
                    }
                )
                .subscribe((status) => {
                    console.log('Staff Realtime status:', status);
                    setRealtimeStatus(status);
                });

            return () => {
                supabase.removeChannel(channel);
            };
        };

        const cleanupPromise = setupRealtime();

        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };

    }, []);

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            alert('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        if (newPassword.length < 6) {
            alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setLoading(true);

        try {
            // 1. Verify old password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: oldPassword,
            });

            if (signInError) {
                throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
            }

            // 2. Update to new password
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            alert('เปลี่ยนรหัสผ่านสำเร็จ');
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
            setOldPassword('');
        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (data) => {
        try {
            const userData = JSON.parse(data);
            if (userData.type !== 'student') throw new Error('QR Code ไม่ถูกต้อง กรุณาสแกน QR ของนักเรียน');

            // Fetch current balance
            const { data: profile } = await supabase
                .from('profiles')
                .select('balance, full_name')
                .eq('id', userData.id)
                .single();

            setScannedUser({ ...userData, full_name: profile?.full_name || userData.name });
            setScannedUserBalance(profile?.balance || 0);
            setShowScanner(false);
        } catch (err) {
            alert(err.message);
            setShowScanner(false);
        }
    };

    // Select student from list (manual selection)
    const handleSelectStudent = (student) => {
        setScannedUser({
            id: student.id,
            type: 'student',
            name: student.full_name,
            full_name: student.full_name
        });
        setScannedUserBalance(student.balance || 0);
        setShowStudentList(false);
        setSearchTerm('');
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        if (!scannedUser || !amount) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data: result, error } = await supabase.rpc('transfer_funds', {
                p_sender_id: mode === 'refund' ? scannedUser.id : user.id,
                p_receiver_id: mode === 'topup' ? scannedUser.id : user.id,
                p_amount: parseFloat(amount),
                p_type: mode
            });

            if (error) throw error;
            if (!result.success) throw new Error(result.message);

            // Calculate new balance
            const newBalance = mode === 'topup'
                ? scannedUserBalance + parseFloat(amount)
                : scannedUserBalance - parseFloat(amount);

            // Show success
            setSuccess({
                type: mode,
                amount: parseFloat(amount),
                user: scannedUser.full_name || scannedUser.name,
                newBalance: newBalance
            });

            // Vibrate
            if (canVibrate()) {
                navigator.vibrate([100, 50, 100]);
            }

            fetchRecentTransactions();
            fetchStaffProfile(); // Update Cash on Hand

            // Reset after 3 seconds
            setTimeout(() => {
                setSuccess(null);
                setScannedUser(null);
                setScannedUserBalance(null);
                setAmount('');
                setMode(null);
            }, 3000);

        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Quick amount buttons
    const quickAmounts = [10, 20, 50, 100, 200, 500];

    // Filtered students
    const filteredStudents = students.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-md mx-auto space-y-6">
            <RealtimeStatus status={realtimeStatus} />
            <div className="text-center relative">
                <h1 className="text-2xl font-bold text-gray-800">จุดขายคูปอง</h1>
                <p className="text-gray-500">เลือกการดำเนินการ</p>
                <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sm text-green-600 hover:text-green-700 underline mt-1"
                >
                    เปลี่ยนรหัสผ่าน
                </button>
            </div>

            {/* Cash on Hand Card */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>

                {/* Refresh & Vibration */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <VibrationToggle />
                    <button
                        onClick={fetchStaffProfile}
                        className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                        title="รีเฟรช"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-5 h-5 text-purple-200" />
                        <p className="text-purple-100 text-sm">เงินสดที่จุดขาย</p>
                    </div>
                    <h2 className="text-4xl font-bold">
                        ฿{Number(staffBalance || 0).toLocaleString()}
                    </h2>
                </div>
            </div>

            {/* Success Screen */}
            {success && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 ${success.type === 'topup' ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                    <div className="text-center text-white p-8">
                        <CheckCircle className="w-20 h-20 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-2xl font-bold mb-2">
                            {success.type === 'topup' ? 'เติมเงินสำเร็จ!' : 'คืนเงินสำเร็จ!'}
                        </h2>
                        <p className="text-xl mb-4">{success.user}</p>
                        <div className="bg-white bg-opacity-20 rounded-xl p-4 mb-4">
                            <p className="text-sm opacity-75">จำนวนเงิน</p>
                            <p className="text-4xl font-bold">
                                {success.type === 'topup' ? '+' : '-'}฿{success.amount.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-xl p-4">
                            <p className="text-sm opacity-75">ยอดเงินคงเหลือ</p>
                            <p className="text-3xl font-bold">฿{success.newBalance.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Student List Modal */}
            {showStudentList && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">เลือกนักเรียน</h3>
                                <button
                                    onClick={() => { setShowStudentList(false); setSearchTerm(''); }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อหรือรหัส..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredStudents.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">ไม่พบนักเรียน</p>
                            ) : (
                                filteredStudents.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => handleSelectStudent(student)}
                                        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-50 text-left"
                                    >
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <UserCheck className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{student.full_name || 'ไม่ระบุชื่อ'}</p>
                                            <p className="text-sm text-gray-500">{student.student_id || 'ไม่มีรหัส'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-600">฿{Number(student.balance || 0).toLocaleString()}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!mode ? (
                <>
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => { setMode('topup'); setShowScanner(true); }}
                            className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white flex flex-col items-center gap-3 active:scale-95 transition-transform"
                        >
                            <div className="bg-white bg-opacity-20 p-4 rounded-full">
                                <PlusCircle className="w-10 h-10" />
                            </div>
                            <span className="font-bold text-lg">เติมเงิน</span>
                        </button>

                        <button
                            onClick={() => { setMode('refund'); setShowScanner(true); }}
                            className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-xl shadow-lg text-white flex flex-col items-center gap-3 active:scale-95 transition-transform"
                        >
                            <div className="bg-white bg-opacity-20 p-4 rounded-full">
                                <MinusCircle className="w-10 h-10" />
                            </div>
                            <span className="font-bold text-lg">คืนเงิน</span>
                        </button>
                    </div>

                    {/* Recent Transactions */}
                    {recentTransactions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-4 text-gray-700">
                                <History className="w-5 h-5" />
                                <h3 className="font-bold">รายการล่าสุด</h3>
                            </div>
                            <div className="space-y-2">
                                {recentTransactions.map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-50">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {tx.type === 'topup' ? tx.receiver?.full_name : tx.sender?.full_name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {tx.type === 'topup' ? 'เติมเงิน' : 'คืนเงิน'} • {new Date(tx.created_at).toLocaleTimeString('th-TH', { timeStyle: 'short' })}
                                            </p>
                                        </div>
                                        <span className={`font-bold ${tx.type === 'topup' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {tx.type === 'topup' ? '+' : '-'}฿{tx.amount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {mode === 'topup' ? (
                                <PlusCircle className="text-green-600" />
                            ) : (
                                <MinusCircle className="text-orange-600" />
                            )}
                            {mode === 'topup' ? 'เติมเงิน' : 'คืนเงิน'}
                        </h2>
                        <button
                            onClick={() => { setMode(null); setScannedUser(null); setScannedUserBalance(null); }}
                            className="text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100"
                        >
                            ยกเลิก
                        </button>
                    </div>

                    {!scannedUser ? (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowScanner(true)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                📷 สแกน QR นักเรียน
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">หรือ</span>
                                </div>
                            </div>

                            <button
                                onClick={() => { fetchStudents(); setShowStudentList(true); }}
                                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-8 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Users className="w-5 h-5" />
                                เลือกจากรายชื่อ
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleTransaction} className="space-y-6">
                            {/* Scanned User Info */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-3 rounded-full">
                                        <UserCheck className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 uppercase">นักเรียน/ครู</p>
                                        <p className="font-bold text-gray-800 text-lg">{scannedUser.full_name || scannedUser.name}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setScannedUser(null); setScannedUserBalance(null); }}
                                        className="text-gray-400 hover:text-gray-600 text-sm"
                                    >
                                        เปลี่ยน
                                    </button>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <CreditCard className="w-4 h-4" />
                                        <span className="text-sm">ยอดเงินปัจจุบัน</span>
                                    </div>
                                    <span className="font-bold text-lg text-green-600">฿{Number(scannedUserBalance).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนเงิน (บาท)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-4 text-2xl font-bold text-center border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setAmount(amt.toString())}
                                        className={`py-3 rounded-lg font-medium transition-colors ${amount === amt.toString()
                                            ? mode === 'topup' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        ฿{amt}
                                    </button>
                                ))}
                            </div>

                            {/* Preview */}
                            {amount && (
                                <div className={`p-4 rounded-xl ${mode === 'topup' ? 'bg-green-50' : 'bg-orange-50'}`}>
                                    <p className="text-sm text-gray-600 text-center">ยอดเงินหลังทำรายการ</p>
                                    <p className={`text-3xl font-bold text-center ${mode === 'topup' ? 'text-green-600' : 'text-orange-600'}`}>
                                        ฿{(mode === 'topup'
                                            ? scannedUserBalance + parseFloat(amount || 0)
                                            : scannedUserBalance - parseFloat(amount || 0)
                                        ).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !amount}
                                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'topup'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                                    }`}
                            >
                                {loading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {showScanner && (
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}


            {/* Change Password Modal */}
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
