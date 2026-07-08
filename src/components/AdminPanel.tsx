import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, ShieldCheck, UserCheck, Key, UserMinus } from 'lucide-react';
import { User } from '../types.ts';
import { useToast } from './Toast.tsx';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const { showSuccess, showError } = useToast();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager' | 'member') => {
    if (userId === currentUser.id) {
      showError('❌ You cannot modify your own administrative role.');
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        showSuccess('✅ Member role updated successfully.');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      showError('❌ You cannot delete your own administrative session.');
      return;
    }

    if (!window.confirm('Are you absolutely certain you want to delete this workspace account permanently? This action is irreversible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        showSuccess('✅ User account deleted successfully.');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <div className="glass-panel shadow-lg rounded-3xl p-6 select-none space-y-6">
      
      {/* Title section */}
      <div className="flex items-center gap-3 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">System Admin Console</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Configure roles, audit user access tokens, and revoke memberships.</p>
        </div>
      </div>

      {/* Warning Box */}
      <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100/40 dark:border-rose-900/40 p-4 rounded-2xl flex gap-3 text-xs text-rose-800 dark:text-rose-300 font-medium">
        <Key className="w-5 h-5 text-rose-500 flex-shrink-0" />
        <div>
          <p className="font-bold">Privileged Administrative Operations Active</p>
          <p className="mt-1 leading-relaxed opacity-90">
            As an administrator, you possess authorization to modify member access tiers and delete profiles. Deleting an account cascades across active assignees, comments, and task owners. Use caution.
          </p>
        </div>
      </div>

      {/* Users List Grid Table */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Active Members List ({users.length})</h4>

        <div className="border border-slate-100/30 dark:border-slate-800/60 rounded-2xl overflow-hidden bg-slate-50/10 dark:bg-slate-900/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/40 dark:bg-slate-900/40 text-slate-400 font-black uppercase tracking-wider border-b border-slate-100/50 dark:border-slate-800/50">
                <th className="py-3 px-4 pl-6">Member Profile</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Access Level Role</th>
                <th className="py-3 px-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50 font-medium text-slate-700 dark:text-slate-300">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/10 dark:hover:bg-slate-800/20 transition-colors">
                  {/* Avatar & Name */}
                  <td className="py-3 px-4 pl-6 flex items-center gap-2.5">
                    <div 
                      className="w-7 h-7 rounded-lg text-white font-black flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: u.avatarColor }}
                    >
                      {u.name[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{u.name}</span>
                      {u.id === currentUser.id && <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Your Account</span>}
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{u.email}</td>

                  {/* Role select dropdown picker */}
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                      disabled={u.id === currentUser.id}
                      className="p-1.5 bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 appearance-none cursor-pointer pr-4"
                    >
                      <option value="member">Team Member</option>
                      <option value="manager">Project Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>

                  {/* Revoke button */}
                  <td className="py-3 px-4 pr-6 text-right">
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={u.id === currentUser.id}
                      className="p-1.5 bg-rose-50/80 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/40 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900 disabled:opacity-30 cursor-pointer transition-colors"
                      title="Delete User Account"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
