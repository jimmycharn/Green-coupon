import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import ShopDashboard from './pages/ShopDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Navigate to="/login" replace />} />

                        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                            <Route path="/student" element={<StudentDashboard />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={['shop']} />}>
                            <Route path="/shop" element={<ShopDashboard />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
                            <Route path="/staff" element={<StaffDashboard />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                        </Route>
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
