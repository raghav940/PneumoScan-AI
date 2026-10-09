import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, Users, Activity, AlertTriangle, FileText, CheckCircle, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import API_BASE from '../utils/api';
import DiagnosisBadge from './DiagnosisBadge';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [analyticsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load administrator data. Ensure you have admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleRole = async (user) => {
    const targetRole = user.role === 'admin' ? 'user' : 'admin';
    setUpdatingUserId(user.id);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/admin/users/${user.id}/role`, { role: targetRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: targetRole } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Role update failed');
    } finally {
      setUpdatingUserId(null);
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
              <p className="text-xs text-gray-400 mt-1">System Audit, Hospital Radiograph Metrics & Access Control</p>
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
                <span className="text-xs font-mono uppercase">Active Clinicians</span>
                <Users size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {analytics.total_users}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Authorized system accounts</p>
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
              Clinician Accounts & Role Permissions
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              Total: {users.length} registered
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">User ID</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Username</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Scans Submitted</th>
                  <th className="py-3.5 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="py-3.5 px-center text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Access Control</th>
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
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                        u.role === 'admin' 
                          ? 'bg-purple-950/80 border border-purple-500/50 text-purple-300' 
                          : 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-mono text-gray-300 font-semibold">
                      {u.scan_count}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleRole(u)}
                        disabled={updatingUserId === u.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto transition-all ${
                          u.role === 'admin'
                            ? 'bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300'
                            : 'bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300'
                        } disabled:opacity-50`}
                      >
                        {u.role === 'admin' ? (
                          <>
                            <UserX size={14} /> Demote to Clinician
                          </>
                        ) : (
                          <>
                            <UserCheck size={14} /> Promote to Admin
                          </>
                        )}
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
