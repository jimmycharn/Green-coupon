import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Store, DollarSign, History, UserCheck, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalShops: 0,
        totalBalance: 0,
        pendingWithdrawals: 0
    });
    const [shops, setShops] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*');

            if (profiles) {
                const students = profiles.filter(p => p.role === 'student');
                const shopsList = profiles.filter(p => p.role === 'shop');

                setStats({
                    totalStudents: students.length,
                    totalShops: shopsList.length,
                    totalBalance: students.reduce((sum, s) => sum + Number(s.balance || 0), 0),
                    pendingWithdrawals: shopsList.reduce((sum, s) => sum + Number(s.balance || 0), 0)
                });

                setShops(shopsList);
            }

            // Fetch recent transactions
            const { data: txns } = await supabase
                .from('transactions')
                .select('*, sender:sender_id(full_name, role), receiver:receiver_id(full_name, role)')
                .order('created_at', { ascending: false })
                .limit(20);

            setTransactions(txns || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawal = async (shop) => {
        const amount = shop.balance;
        if (amount <= 0) {
            alert('ร้านค้านี้ไม่มียอดเงินที่ต้องถอน');
            return;
        }

        if (!confirm(`ยืนยันการจ่ายเงิน ฿${amount.toLocaleString()} ให้กับ ${shop.full_name}?`)) {
            return;
        }

        try {
            // Reset shop balance to 0
            const { error } = await supabase
                .from('profiles')
                .update({ balance: 0 })
                .eq('id', shop.id);

            if (error) throw error;

            alert('จ่ายเงินสำเร็จ!');
            fetchData();
        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ดผู้ดูแลระบบ</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">นักเรียน/ครู</p>
                            <p className="text-xl font-bold text-gray-800">{stats.totalStudents}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Store className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">ร้านค้า</p>
                            <p className="text-xl font-bold text-gray-800">{stats.totalShops}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">เงินในระบบ</p>
                            <p className="text-xl font-bold text-gray-800">฿{stats.totalBalance.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">รอจ่ายร้านค้า</p>
                            <p className="text-xl font-bold text-gray-800">฿{stats.pendingWithdrawals.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shop Withdrawals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    จ่ายเงินให้ร้านค้า
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="pb-3 font-medium">ชื่อร้าน</th>
                                <th className="pb-3 font-medium text-right">ยอดเงิน</th>
                                <th className="pb-3 font-medium text-right">การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {shops.map(shop => (
                                <tr key={shop.id} className="hover:bg-gray-50">
                                    <td className="py-3 text-gray-800">{shop.full_name || 'ไม่ระบุชื่อ'}</td>
                                    <td className="py-3 text-right font-bold text-green-600">฿{Number(shop.balance || 0).toLocaleString()}</td>
                                    <td className="py-3 text-right">
                                        <button
                                            onClick={() => handleWithdrawal(shop)}
                                            disabled={shop.balance <= 0}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            จ่ายเงิน
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {shops.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="py-8 text-center text-gray-400">ยังไม่มีร้านค้า</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    รายการล่าสุด
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="pb-3 font-medium">ประเภท</th>
                                <th className="pb-3 font-medium">ผู้ส่ง</th>
                                <th className="pb-3 font-medium">ผู้รับ</th>
                                <th className="pb-3 font-medium text-right">จำนวน</th>
                                <th className="pb-3 font-medium text-right">เวลา</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50">
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'topup' ? 'bg-green-100 text-green-700' :
                                                tx.type === 'payment' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-orange-100 text-orange-700'
                                            }`}>
                                            {tx.type === 'topup' ? 'เติมเงิน' : tx.type === 'payment' ? 'ชำระเงิน' : 'คืนเงิน'}
                                        </span>
                                    </td>
                                    <td className="py-3 text-gray-800">{tx.sender?.full_name || '-'}</td>
                                    <td className="py-3 text-gray-800">{tx.receiver?.full_name || '-'}</td>
                                    <td className="py-3 text-right font-bold">฿{tx.amount}</td>
                                    <td className="py-3 text-right text-gray-500 text-sm">
                                        {new Date(tx.created_at).toLocaleString('th-TH')}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-400">ยังไม่มีรายการ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
