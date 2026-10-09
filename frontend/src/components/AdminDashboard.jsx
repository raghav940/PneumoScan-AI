import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, Users, Activity, AlertTriangle, FileText, CheckCircle, ShieldAlert, UserCheck, UserX, Trash2, RotateCcw } from 'lucide-react';
import API_BASE from '../utils/api';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [analyticsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load administrator data. Ensure you have admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Change user role (promote to admin / demote to user)
  const handleChangeRole = async (user, newRole) => {
    if (user.role === newRole) return;
    setUpdatingUserId(user.id);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/admin/users/${user.id}/role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Delete specific user
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}" and all their scan records?`)) {
      return;
    }
    setDeletingUserId(user.id);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.filter(u => u.id !== user.id));
      // Refresh analytics
      const res = await axios.get(`${API_BASE}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      setAnalytics(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <Activity className="animate-spin text-cyan-400" size={36} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto p-4 sm:p-8 max-w-7xl relative z-10"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden neon-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-cyan-900/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-950/80 border border-purple-500/50 p-2.5 rounded-2xl text-purple-300">
              <Shield size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">Administrator Control Panel</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 border border-purple-500/40 text-purple-200">
                  RBAC
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Hospital Radiograph Metrics, User Management & Access Control</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-300 border border-red-500/30 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* System Metric Cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-black/40 border border-cyan-900/40 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-mono uppercase">Total Hospital Scans</span>
                <FileText size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {analytics.total_scans}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Across all registered clinicians</p>
            </div>

            <div className="bg-black/40 border border-cyan-900/40 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-mono uppercase">Active Users</span>
                <Users size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {analytics.total_users}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Authorized database accounts</p>
            </div>

            <div className="bg-black/40 border border-red-900/40 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-mono uppercase text-red-400">Pneumonia Positive</span>
                <ShieldAlert size={16} className="text-red-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono">
                {analytics.pneumonia_count}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {analytics.total_scans > 0 ? ((analytics.pneumonia_count / analytics.total_scans) * 100).toFixed(1) : 0}% detection rate
              </p>
            </div>

            <div className="bg-black/40 border border-purple-900/40 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-mono uppercase text-purple-300">Critical / Severe Alerts</span>
                <AlertTriangle size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
                {analytics.critical_count}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Immediate ICU intervention candidates</p>
            </div>
          </div>
        )}

        {/* User Management & Role-Based Access Control Table */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-cyan-400" />
              Manage Users & Change Role
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              Total: {users.length} accounts
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Username</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Role (Dropdown)</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Scans</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Registered</th>
                  <th className="py-3.5 px-6 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-xs font-mono text-gray-400">
                      #{u.id}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-white font-mono">
                      {u.username}
                    </td>
                    <td className="py-4 px-6 text-xs">
                      {/* Change User Type dropdown */}
                      <select
                        value={u.role}
                        disabled={updatingUserId === u.id}
                        onChange={(e) => handleChangeRole(u, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-xs border bg-black/80 focus:outline-none cursor-pointer ${
                          u.role === 'admin' 
                            ? 'border-purple-500/50 text-purple-300' 
                            : 'border-cyan-500/50 text-cyan-300'
                        }`}
                      >
                        <option value="user" className="bg-[#030712] text-cyan-300">Clinician (User)</option>
                        <option value="admin" className="bg-[#030712] text-purple-300">Administrator</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-sm font-mono text-gray-300 font-semibold">
                      {u.scan_count}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingUserId === u.id || u.username === 'admin_clinician'}
                        title={u.username === 'admin_clinician' ? "Root admin cannot be deleted" : "Delete user"}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                        Delete User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
