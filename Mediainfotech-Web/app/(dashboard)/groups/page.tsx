'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { UsersRound, Plus, UserPlus, User, Trash2, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';

export default function GroupsPage() {
  const { hasPermission } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Group Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Manage Group Members Modal State
  const [manageGroup, setManageGroup] = useState<any | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/api/groups');
      setGroups(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users?limit=100');
      setUsersList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserToggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/groups', {
        name,
        description,
        color,
        memberIds: selectedUserIds,
      });
      setModalOpen(false);
      setName('');
      setDescription('');
      setSelectedUserIds([]);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageGroup || !addMemberUserId) return;
    try {
      await api.post(`/api/groups/${manageGroup.id}/members`, {
        userId: addMemberUserId,
      });
      setAddMemberUserId('');
      // Refresh managed group detail & list
      const updated = await api.get(`/api/groups/${manageGroup.id}`);
      setManageGroup(updated.data);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add user to group');
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      await api.delete(`/api/groups/${groupId}/members/${userId}`);
      if (manageGroup && manageGroup.id === groupId) {
        const updated = await api.get(`/api/groups/${groupId}`);
        setManageGroup(updated.data);
      }
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove user');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Groups & Teams"
        subtitle="Create groups using system users, assign members, and manage team rosters."
        icon={<UsersRound className="text-blue-400" size={28} />}
        action={
          hasPermission('groups', 'create') ? (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/25"
            >
              <Plus size={16} />
              <span>Create New Group</span>
            </button>
          ) : undefined
        }
      />

      {/* Groups Cards Grid */}
      {loading ? (
        <div className="text-xs text-slate-400">Loading company groups...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.length === 0 ? (
            <EmptyState message="No groups created yet." />
          ) : (
            groups.map((g) => (
              <div key={g.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md"
                      style={{ backgroundColor: g.color || '#3b82f6' }}
                    >
                      <UsersRound size={20} />
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                      {g.members?.length || g._count?.members || 0} Members
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-white text-base">{g.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{g.description || 'No description provided.'}</p>
                  </div>

                  {/* Member Avatars / List Preview */}
                  <div className="pt-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1.5">Group Members</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.members && g.members.length > 0 ? (
                        g.members.map((m: any) => (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] flex items-center space-x-1"
                          >
                            <User size={10} className="text-blue-400" />
                            <span>{m.user?.firstName} {m.user?.lastName}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500">No members added yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mt-4">
                  <span>Created by {g.createdBy?.firstName}</span>
                  <button
                    onClick={() => setManageGroup(g)}
                    className="text-blue-400 hover:text-blue-300 font-semibold transition flex items-center space-x-1"
                  >
                    <UserPlus size={14} />
                    <span>Manage Members</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Group Modal with User Selection */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Group"
        icon={<UsersRound size={20} className="text-blue-400" />}
        maxWidth="max-w-lg"
      >
            <form onSubmit={handleCreate} className="space-y-4">
              <FormField label="Group Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Surveillance Technicians"
                  className={inputClassName}
                  required
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Purpose of this group..."
                  className={textareaClassName}
                />
              </FormField>

              <FormField label="Badge Color">
                <div className="flex items-center space-x-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-xl border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </FormField>

              {/* User Selection Checkbox Roster */}
              <FormField label={`Select Users / Employees to Add to Group (${selectedUserIds.length} Selected)`}>
                <div className="space-y-1.5 max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {usersList.length === 0 ? (
                    <p className="text-xs text-slate-500">No users found.</p>
                  ) : (
                    usersList.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleUserToggle(u.id)}
                          className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                            isSelected
                              ? 'bg-blue-600/20 border border-blue-500/40 text-white font-semibold'
                              : 'bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px] text-white">
                              {u.firstName?.charAt(0)}
                            </div>
                            <div>
                              <p>{u.firstName} {u.lastName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">@{u.username} • {u.role}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700'}`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </FormField>

              <ModalFooter
                onClose={() => setModalOpen(false)}
                submitLabel={submitting ? 'Creating...' : 'Create Group'}
                submitting={submitting}
              />
            </form>
      </Modal>

      {/* Manage Members Modal */}
      <Modal
        open={!!manageGroup}
        onClose={() => setManageGroup(null)}
        title={`${manageGroup?.name || ''} Members`}
        maxWidth="max-w-lg"
      >
            {manageGroup && (
              <>
                <p className="text-xs text-slate-400 -mt-2">Add or remove users from this group roster.</p>

                {/* Add User to Group Form */}
                <form onSubmit={handleAddMember} className="flex items-center space-x-2">
                  <select
                    value={addMemberUserId}
                    onChange={(e) => setAddMemberUserId(e.target.value)}
                    className={`flex-1 ${inputClassName}`}
                    required
                  >
                    <option value="">Select User to Add...</option>
                    {usersList
                      .filter((u) => !manageGroup.members?.some((m: any) => m.userId === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} (@{u.username})
                        </option>
                      ))}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                  >
                    Add User
                  </button>
                </form>

                {/* Group Members List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Current Group Roster</p>
                  {manageGroup.members?.length === 0 ? (
                    <p className="text-xs text-slate-500 p-3">No members in group.</p>
                  ) : (
                    manageGroup.members?.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                            {m.user?.firstName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {m.user?.firstName} {m.user?.lastName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">{m.user?.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveMember(manageGroup.id, m.userId)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                          title="Remove User from Group"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
      </Modal>
    </div>
  );
}
