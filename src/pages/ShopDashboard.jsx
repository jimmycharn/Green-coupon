import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { History, DollarSign, Bell, X, RefreshCw } from 'lucide-react';

export default function ShopDashboard() {
    const [profile, setProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showQRModal, setShowQRModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const previousBalanceRef = useRef(null);
    const previousTxCountRef = useRef(0);

    // Show notification
    const showNotification = async (amount, senderName) => {
        setNotification({ amount, senderName });
        // Vibrate on mobile
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
        setTimeout(() => setNotification(null), 4000);
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
            return user.id;
        }
        setLoading(false);
        return null;
    }, []);

    const fetchTransactions = useCallback(async (userId, checkNew = false) => {
        if (!userId) return;
        const { data } = await supabase
            .from('transactions')
            .select('*, sender:sender_id(full_name)')
            .eq('receiver_id', userId)
            .eq('type', 'payment')
            .order('created_at', { ascending: false });

        // Check for new transactions
        if (checkNew && data && data.length > previousTxCountRef.current && previousTxCountRef.current > 0) {
            const newTx = data[0];
            showNotification(newTx.amount, newTx.sender?.full_name || 'ลูกค้า');
        }

        if (data) {
            previousTxCountRef.current = data.length;
        }

        setTransactions(data || []);
    }, []);

    useEffect(() => {
        let userId = null;
        let pollingInterval = null;

        const init = async () => {
            userId = await fetchProfile();
            if (userId) {
                await fetchTransactions(userId);
                setLoading(false);

                // Poll for updates every 2 seconds
                pollingInterval = setInterval(() => {
                    fetchProfile();
                    fetchTransactions(userId, true);
                }, 2000);
            }
        };

        init();

        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, []);

    const handleRefresh = async () => {
        await fetchProfile();
        if (profile?.id) {
            await fetchTransactions(profile.id, true);
        }
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
        type: 'shop',
        name: profile?.full_name
    });

    return (
        <div className="space-y-6">
            {/* Payment Notification */}
            {notification && (
                <div className="fixed top-4 left-4 right-4 z-50 bg-green-500 text-white p-4 rounded-xl shadow-2xl animate-bounce">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white bg-opacity-20 p-2 rounded-full">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-medium">{notification.senderName} ชำระเงิน</p>
                                <p className="text-2xl font-bold">+฿{Number(notification.amount).toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={() => setNotification(null)} className="p-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white relative">
                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <h3 className="font-medium opacity-90">ยอดรายได้</h3>
                    </div>
                    <p className="text-4xl font-bold">฿{Number(profile?.balance || 0).toLocaleString()}</p>
                    <p className="text-sm opacity-75 mt-2">รอถอนเงิน</p>
                </div>

                {/* QR Code Card */}
                <button
                    onClick={() => setShowQRModal(true)}
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                >
                    <h3 className="text-gray-800 font-bold mb-4">QR รับเงิน</h3>
                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                        <QRCodeSVG value={qrData} size={120} />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">กดเพื่อขยาย</p>
                </button>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" />
                        <h3 className="font-bold text-gray-800">รายการขาย</h3>
                    </div>
                    <span className="text-sm text-gray-500">{transactions.length} รายการ</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="pb-3 font-medium">ลูกค้า</th>
                                <th className="pb-3 font-medium">เวลา</th>
                                <th className="pb-3 font-medium text-right">จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.map(tx => (
                                <tr key={tx.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="py-3 text-gray-800">{tx.sender?.full_name || 'ลูกค้า'}</td>
                                    <td className="py-3 text-gray-500 text-sm">
                                        {new Date(tx.created_at).toLocaleString('th-TH', {
                                            dateStyle: 'short',
                                            timeStyle: 'short'
                                        })}
                                    </td>
                                    <td className="py-3 text-right font-bold text-green-600">+฿{tx.amount}</td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="py-8 text-center text-gray-400">ยังไม่มีรายการขาย</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QR Modal */}
            {showQRModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-sm relative shadow-2xl">
                        <button
                            onClick={() => setShowQRModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">QR รับเงิน</h3>
                            <p className="text-gray-500 text-sm mb-6">ให้ลูกค้าสแกนเพื่อชำระเงิน</p>

                            <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-inner inline-block mb-4">
                                <QRCodeSVG
                                    value={qrData}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-gray-600 text-sm">ร้านค้า</p>
                                <p className="font-bold text-xl text-gray-800">{profile?.full_name || 'ไม่ระบุชื่อ'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
