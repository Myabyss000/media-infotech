'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  UsersRound,
  Plus,
  UserPlus,
  User,
  Trash2,
  Check,
  MapPin,
  Globe,
  MessageSquare,
  Megaphone,
  AlertTriangle,
  Pin,
  Send,
  Navigation,
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  LocateFixed,
  Shield,
  FileText,
  Zap,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { MapPicker } from '@/components/ui/MapPicker';

export default function GroupsPage() {
  const { user, hasPermission, hasRole } = useAuth();
  const canManageGroupMembers = hasRole('ADMIN', 'MANAGER', 'HR');
  const [groups, setGroups] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterLocationOnly, setFilterLocationOnly] = useState(false);

  // Create & Edit Group Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [clientId, setClientId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locDetecting, setLocDetecting] = useState(false);

  // Automatic Geocoding & Suggestions State
  const [geoQuery, setGeoQuery] = useState('');
  const [geoSuggestions, setGeoSuggestions] = useState<any[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showGeoDropdown, setShowGeoDropdown] = useState(false);
  const geoTimeoutRef = useRef<any>(null);

  // Manage Group Members Modal State
  const [manageGroup, setManageGroup] = useState<any | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  // Group Workspace (Discussion & Location Hub) Drawer State
  const [activeGroupWorkspace, setActiveGroupWorkspace] = useState<any | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'announcements' | 'location' | 'members'>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // New Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annDoList, setAnnDoList] = useState('');
  const [annDontList, setAnnDontList] = useState('');
  const [annPriority, setAnnPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [annPinned, setAnnPinned] = useState(false);
  const [submittingAnn, setSubmittingAnn] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);

  // Announcement Comment Draft State (by announcement ID)
  const [commentDrafts, setCommentDrafts] = useState<{ [annId: string]: string }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [annId: string]: boolean }>({});

  useEffect(() => {
    fetchGroups();
    if (hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('groups', 'create') || hasPermission('groups', 'update')) {
      fetchUsers();
      fetchClients();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/groups');
      setGroups(res.data || []);
    } catch (e) {
      console.error('Fetch groups error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users?limit=100');
      setUsersList(res.data?.data || []);
    } catch (e: any) {
      if (e.response?.status !== 403) {
        console.error('Fetch users error:', e);
      }
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/api/clients');
      setClientsList(res.data?.data || res.data || []);
    } catch (e: any) {
      if (e.response?.status !== 403) {
        console.error('Fetch clients error:', e);
      }
    }
  };

  const handleOpenCreateModal = () => {
    setEditingGroupId(null);
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setLocationName('');
    setLocationAddress('');
    setLatitude('');
    setLongitude('');
    setClientId('');
    setGeoQuery('');
    setGeoSuggestions([]);
    setSelectedUserIds([]);
    setModalOpen(true);
  };

  const handleOpenEditModal = (group: any) => {
    setEditingGroupId(group.id);
    setName(group.name || '');
    setDescription(group.description || '');
    setColor(group.color || '#3b82f6');
    setLocationName(group.locationName || '');
    setLocationAddress(group.locationAddress || '');
    setLatitude(group.latitude !== null && group.latitude !== undefined ? String(group.latitude) : '');
    setLongitude(group.longitude !== null && group.longitude !== undefined ? String(group.longitude) : '');
    setClientId(group.clientId || '');
    setGeoQuery(group.locationAddress || group.locationName || '');
    setGeoSuggestions([]);
    setSelectedUserIds(group.members?.map((m: any) => m.userId) || []);
    setModalOpen(true);
  };

  // Automatic Address Autocomplete Search
  const handleGeoSearchChange = (val: string) => {
    setGeoQuery(val);
    setLocationAddress(val);
    setShowGeoDropdown(true);

    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
    if (!val || val.trim().length < 2) {
      setGeoSuggestions([]);
      return;
    }

    setGeoLoading(true);
    geoTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setGeoSuggestions(data || []);
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setGeoLoading(false);
      }
    }, 400);
  };

  // Auto-Find Coordinates for full address
  const handleAutoGeocode = async (addressToGeocode?: string) => {
    const targetAddr = addressToGeocode || locationAddress || geoQuery;
    if (!targetAddr || !targetAddr.trim()) return;

    setGeoLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(targetAddr)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const match = data[0];
        setLatitude(parseFloat(match.lat).toFixed(6));
        setLongitude(parseFloat(match.lon).toFixed(6));
        if (!locationAddress) setLocationAddress(match.display_name);
        if (!locationName) {
          const parts = match.display_name.split(',');
          setLocationName(parts[0]);
        }
      } else {
        alert('Could not automatically geocode this address. Please check spelling or try a broader city/area name.');
      }
    } catch (e) {
      console.error('Geocode error:', e);
    } finally {
      setGeoLoading(false);
    }
  };

  // Select item from Geocode suggestions
  const handleSelectSuggestion = (sug: any) => {
    const formattedLat = parseFloat(sug.lat).toFixed(6);
    const formattedLon = parseFloat(sug.lon).toFixed(6);

    setLatitude(formattedLat);
    setLongitude(formattedLon);
    setLocationAddress(sug.display_name);
    setGeoQuery(sug.display_name);
    setShowGeoDropdown(false);

    if (!locationName) {
      const parts = sug.display_name.split(',');
      setLocationName(parts[0]);
    }
  };

  // Detect Current Browser GPS + Reverse Geocode
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const formattedLat = lat.toFixed(6);
        const formattedLng = lng.toFixed(6);

        setLatitude(formattedLat);
        setLongitude(formattedLng);

        // Reverse geocode to get human address
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setLocationAddress(data.display_name);
            setGeoQuery(data.display_name);
            if (!locationName) {
              const parts = data.display_name.split(',');
              setLocationName(parts[0] || 'Current GPS Location');
            }
          }
        } catch (revErr) {
          console.error('Reverse geocode error:', revErr);
        } finally {
          setLocDetecting(false);
        }
      },
      (err) => {
        alert('Could not retrieve GPS location. Ensure location permissions are allowed in your browser.');
        setLocDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleUserToggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        color,
        locationName,
        locationAddress,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        clientId: clientId || null,
        memberIds: selectedUserIds,
      };

      if (editingGroupId) {
        await api.put(`/api/groups/${editingGroupId}`, payload);
      } else {
        await api.post('/api/groups', payload);
      }

      setModalOpen(false);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save group');
    } finally {
      setSubmitting(false);
    }
  };

  // Group Workspace Drawer Management
  const handleOpenWorkspace = async (group: any, tab: 'announcements' | 'location' | 'members' = 'announcements') => {
    setActiveGroupWorkspace(group);
    setWorkspaceTab(tab);
    setShowAnnForm(false);
    await fetchAnnouncements(group.id);
  };

  const fetchAnnouncements = async (groupId: string) => {
    setAnnouncementsLoading(true);
    try {
      const res = await api.get(`/api/groups/${groupId}/announcements`);
      setAnnouncements(res.data || []);
    } catch (e) {
      console.error('Fetch announcements error:', e);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupWorkspace || !annTitle || !annContent) return;
    setSubmittingAnn(true);
    try {
      await api.post(`/api/groups/${activeGroupWorkspace.id}/announcements`, {
        title: annTitle,
        content: annContent,
        doList: annDoList,
        dontList: annDontList,
        priority: annPriority,
        pinned: annPinned,
      });

      setAnnTitle('');
      setAnnContent('');
      setAnnDoList('');
      setAnnDontList('');
      setAnnPriority('NORMAL');
      setAnnPinned(false);
      setShowAnnForm(false);

      await fetchAnnouncements(activeGroupWorkspace.id);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post announcement');
    } finally {
      setSubmittingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!activeGroupWorkspace || !confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/api/groups/${activeGroupWorkspace.id}/announcements/${annId}`);
      await fetchAnnouncements(activeGroupWorkspace.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete announcement');
    }
  };

  const handleAddComment = async (annId: string) => {
    const text = commentDrafts[annId];
    if (!activeGroupWorkspace || !text || !text.trim()) return;

    setSubmittingComment((prev) => ({ ...prev, [annId]: true }));
    try {
      await api.post(`/api/groups/${activeGroupWorkspace.id}/announcements/${annId}/comments`, {
        content: text.trim(),
      });
      setCommentDrafts((prev) => ({ ...prev, [annId]: '' }));
      await fetchAnnouncements(activeGroupWorkspace.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [annId]: false }));
    }
  };

  const handleDeleteComment = async (annId: string, commentId: string) => {
    if (!activeGroupWorkspace) return;
    try {
      await api.delete(`/api/groups/${activeGroupWorkspace.id}/announcements/${annId}/comments/${commentId}`);
      await fetchAnnouncements(activeGroupWorkspace.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete comment');
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

  const getMapEmbedUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  };

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase()) ||
      g.locationName?.toLowerCase().includes(search.toLowerCase()) ||
      g.locationAddress?.toLowerCase().includes(search.toLowerCase()) ||
      g.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.client?.companyName?.toLowerCase().includes(search.toLowerCase());

    const matchesLocation = !filterLocationOnly || Boolean(g.locationName || g.latitude);

    return matchesSearch && matchesLocation;
  });

  const totalAssignedSites = groups.filter((g) => g.locationName || g.latitude).length;
  const totalGroupMembers = groups.reduce((acc, g) => acc + (g.members?.length || 0), 0);

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-100">
      <PageHeader
        title="CCTV Project Groups & Site Locations"
        subtitle="Manage field groups, assigned CCTV installation sites, GPS coordinates, and task guidelines with Q&A discussion."
        icon={<UsersRound className="text-blue-400" size={28} />}
        action={
          canManageGroupMembers ? (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/25"
            >
              <Plus size={16} />
              <span>Create CCTV Field Group</span>
            </button>
          ) : undefined
        }
      />

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Groups</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{groups.length}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Active Project Teams</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <UsersRound size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Assigned CCTV Sites</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{totalAssignedSites}</h3>
              <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">Active Locations Mapped</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <MapPin size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Field Technicians</p>
              <h3 className="text-2xl font-extrabold text-purple-400 mt-1">{totalGroupMembers}</h3>
              <p className="text-[10px] text-purple-400 mt-0.5 font-semibold">Assigned Members</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Shield size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search group name, site location, address, or client..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterLocationOnly(!filterLocationOnly)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition ${
              filterLocationOnly
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <MapPin size={14} />
            <span>Sites Assigned Only</span>
          </button>
        </div>
      </div>

      {/* Groups Cards Grid */}
      {loading ? (
        <div className="text-xs text-slate-400 p-8 text-center">Loading company groups & site locations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full">
              <EmptyState message="No matching groups found." />
            </div>
          ) : (
            filteredGroups.map((g) => {
              const hasLocation = Boolean(g.locationName || g.latitude);
              const announcementCount = g._count?.announcements || g.announcements?.length || 0;

              return (
                <div
                  key={g.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-3.5">
                    {/* Header: Color Badge & Title */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0"
                          style={{ backgroundColor: g.color || '#3b82f6' }}
                        >
                          <UsersRound size={20} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-white text-base leading-snug">{g.name}</h3>
                          {g.client && (
                            <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                              <Building2 size={10} />
                              {g.client.companyName || g.client.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {canManageGroupMembers && (
                          <button
                            onClick={() => handleOpenEditModal(g)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                            title="Edit Group & Location"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{g.description || 'No description provided.'}</p>

                    {/* Location Badge Card */}
                    {hasLocation ? (
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                            <MapPin size={13} />
                            <span>{g.locationName || 'Assigned Site'}</span>
                          </span>
                          {g.latitude && g.longitude && (
                            <a
                              href={getGoogleMapsUrl(g.latitude, g.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5"
                            >
                              <Globe size={10} />
                              <span>Maps</span>
                            </a>
                          )}
                        </div>
                        {g.locationAddress && (
                          <p className="text-[11px] text-slate-400 truncate">{g.locationAddress}</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-500 flex items-center space-x-1.5">
                        <MapPin size={12} className="opacity-40" />
                        <span>No CCTV site location assigned yet.</span>
                      </div>
                    )}

                    {/* Member Avatars Preview */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase mb-1.5">
                        <span>Group Members ({g.members?.length || 0})</span>
                        {announcementCount > 0 && (
                          <span className="text-amber-400 font-normal flex items-center gap-1">
                            <Megaphone size={10} />
                            {announcementCount} Posts
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.members && g.members.length > 0 ? (
                          g.members.slice(0, 4).map((m: any) => (
                            <span
                              key={m.id}
                              className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] flex items-center space-x-1"
                            >
                              <User size={10} className="text-blue-400" />
                              <span>
                                {m.user?.firstName} {m.user?.lastName}
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500">No members added</span>
                        )}
                        {g.members && g.members.length > 4 && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-bold">
                            +{g.members.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs mt-4">
                    <button
                      onClick={() => handleOpenWorkspace(g, 'announcements')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 font-bold flex items-center space-x-1.5 transition border border-blue-500/20"
                    >
                      <Megaphone size={13} />
                      <span>Guidelines & Q&A</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {hasLocation && (
                        <button
                          onClick={() => handleOpenWorkspace(g, 'location')}
                          className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                          title="View Site Location Map"
                        >
                          <MapPin size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setManageGroup(g)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold transition"
                        title="Manage Roster"
                      >
                        <UserPlus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== GROUP WORKSPACE (LOCATIONS + ANNOUNCEMENTS & DISCUSSION HUB) MODAL ===== */}
      <Modal
        open={!!activeGroupWorkspace}
        onClose={() => setActiveGroupWorkspace(null)}
        title={`Group Hub • ${activeGroupWorkspace?.name || ''}`}
        icon={<UsersRound size={20} className="text-blue-400" />}
        maxWidth="max-w-4xl"
      >
        {activeGroupWorkspace && (
          <div className="space-y-4 py-2">
            {/* Header Site Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <span>{activeGroupWorkspace.name}</span>
                  {activeGroupWorkspace.client && (
                    <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                      Client: {activeGroupWorkspace.client.name}
                    </Badge>
                  )}
                </h3>
                {activeGroupWorkspace.locationName && (
                  <p className="text-emerald-400 text-xs mt-1 font-semibold flex items-center gap-1">
                    <MapPin size={13} />
                    <span>{activeGroupWorkspace.locationName}</span>
                    {activeGroupWorkspace.locationAddress && (
                      <span className="text-slate-400 font-normal">({activeGroupWorkspace.locationAddress})</span>
                    )}
                  </p>
                )}
              </div>

              {/* Navigation Actions */}
              {activeGroupWorkspace.latitude && activeGroupWorkspace.longitude && (
                <a
                  href={getGoogleMapsUrl(activeGroupWorkspace.latitude, activeGroupWorkspace.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shrink-0"
                >
                  <Globe size={13} />
                  <span>Open in Google Maps</span>
                </a>
              )}
            </div>

            {/* Sub-Tabs: Announcements & Guidelines vs Location Map vs Roster */}
            <div className="flex rounded-xl bg-slate-950/80 border border-slate-800 p-1">
              <button
                onClick={() => setWorkspaceTab('announcements')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                  workspaceTab === 'announcements'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Megaphone size={13} className="inline mr-1.5" />
                Task Guidelines & Q&A Discussion ({announcements.length})
              </button>

              <button
                onClick={() => setWorkspaceTab('location')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                  workspaceTab === 'location'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin size={13} className="inline mr-1.5" />
                CCTV Site Location Map
              </button>
            </div>

            {/* TAB 1: ANNOUNCEMENTS & TASK GUIDELINES WITH Q&A */}
            {workspaceTab === 'announcements' && (
              <div className="space-y-4">
                {/* Admin/Manager New Post Toggle & Form */}
                <div className="flex items-center justify-between pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Group Announcements & Instructions
                  </h4>
                  {canManageGroupMembers && (
                    <button
                      onClick={() => setShowAnnForm(!showAnnForm)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-bold text-xs flex items-center space-x-1 transition"
                    >
                      <Plus size={13} />
                      <span>{showAnnForm ? 'Cancel Post' : 'Post New Instruction'}</span>
                    </button>
                  )}
                </div>

                {/* Announcement Creation Form */}
                {showAnnForm && (
                  <form onSubmit={handleCreateAnnouncement} className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        <span>Create Task Announcement / Guidelines</span>
                      </h4>
                      <select
                        value={annPriority}
                        onChange={(e: any) => setAnnPriority(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-semibold"
                      >
                        <option value="NORMAL">Normal Priority</option>
                        <option value="IMPORTANT">Important</option>
                        <option value="URGENT">Urgent / Critical</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Announcement Title (e.g. CCTV Cable Laying Guidelines for West Wing)"
                      className={inputClassName}
                      required
                    />

                    <textarea
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      rows={3}
                      placeholder="Detailed instructions or overview for group members..."
                      className={textareaClassName}
                      required
                    />

                    {/* Do's & Don'ts Checklist inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>What to DO (Do&apos;s - 1 per line)</span>
                        </label>
                        <textarea
                          value={annDoList}
                          onChange={(e) => setAnnDoList(e.target.value)}
                          rows={3}
                          placeholder="e.g. Wear safety helmets&#10;Verify IP addresses before mounting&#10;Label all RG6 cables"
                          className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <XCircle size={13} />
                          <span>What NOT to DO (Don&apos;ts - 1 per line)</span>
                        </label>
                        <textarea
                          value={annDontList}
                          onChange={(e) => setAnnDontList(e.target.value)}
                          rows={3}
                          placeholder="e.g. Do not cut main fiber without supervisor approval&#10;Do not leave exposed wire splices"
                          className="w-full px-3 py-2 bg-slate-900 border border-rose-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={annPinned}
                          onChange={(e) => setAnnPinned(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900"
                        />
                        <span>Pin to top of group discussion</span>
                      </label>

                      <button
                        type="submit"
                        disabled={submittingAnn}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-lg"
                      >
                        <Send size={13} />
                        <span>{submittingAnn ? 'Posting...' : 'Publish Announcement'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Announcements Feed */}
                {announcementsLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading group announcements...</div>
                ) : announcements.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                    No announcements or instructions posted for this group yet.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {announcements.map((ann) => {
                      const doItems = ann.doList ? ann.doList.split('\n').filter(Boolean) : [];
                      const dontItems = ann.dontList ? ann.dontList.split('\n').filter(Boolean) : [];

                      return (
                        <div
                          key={ann.id}
                          className={`p-4.5 rounded-2xl bg-slate-950 border space-y-3.5 transition ${
                            ann.priority === 'URGENT'
                              ? 'border-rose-500/40 bg-rose-950/10'
                              : ann.priority === 'IMPORTANT'
                              ? 'border-amber-500/40 bg-amber-950/10'
                              : 'border-slate-800'
                          }`}
                        >
                          {/* Post Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 font-bold text-white flex items-center justify-center text-xs">
                                {ann.author?.firstName?.charAt(0) || 'A'}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-extrabold text-white text-sm">{ann.title}</h4>
                                  {ann.pinned && (
                                    <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">
                                      <Pin size={9} className="mr-0.5" /> Pinned
                                    </Badge>
                                  )}
                                  <Badge
                                    variant={
                                      ann.priority === 'URGENT'
                                        ? 'destructive'
                                        : ann.priority === 'IMPORTANT'
                                        ? 'warning'
                                        : 'secondary'
                                    }
                                    className="text-[9px]"
                                  >
                                    {ann.priority}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  By {ann.author?.firstName} {ann.author?.lastName} ({ann.author?.role}) • {formatDateTime(ann.createdAt)}
                                </p>
                              </div>
                            </div>

                            {canManageGroupMembers && (
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 transition"
                                title="Delete Announcement"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Post Content Body */}
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{ann.content}</p>

                          {/* Task Guidelines (Do's & Don'ts) Visual Cards */}
                          {(doItems.length > 0 || dontItems.length > 0) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {doItems.length > 0 && (
                                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    <span>What to DO</span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {doItems.map((item: string, idx: number) => (
                                      <li key={idx} className="text-[11px] text-emerald-200 flex items-start space-x-1.5">
                                        <span className="text-emerald-400 font-bold">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {dontItems.length > 0 && (
                                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-1.5">
                                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                                    <XCircle size={12} />
                                    <span>What NOT to DO</span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {dontItems.map((item: string, idx: number) => (
                                      <li key={idx} className="text-[11px] text-rose-200 flex items-start space-x-1.5">
                                        <span className="text-rose-400 font-bold">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Interactive Q&A Discussion Thread */}
                          <div className="pt-3 border-t border-slate-900 space-y-3">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                              <span className="flex items-center gap-1">
                                <MessageSquare size={12} className="text-blue-400" />
                                Member Questions & Discussion ({ann.comments?.length || 0})
                              </span>
                            </div>

                            {/* Comments List */}
                            {ann.comments && ann.comments.length > 0 && (
                              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                                {ann.comments.map((c: any) => (
                                  <div key={c.id} className="text-xs flex items-start justify-between gap-2 border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-white">
                                          {c.author?.firstName} {c.author?.lastName}
                                        </span>
                                        <Badge variant="outline" className="text-[8px] py-0">
                                          {c.author?.role}
                                        </Badge>
                                        <span className="text-[10px] text-slate-500">
                                          {formatDateTime(c.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-slate-300 mt-0.5">{c.content}</p>
                                    </div>

                                    {(c.authorId === user?.id || hasPermission('groups', 'update')) && (
                                      <button
                                        onClick={() => handleDeleteComment(ann.id, c.id)}
                                        className="text-slate-500 hover:text-rose-400 text-[10px]"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment Input Box for Technicians/Members to Ask Questions */}
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={commentDrafts[ann.id] || ''}
                                onChange={(e) =>
                                  setCommentDrafts({ ...commentDrafts, [ann.id]: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddComment(ann.id);
                                }}
                                placeholder="Ask a question or seek clarification from supervisor..."
                                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                              />
                              <button
                                onClick={() => handleAddComment(ann.id)}
                                disabled={submittingComment[ann.id]}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 transition"
                              >
                                <Send size={12} />
                                <span>Reply</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CCTV INSTALLATION SITE LOCATION & INTERACTIVE MAP */}
            {workspaceTab === 'location' && (
              <div className="space-y-4">
                {activeGroupWorkspace.latitude && activeGroupWorkspace.longitude ? (
                  <div className="space-y-4">
                    {/* Embedded Map */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                      <iframe
                        src={getMapEmbedUrl(activeGroupWorkspace.latitude, activeGroupWorkspace.longitude)}
                        className="w-full h-full border-0"
                        title="CCTV Installation Site Map"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/90 font-mono font-semibold">
                            Coordinates: {activeGroupWorkspace.latitude.toFixed(6)}°, {activeGroupWorkspace.longitude.toFixed(6)}°
                          </span>
                          <a
                            href={getGoogleMapsUrl(activeGroupWorkspace.latitude, activeGroupWorkspace.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                          >
                            <ExternalLink size={10} />
                            Full Navigation
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Meta Location Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Site Name</span>
                        <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
                          <Building2 size={14} className="text-emerald-400" />
                          <span>{activeGroupWorkspace.locationName || 'N/A'}</span>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Address</span>
                        <p className="text-xs font-semibold text-slate-300">
                          {activeGroupWorkspace.locationAddress || 'No full address specified.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                    <MapPin size={36} className="mx-auto text-slate-600 opacity-40" />
                    <h4 className="text-sm font-bold text-slate-300">No CCTV Site Assigned Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click edit group to assign a site name, address, and GPS coordinates for field technicians.
                    </p>
                    {canManageGroupMembers && (
                      <button
                        onClick={() => {
                          setActiveGroupWorkspace(null);
                          handleOpenEditModal(activeGroupWorkspace);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs transition"
                      >
                        Assign CCTV Site Location Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <button
            onClick={() => setActiveGroupWorkspace(null)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Close Workspace
          </button>
        </ModalFooter>
      </Modal>

      {/* ===== CREATE / EDIT GROUP MODAL WITH AUTOMATIC GEOCODING & AUTOCOMPLETE ===== */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGroupId ? 'Edit Field Group & CCTV Site' : 'Create New Field Group'}
        icon={<UsersRound size={20} className="text-blue-400" />}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
          <FormField label="Group Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Surveillance Technicians - Alpha Team"
              className={inputClassName}
              required
            />
          </FormField>

          <FormField label="Description / Scope of Work">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. CCTV Camera Installation & Network Cabling at Apex Towers"
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

          {/* CCTV SITE LOCATION SERVICE WITH INTERACTIVE MAP PICKER */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-inner">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Site / Project Name</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Patuli Lake Side Project / Apex Towers"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Link Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Select Client (Optional)...</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Leaflet Map Picker with Dual-Engine Geocoding & Zero Alerts */}
            <MapPicker
              latitude={latitude ? parseFloat(latitude) : null}
              longitude={longitude ? parseFloat(longitude) : null}
              address={locationAddress}
              locationName={locationName}
              onLocationSelect={({ latitude: lat, longitude: lng, address: addr, locationName: locName }) => {
                setLatitude(String(lat));
                setLongitude(String(lng));
                setLocationAddress(addr);
                if (locName && !locationName) setLocationName(locName);
              }}
            />
          </div>

          {/* User Selection Checkbox Roster */}
          <FormField label={`Assign Field Technicians & Members (${selectedUserIds.length} Selected)`}>
            <div className="space-y-1.5 max-h-44 overflow-y-auto bg-slate-950 p-3 rounded-2xl border border-slate-800">
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
                          <p>
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            @{u.username} • {u.role}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700'
                        }`}
                      >
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
            submitLabel={submitting ? 'Saving...' : editingGroupId ? 'Update Group' : 'Create Group'}
            submitting={submitting}
          />
        </form>
      </Modal>

      {/* ===== MANAGE GROUP MEMBERS MODAL ===== */}
      <Modal
        open={!!manageGroup}
        onClose={() => setManageGroup(null)}
        title={`${manageGroup?.name || ''} Member Roster`}
        maxWidth="max-w-lg"
      >
        {manageGroup && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 -mt-2">Add or remove technicians from this group.</p>

            {/* Add User to Group Form */}
            <form onSubmit={handleAddMember} className="flex items-center space-x-2">
              <select
                value={addMemberUserId}
                onChange={(e) => setAddMemberUserId(e.target.value)}
                className={`flex-1 ${inputClassName}`}
                required
              >
                <option value="">Select Technician to Add...</option>
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
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shrink-0"
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
          </div>
        )}
      </Modal>
    </div>
  );
}
