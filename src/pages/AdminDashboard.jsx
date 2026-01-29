import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Users, Store, DollarSign, History, UserCheck, AlertCircle, Edit, Save, X, Plus, Wallet, Coins } from 'lucide-react';

// Create a separate client for creating users to avoid signing out the admin
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const adminCreatorClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalShops: 0,
        totalStaff: 0,
        totalBalance: 0,
        pendingWithdrawals: 0,
        cashOnHand: 0,
        adminBalance: 0
    });
    const [users, setUsers] = useState([]);
    const [cashPoints, setCashPoints] = useState([]); // Shops and Staff
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create User Form State
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'student',
        studentId: ''
    });
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get current admin's balance
            const { data: { user } } = await supabase.auth.getUser();
            let currentAdminBalance = 0;
            if (user) {
                const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', user.id)
                    .single();
                currentAdminBalance = adminProfile?.balance || 0;
            }

            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profiles) {
                const students = profiles.filter(p => p.role === 'student');
                const shopsList = profiles.filter(p => p.role === 'shop');
                const staffList = profiles.filter(p => p.role === 'staff');

                // Shops and Staff for Cash Management
                const points = profiles.filter(p => p.role === 'shop' || p.role === 'staff');

                setStats({
                    totalStudents: students.length,
                    totalShops: shopsList.length,
                    totalStaff: staffList.length,
                    totalBalance: students.reduce((sum, s) => sum + Number(s.balance || 0), 0),
                    pendingWithdrawals: shopsList.reduce((sum, s) => sum + Number(s.balance || 0), 0),
                    cashOnHand: staffList.reduce((sum, s) => sum + Number(s.balance || 0), 0),
                    adminBalance: currentAdminBalance
                });

                setUsers(profiles);
                setCashPoints(points);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const { data, error } = await adminCreatorClient.auth.signUp({
                email: newUser.email,
                password: newUser.password,
                options: {
                    data: {
                        full_name: newUser.fullName,
                        role: newUser.role,
                        student_id: newUser.studentId
                    }
                }
            });

            if (error) throw error;

            if (data?.user) {
                await new Promise(r => setTimeout(r, 1000));
                await supabase
                    .from('profiles')
                    .update({
                        full_name: newUser.fullName,
                        role: newUser.role,
                        student_id: newUser.studentId
                    })
                    .eq('id', data.user.id);
            }

            alert('สร้างผู้ใช้งานสำเร็จ!');
            setShowCreateModal(false);
            setNewUser({ email: '', password: '', fullName: '', role: 'student', studentId: '' });
            fetchData();

        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleUpdateRole = async (userId, newRole, newName, newStudentId) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    role: newRole,
                    full_name: newName,
                    student_id: newStudentId
                })
                .eq('id', userId);

            if (error) throw error;

            alert('อัพเดทข้อมูลสำเร็จ!');
            setEditingUser(null);
            fetchData();
        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    const handleCashAction = async (user) => {
        const amount = user.balance;
        if (amount <= 0) {
            alert('ไม่มียอดเงินที่ต้องจัดการ');
            return;
        }

        const actionText = user.role === 'shop' ? 'จ่ายเงินให้' : 'เก็บเงินจาก';

        if (!confirm(`ยืนยันการ${actionText} ${user.full_name} จำนวน ฿${amount.toLocaleString()}?`)) {
            return;
        }

        try {
            const actionType = user.role === 'staff' ? 'collect_from_staff' : 'pay_shop';

            const { data: result, error } = await supabase.rpc('admin_handle_cash', {
                target_user_id: user.id,
                action_type: actionType
            });

            if (error) throw error;

            if (!result.success) {
                throw new Error(result.message);
            }

            alert(result.message);
            fetchData();
        } catch (error) {
            console.error('Error handling cash:', error);
            alert('เกิดข้อผิดพลาด: ' + (error.message || error.error_description || 'Unknown error'));
        }
    };

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ดผู้ดูแลระบบ</h1>

            {/* Admin Balance Card */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Coins className="w-5 h-5 text-red-200" />
                        <p className="text-red-100 text-sm">เงินสด Admin</p>
                    </div>
                    <h2 className="text-4xl font-bold">
                        ฿{Number(stats.adminBalance || 0).toLocaleString()}
                    </h2>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">ผู้ใช้งานทั้งหมด</p>
                            <p className="text-xl font-bold text-gray-800">{users.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">เงินในระบบ (นักเรียน)</p>
                            <p className="text-xl font-bold text-gray-800">฿{stats.totalBalance.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <Store className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">รอจ่ายร้านค้า</p>
                            <p className="text-xl font-bold text-gray-800">฿{stats.pendingWithdrawals.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Wallet className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">เงินสดที่จุดขาย</p>
                            <p className="text-xl font-bold text-gray-800">฿{stats.cashOnHand.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        จัดการผู้ใช้งาน
                    </h2>
                    <div className="flex gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none w-full md:w-64"
                        />
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่มผู้ใช้
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="pb-3 font-medium">ชื่อ-นามสกุล</th>
                                <th className="pb-3 font-medium">สถานะ</th>
                                <th className="pb-3 font-medium">รหัส/รายละเอียด</th>
                                <th className="pb-3 font-medium text-right">ยอดเงิน</th>
                                <th className="pb-3 font-medium text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="py-3">
                                        {editingUser?.id === user.id ? (
                                            <input
                                                type="text"
                                                defaultValue={user.full_name}
                                                id={`name-${user.id}`}
                                                className="border border-gray-300 rounded px-2 py-1 w-full"
                                            />
                                        ) : (
                                            <div>
                                                <p className="font-medium text-gray-800">{user.full_name}</p>
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3">
                                        {editingUser?.id === user.id ? (
                                            <select
                                                defaultValue={user.role}
                                                id={`role-${user.id}`}
                                                className="border border-gray-300 rounded px-2 py-1"
                                            >
                                                <option value="student">นักเรียน</option>
                                                <option value="shop">ร้านค้า</option>
                                                <option value="staff">เจ้าหน้าที่ (Staff)</option>
                                                <option value="admin">ผู้ดูแลระบบ</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                                user.role === 'staff' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'shop' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                }`}>
                                                {user.role === 'admin' ? 'Admin' :
                                                    user.role === 'staff' ? 'Staff' :
                                                        user.role === 'shop' ? 'ร้านค้า' : 'นักเรียน'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 text-sm text-gray-500">
                                        {editingUser?.id === user.id ? (
                                            <input
                                                type="text"
                                                defaultValue={user.student_id}
                                                id={`sid-${user.id}`}
                                                className="border border-gray-300 rounded px-2 py-1 w-24"
                                                placeholder="รหัส"
                                            />
                                        ) : (
                                            user.student_id || '-'
                                        )}
                                    </td>
                                    <td className="py-3 text-right font-bold text-gray-700">
                                        ฿{Number(user.balance || 0).toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right">
                                        {editingUser?.id === user.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        const newRole = document.getElementById(`role-${user.id}`).value;
                                                        const newName = document.getElementById(`name-${user.id}`).value;
                                                        const newSid = document.getElementById(`sid-${user.id}`).value;
                                                        handleUpdateRole(user.id, newRole, newName, newSid);
                                                    }}
                                                    className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingUser(null)}
                                                    className="bg-gray-200 text-gray-600 p-1 rounded hover:bg-gray-300"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                {(user.role === 'shop' || user.role === 'staff') && (
                                                    <button
                                                        onClick={() => handleCashAction(user)}
                                                        className={`${user.role === 'shop' ? 'text-orange-500 hover:text-orange-700' : 'text-purple-500 hover:text-purple-700'} p-1`}
                                                        title={user.role === 'shop' ? 'จ่ายเงินให้ร้านค้า' : 'เก็บเงินจากจุดขาย'}
                                                    >
                                                        {user.role === 'shop' ? <Wallet className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="text-gray-400 hover:text-blue-600 p-1"
                                                    title="แก้ไข"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">เพิ่มผู้ใช้งานใหม่</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล / ชื่อร้าน</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.fullName}
                                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                >
                                    <option value="student">นักเรียน</option>
                                    <option value="shop">ร้านค้า</option>
                                    <option value="staff">เจ้าหน้าที่ (Staff)</option>
                                    <option value="admin">ผู้ดูแลระบบ</option>
                                </select>
                            </div>
                            {newUser.role === 'student' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รหัสนักเรียน</label>
                                    <input
                                        type="text"
                                        value={newUser.studentId}
                                        onChange={e => setNewUser({ ...newUser, studentId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={createLoading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors mt-4 disabled:opacity-50"
                            >
                                {createLoading ? 'กำลังสร้าง...' : 'สร้างผู้ใช้งาน'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
