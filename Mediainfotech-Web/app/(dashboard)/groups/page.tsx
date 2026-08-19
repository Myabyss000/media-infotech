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
  Package,
  Barcode,
  Camera,
  ClipboardPaste,
  ShieldCheck,
  PackageCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatDateTime, formatDate } from '@/lib/utils';
import { MapPicker } from '@/components/ui/MapPicker';
import { SmartBarcodeScannerModal } from '@/components/inventory/SmartBarcodeScannerModal';
import { RetrieveAndReplaceModal } from '@/components/inventory/RetrieveAndReplaceModal';
import { RotateCcw } from 'lucide-react';

export default function GroupsPage() {
  const { user, hasPermission, hasRole } = useAuth();
  const canManageGroupMembers = hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('groups', 'update');
  const canDeleteGroup = hasRole('ADMIN', 'MANAGER') || hasPermission('groups', 'delete');
  const [groups, setGroups] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Group Deletion State
  const [groupToDelete, setGroupToDelete] = useState<any | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterLocationOnly, setFilterLocationOnly] = useState(false);
  const [filterClient, setFilterClient] = useState('');

  // Quick Client Creation Modal State
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [qcName, setQcName] = useState('');
  const [qcCompany, setQcCompany] = useState('');
  const [qcPhone, setQcPhone] = useState('');
  const [qcEmail, setQcEmail] = useState('');
  const [qcAddress, setQcAddress] = useState('');
  const [qcCity, setQcCity] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

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
  const [vehicleId, setVehicleId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupFormBarcodes, setGroupFormBarcodes] = useState<string[]>([]);
  const [groupFormRapidInput, setGroupFormRapidInput] = useState('');
  const [groupFormScannerOpen, setGroupFormScannerOpen] = useState(false);
  const [groupFormPasteOpen, setGroupFormPasteOpen] = useState(false);
  const [groupFormPasteText, setGroupFormPasteText] = useState('');
  const [groupFormAssignError, setGroupFormAssignError] = useState<string | null>(null);
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

  // Group Workspace (Discussion, Equipment & Location Hub) Drawer State
  const [activeGroupWorkspace, setActiveGroupWorkspace] = useState<any | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'announcements' | 'inventory' | 'location' | 'members'>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // Group Equipment & Assets State (3-Category Breakdown)
  const [groupEquipmentData, setGroupEquipmentData] = useState<{
    summary: { totalCount: number; activeFieldCount: number; installedSiteCount: number; mustReturnCount: number };
    activeFieldItems: any[];
    installedSiteItems: any[];
    mustReturnItems: any[];
    items: any[];
  }>({
    summary: { totalCount: 0, activeFieldCount: 0, installedSiteCount: 0, mustReturnCount: 0 },
    activeFieldItems: [],
    installedSiteItems: [],
    mustReturnItems: [],
    items: [],
  });
  const [equipmentCategoryTab, setEquipmentCategoryTab] = useState<'ALL' | 'FIELD' | 'INSTALLED' | 'RETURN'>('ALL');
  const [groupEquipment, setGroupEquipment] = useState<any[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // Field Retrieval / RMA Modal State
  const [selectedRetrieveItem, setSelectedRetrieveItem] = useState<any | null>(null);
  const [retrieveModalOpen, setRetrieveModalOpen] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [scannedGroupSerials, setScannedGroupSerials] = useState<string[]>([]);
  const [groupScannerOpen, setGroupScannerOpen] = useState(false);
  const [groupPasteModalOpen, setGroupPasteModalOpen] = useState(false);
  const [groupPasteText, setGroupPasteText] = useState('');
  const [groupRapidInput, setGroupRapidInput] = useState('');
  const [groupAssignNotes, setGroupAssignNotes] = useState('');
  const [groupAssignSubmitting, setGroupAssignSubmitting] = useState(false);
  const [groupAssignError, setGroupAssignError] = useState<string | null>(null);

  // Return Equipment Modal State
  const [returnItemModal, setReturnItemModal] = useState<any | null>(null);
  const [returnItemCondition, setReturnItemCondition] = useState('GOOD');
  const [returnItemNotes, setReturnItemNotes] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

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
    fetchUsers();
    fetchClients();
    fetchVehicles();
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

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/api/vehicles');
      setVehiclesList(res.data?.data || res.data || []);
    } catch (e: any) {
      if (e.response?.status !== 403) {
        console.error('Fetch vehicles error:', e);
      }
    }
  };

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcName && !qcCompany) {
      alert('Please provide a Client Contact Name or Company Name');
      return;
    }
    if (!qcPhone) {
      alert('Please provide a Client Phone number');
      return;
    }
    try {
      setCreatingClient(true);
      const res = await api.post('/api/clients', {
        name: qcName || qcCompany,
        companyName: qcCompany || qcName,
        phone: qcPhone,
        email: qcEmail || null,
        address: qcAddress || null,
        city: qcCity || null,
      });

      const newClient = res.data?.data || res.data;
      if (newClient?.id) {
        setClientsList((prev) => [newClient, ...prev]);
        setClientId(newClient.id);
        setQuickClientModalOpen(false);
        setQcName('');
        setQcCompany('');
        setQcPhone('');
        setQcEmail('');
        setQcAddress('');
        setQcCity('');
      }
    } catch (err: any) {
      console.error('Quick create client error:', err);
      alert(err.response?.data?.error || 'Failed to create client');
    } finally {
      setCreatingClient(false);
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
    setVehicleId('');
    setGeoQuery('');
    setGeoSuggestions([]);
    setSelectedUserIds([]);
    setGroupFormBarcodes([]);
    setGroupFormRapidInput('');
    setGroupFormAssignError(null);
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
    setVehicleId(group.vehicleId || group.vehicle?.id || '');
    setGeoQuery(group.locationAddress || group.locationName || '');
    setGeoSuggestions([]);
    setSelectedUserIds(group.members?.map((m: any) => m.userId) || []);
    setGroupFormBarcodes([]);
    setGroupFormRapidInput('');
    setGroupFormAssignError(null);
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

  // Group Form (Create / Edit Modal) Barcode Helpers
  const handleAddGroupFormBarcode = (codeToAdd?: string) => {
    const target = (codeToAdd || groupFormRapidInput).trim().toUpperCase();
    if (!target) return;
    if (groupFormBarcodes.includes(target)) {
      setGroupFormAssignError(`Serial "${target}" is already queued!`);
      setTimeout(() => setGroupFormAssignError(null), 3000);
      setGroupFormRapidInput('');
      return;
    }
    setGroupFormBarcodes((prev) => [...prev, target]);
    setGroupFormRapidInput('');
    setGroupFormAssignError(null);
  };

  const handleRemoveGroupFormBarcode = (idxToRemove: number) => {
    setGroupFormBarcodes((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleApplyGroupFormPaste = () => {
    if (!groupFormPasteText.trim()) return;
    const tokens = groupFormPasteText
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    const newSerials: string[] = [];
    for (const token of tokens) {
      if (!groupFormBarcodes.includes(token) && !newSerials.includes(token)) {
        newSerials.push(token);
      }
    }

    if (newSerials.length > 0) {
      setGroupFormBarcodes((prev) => [...prev, ...newSerials]);
    }
    setGroupFormPasteOpen(false);
    setGroupFormPasteText('');
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
        vehicleId: vehicleId || null,
        memberIds: selectedUserIds,
        barcodes: groupFormBarcodes,
      };

      if (editingGroupId) {
        await api.put(`/api/groups/${editingGroupId}`, payload);
      } else {
        await api.post('/api/groups', payload);
      }

      setModalOpen(false);
      setGroupFormBarcodes([]);
      setGroupFormRapidInput('');
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save group');
    } finally {
      setSubmitting(false);
    }
  };

  // Group Deletion Handlers (Admin & Manager)
  const handleConfirmDeleteGroup = (g: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGroupToDelete(g);
  };

  const handleExecuteDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      setDeletingGroup(true);
      const res = await api.delete(`/api/groups/${groupToDelete.id}`);
      alert(res.data?.message || `Group "${groupToDelete.name}" deleted successfully.`);
      const deletedId = groupToDelete.id;
      setGroupToDelete(null);
      if (editingGroupId === deletedId) {
        setModalOpen(false);
        setEditingGroupId(null);
      }
      if (activeGroupWorkspace?.id === deletedId) {
        setActiveGroupWorkspace(null);
      }
      fetchGroups();
    } catch (err: any) {
      console.error('Delete group error:', err);
      alert(err.response?.data?.error || 'Failed to delete group');
    } finally {
      setDeletingGroup(false);
    }
  };

  // Group Workspace Drawer Management
  const handleOpenWorkspace = async (group: any, tab: 'announcements' | 'inventory' | 'location' | 'members' = 'announcements') => {
    setActiveGroupWorkspace(group);
    setWorkspaceTab(tab);
    setShowAnnForm(false);
    await Promise.all([fetchAnnouncements(group.id), fetchGroupEquipment(group.id)]);
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

  const fetchGroupEquipment = async (groupId: string) => {
    setEquipmentLoading(true);
    try {
      const res = await api.get(`/api/groups/${groupId}/inventory`);
      const payload = res.data;
      if (payload && payload.summary) {
        setGroupEquipmentData(payload);
        setGroupEquipment(payload.items || []);
      } else if (Array.isArray(payload)) {
        setGroupEquipment(payload);
        setGroupEquipmentData({
          summary: { totalCount: payload.length, activeFieldCount: payload.length, installedSiteCount: 0, mustReturnCount: 0 },
          activeFieldItems: payload,
          installedSiteItems: [],
          mustReturnItems: [],
          items: payload,
        });
      }
    } catch (e) {
      console.error('Fetch group equipment error:', e);
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Group Rapid Serial Management
  const handleAddGroupRapidSerial = (codeToAdd?: string) => {
    const target = (codeToAdd || groupRapidInput).trim().toUpperCase();
    if (!target) return;
    if (scannedGroupSerials.includes(target)) {
      setGroupAssignError(`Duplicate serial: "${target}" is already in this batch queue!`);
      setTimeout(() => setGroupAssignError(null), 3000);
      setGroupRapidInput('');
      return;
    }
    setScannedGroupSerials((prev) => [...prev, target]);
    setGroupRapidInput('');
    setGroupAssignError(null);
  };

  const handleRemoveGroupSerial = (idxToRemove: number) => {
    setScannedGroupSerials((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleApplyGroupPaste = () => {
    if (!groupPasteText.trim()) return;
    const tokens = groupPasteText
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    const newSerials: string[] = [];
    for (const token of tokens) {
      if (!scannedGroupSerials.includes(token) && !newSerials.includes(token)) {
        newSerials.push(token);
      }
    }

    if (newSerials.length > 0) {
      setScannedGroupSerials((prev) => [...prev, ...newSerials]);
    }
    setGroupPasteModalOpen(false);
    setGroupPasteText('');
  };

  // Assign Scanned Equipment to Active Group
  const handleAssignProductsToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupWorkspace || scannedGroupSerials.length === 0) {
      alert('Please scan or enter at least one product serial barcode.');
      return;
    }

    try {
      setGroupAssignSubmitting(true);
      setGroupAssignError(null);

      const res = await api.post(`/api/groups/${activeGroupWorkspace.id}/inventory`, {
        barcodes: scannedGroupSerials,
        notes: groupAssignNotes,
      });

      alert(res.data?.message || `Successfully assigned ${scannedGroupSerials.length} products to group!`);
      setAssignModalOpen(false);
      setScannedGroupSerials([]);
      setGroupAssignNotes('');
      await fetchGroupEquipment(activeGroupWorkspace.id);
      fetchGroups();
    } catch (err: any) {
      console.error('Assign to group error:', err);
      const msg = err.response?.data?.error || 'Failed to assign products to group';
      setGroupAssignError(msg);
      alert(msg);
    } finally {
      setGroupAssignSubmitting(false);
    }
  };

  // Return Item from Group to Central Stock
  const handleReturnProductFromGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupWorkspace || !returnItemModal) return;

    try {
      setReturnSubmitting(true);
      await api.post(`/api/groups/${activeGroupWorkspace.id}/inventory/${returnItemModal.id}/return`, {
        condition: returnItemCondition,
        notes: returnItemNotes,
      });

      alert(`Equipment "${returnItemModal.deviceName}" returned to central inventory stock!`);
      setReturnItemModal(null);
      setReturnItemNotes('');
      setReturnItemCondition('GOOD');
      await fetchGroupEquipment(activeGroupWorkspace.id);
      fetchGroups();
    } catch (err: any) {
      console.error('Return item error:', err);
      alert(err.response?.data?.error || 'Failed to return equipment');
    } finally {
      setReturnSubmitting(false);
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
    if (!canManageGroupMembers || !manageGroup || !addMemberUserId) return;
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
    if (!canManageGroupMembers) return;
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
    const matchesClient = !filterClient || g.clientId === filterClient;

    return matchesSearch && matchesLocation && matchesClient;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
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

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Client Filter Dropdown */}
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">🏢 All Clients ({clientsList.length})</option>
            {clientsList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.name}
              </option>
            ))}
          </select>

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
                        {canDeleteGroup && (
                          <button
                            onClick={(e) => handleConfirmDeleteGroup(g, e)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition"
                            title="Delete Group (Admin / Manager)"
                          >
                            <Trash2 size={13} />
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

                    {/* Assigned Vehicle Badge */}
                    {g.vehicle && (
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px]">
                          <span>🚐</span>
                          <span>{g.vehicle.registrationNo}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {g.vehicle.make} {g.vehicle.model} ({g.vehicle.type || 'Van'})
                        </span>
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
                      className="px-2.5 py-1.5 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 font-bold flex items-center space-x-1.5 transition border border-blue-500/20"
                    >
                      <Megaphone size={13} />
                      <span>Guidelines</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenWorkspace(g, 'inventory')}
                        className="px-2 py-1 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 font-mono font-bold text-[11px] flex items-center gap-1 transition"
                        title="View Group Assigned Equipment"
                      >
                        <Package size={12} className="text-indigo-400" />
                        <span>{g._count?.inventoryItems || g.inventoryItems?.length || 0} Assets</span>
                      </button>

                      {hasLocation && (
                        <button
                          onClick={() => handleOpenWorkspace(g, 'location')}
                          className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                          title="View Site Location Map"
                        >
                          <MapPin size={14} />
                        </button>
                      )}
                      {canManageGroupMembers && (
                        <button
                          onClick={() => setManageGroup(g)}
                          className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold transition"
                          title="Manage Roster"
                        >
                          <UserPlus size={13} />
                        </button>
                      )}
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

              {/* Navigation & Admin Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {canDeleteGroup && (
                  <button
                    type="button"
                    onClick={() => handleConfirmDeleteGroup(activeGroupWorkspace)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center space-x-1.5 transition shrink-0"
                    title="Delete Group"
                  >
                    <Trash2 size={13} />
                    <span>Delete Group</span>
                  </button>
                )}
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
            </div>

            {/* Sub-Tabs: Guidelines vs Assigned Equipment vs Location Map */}
            <div className="grid grid-cols-3 rounded-xl bg-slate-950/80 border border-slate-800 p-1 gap-1">
              <button
                onClick={() => setWorkspaceTab('announcements')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  workspaceTab === 'announcements'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Megaphone size={13} className="shrink-0" />
                <span className="truncate">Guidelines ({announcements.length})</span>
              </button>

              <button
                onClick={() => setWorkspaceTab('inventory')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  workspaceTab === 'inventory'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package size={13} className="shrink-0" />
                <span className="truncate">Equipment ({groupEquipment.length})</span>
              </button>

              <button
                onClick={() => setWorkspaceTab('location')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  workspaceTab === 'location'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin size={13} className="shrink-0" />
                <span className="truncate">Site Map</span>
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

            {/* TAB 2: GROUP HARDWARE INVENTORY & ASSETS (3-CATEGORY BREAKDOWN) */}
            {workspaceTab === 'inventory' && (() => {
              const displayedItems =
                equipmentCategoryTab === 'FIELD'
                  ? groupEquipmentData.activeFieldItems || []
                  : equipmentCategoryTab === 'INSTALLED'
                  ? groupEquipmentData.installedSiteItems || []
                  : equipmentCategoryTab === 'RETURN'
                  ? groupEquipmentData.mustReturnItems || []
                  : groupEquipmentData.items || groupEquipment;

              return (
                <div className="space-y-4">
                  {/* Header with Assign Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Assigned Group Equipment ({groupEquipmentData.summary?.totalCount || displayedItems.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Full disclosure: Field custody, installed on-site, and equipment requiring return.
                      </p>
                    </div>

                    {canManageGroupMembers && (
                      <button
                        onClick={() => {
                          setScannedGroupSerials([]);
                          setGroupRapidInput('');
                          setGroupAssignNotes('');
                          setGroupAssignError(null);
                          setAssignModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-indigo-500/20"
                      >
                        <Plus size={13} />
                        <span>Assign Equipment</span>
                      </button>
                    )}
                  </div>

                  {/* 3 Categories Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setEquipmentCategoryTab('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        equipmentCategoryTab === 'ALL'
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      📦 All Assets ({groupEquipmentData.summary?.totalCount || groupEquipment.length})
                    </button>
                    <button
                      onClick={() => setEquipmentCategoryTab('FIELD')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                        equipmentCategoryTab === 'FIELD'
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span>🟢 In Field Custody ({groupEquipmentData.summary?.activeFieldCount || 0})</span>
                    </button>
                    <button
                      onClick={() => setEquipmentCategoryTab('INSTALLED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                        equipmentCategoryTab === 'INSTALLED'
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span>🔵 Installed On Sites ({groupEquipmentData.summary?.installedSiteCount || 0})</span>
                    </button>
                    <button
                      onClick={() => setEquipmentCategoryTab('RETURN')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                        equipmentCategoryTab === 'RETURN'
                          ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span>🔴 Must Return / Defective ({groupEquipmentData.summary?.mustReturnCount || 0})</span>
                    </button>
                  </div>

                  {/* Equipment List */}
                  {equipmentLoading ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                      <span>Loading group equipment breakdown...</span>
                    </div>
                  ) : displayedItems.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                      <Package size={36} className="mx-auto text-slate-600 opacity-40" />
                      <h4 className="text-sm font-bold text-slate-300">No Equipment in this category</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {equipmentCategoryTab === 'RETURN'
                          ? 'No equipment currently flagged with technical issues or requiring warehouse return.'
                          : equipmentCategoryTab === 'INSTALLED'
                          ? 'No equipment recorded as installed on client premises yet.'
                          : 'Scan or assign serial barcodes to add hardware to this group.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {displayedItems.map((item: any) => {
                        const isDamaged = item.condition === 'DAMAGED' || item.condition === 'DEFECTIVE';
                        const isInstalled = item.classification === 'INSTALLED_ON_SITE';
                        const isMustReturn = item.classification === 'MUST_RETURN' || isDamaged;

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl bg-slate-950 border transition space-y-3 ${
                              isMustReturn
                                ? 'border-rose-500/30 hover:border-rose-500/50 bg-rose-950/5'
                                : isInstalled
                                ? 'border-blue-500/30 hover:border-blue-500/50'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 border ${
                                    isMustReturn
                                      ? 'bg-rose-600/20 text-rose-400 border-rose-500/30'
                                      : isInstalled
                                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                      : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                                  }`}
                                >
                                  <Package size={18} />
                                </div>
                                <div>
                                  <h5 className="font-extrabold text-white text-sm">{item.deviceName}</h5>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                      {item.barcode}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      {item.modelNumber || item.category || 'Hardware'}
                                    </span>
                                    {isInstalled && (
                                      <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                        Installed On Site
                                      </span>
                                    )}
                                    {isMustReturn && (
                                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                        Return Required
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                    item.condition === 'NEW'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : isDamaged
                                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  }`}
                                >
                                  {item.condition}
                                </span>

                                {isInstalled && (
                                  <button
                                    onClick={() => {
                                      setSelectedRetrieveItem(item);
                                      setRetrieveModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                                    title="Retrieve faulty product from client site and optionally dispatch replacement"
                                  >
                                    <RotateCcw size={12} />
                                    <span>Retrieve / Replace</span>
                                  </button>
                                )}

                                {canManageGroupMembers && (
                                  <button
                                    onClick={() => {
                                      setReturnItemModal(item);
                                      setReturnItemCondition(item.condition || 'GOOD');
                                      setReturnItemNotes(
                                        isMustReturn
                                          ? 'Returning defective/damaged equipment from group to central warehouse'
                                          : 'Returning unused surplus equipment to central stock'
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-xl font-semibold text-xs transition border flex items-center gap-1 ${
                                      isMustReturn
                                        ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/40'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                                    }`}
                                    title="Return Equipment to Central Stock"
                                  >
                                    <ArrowRightLeft size={12} />
                                    <span>Return to Warehouse</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Classification / Status Reason Bar */}
                            {item.classificationReason && (
                              <p
                                className={`text-[11px] px-2.5 py-1 rounded-xl border ${
                                  isMustReturn
                                    ? 'bg-rose-950/30 text-rose-300 border-rose-500/20'
                                    : isInstalled
                                    ? 'bg-blue-950/30 text-blue-300 border-blue-500/20'
                                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                                }`}
                              >
                                <strong>Status:</strong> {item.classificationReason}
                              </p>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-900">
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Location / Bin</span>
                                <span className="text-slate-300 font-medium">{item.location || 'Group Custody'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Client / Site</span>
                                <span className="text-slate-300 font-medium">
                                  {item.assignedClient?.companyName || item.assignedClient?.name || '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Assigned On</span>
                                <span className="text-slate-300 font-mono">{formatDate(item.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 3: CCTV INSTALLATION SITE LOCATION & INTERACTIVE MAP */}
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

          {/* 1. DEDICATED CLIENT & CUSTOMER ACCOUNT ASSOCIATION */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-400" />
                <span>Associated Client / Customer Account</span>
              </label>

              <button
                type="button"
                onClick={() => setQuickClientModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold text-[11px] flex items-center gap-1 transition shadow-sm"
              >
                <Plus size={12} />
                <span>New Client</span>
              </button>
            </div>

            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClassName}
            >
              <option value="">No Client Linked (Internal / Standalone Team)...</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName ? `${c.companyName} (${c.name})` : c.name} {c.city ? `• ${c.city}` : ''} • 📞 {c.phone}
                </option>
              ))}
            </select>

            {/* Selected Client Preview Card */}
            {(() => {
              const selectedClient = clientsList.find((c) => c.id === clientId);
              if (!selectedClient) return null;
              return (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start justify-between text-xs animate-in fade-in duration-200">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs truncate">
                        {selectedClient.companyName || selectedClient.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {selectedClient.status || 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User size={11} className="text-slate-500" />
                        <span>{selectedClient.name}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📞 {selectedClient.phone}</span>
                      </span>
                      {selectedClient.email && (
                        <span className="truncate">✉️ {selectedClient.email}</span>
                      )}
                      {selectedClient.city && (
                        <span>📍 {selectedClient.city}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setClientId('')}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 ml-2"
                    title="Unlink Client"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })()}

            <p className="text-[10px] text-slate-500">
              Links this field crew to a corporate client or contract site for direct ticketing, site SLAs, and equipment tracking.
            </p>
          </div>

          {/* 2. CCTV SITE LOCATION SERVICE WITH INTERACTIVE MAP PICKER */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-inner">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Site / Project Location Name
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Patuli Lake Side Project / Apex Towers"
                className={inputClassName}
              />
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

          {/* ASSIGNED SERVICE VEHICLE PICKER */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🚐 Assign Service Vehicle (Van / Utility Truck)</span>
              </label>
              {vehicleId && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                  Vehicle Linked
                </Badge>
              )}
            </div>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className={inputClassName}
            >
              <option value="">No Vehicle Assigned (Select from Fleet...)</option>
              {vehiclesList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} • {v.make} {v.model} ({v.type || 'Service Van'})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500">
              Allocates a company vehicle to this field team for equipment transit and site visits.
            </p>
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

          {/* ===== ASSIGN PRODUCTS & EQUIPMENT DIRECTLY TO GROUP (MULTI-SERIAL SCAN) ===== */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-indigo-400" />
                <span>Assign Equipment & Products (Multi-Serial Scan)</span>
              </label>

              {groupFormBarcodes.length > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-500/40">
                  {groupFormBarcodes.length} Queued
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Scan or enter device serials to immediately assign hardware tools and cameras to this group upon creation.
            </p>

            {/* Error Banner */}
            {groupFormAssignError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                <span>{groupFormAssignError}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={groupFormRapidInput}
                  onChange={(e) => setGroupFormRapidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGroupFormBarcode();
                    }
                  }}
                  placeholder="Scan gun or type serial (e.g. CAM-4K-109)..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none"
                />
                <Barcode size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>

              <button
                type="button"
                onClick={() => handleAddGroupFormBarcode()}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shrink-0"
              >
                Add
              </button>

              <button
                type="button"
                onClick={() => setGroupFormScannerOpen(true)}
                className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition shrink-0"
                title="Scan with Camera"
              >
                <Camera size={15} />
              </button>

              <button
                type="button"
                onClick={() => setGroupFormPasteOpen(true)}
                className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition shrink-0"
                title="Paste from Excel / Invoice"
              >
                <ClipboardPaste size={15} />
              </button>
            </div>

            {/* Queued Serials Chips */}
            {groupFormBarcodes.length > 0 ? (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
                  <span>Queued Equipment ({groupFormBarcodes.length})</span>
                  <button
                    type="button"
                    onClick={() => setGroupFormBarcodes([])}
                    className="text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  {groupFormBarcodes.map((code, idx) => (
                    <span
                      key={`${code}-${idx}`}
                      className="px-2 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs font-mono font-semibold flex items-center gap-1.5"
                    >
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGroupFormBarcode(idx)}
                        className="text-indigo-400 hover:text-rose-400 transition"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic text-center py-1">
                Optional: Scan barcodes to assign products immediately to this group.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            {editingGroupId && canDeleteGroup ? (
              <button
                type="button"
                onClick={() => {
                  const currentG = groups.find((g) => g.id === editingGroupId);
                  if (currentG) handleConfirmDeleteGroup(currentG);
                }}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 size={13} />
                <span>Delete Group</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/25 flex items-center space-x-1.5"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{submitting ? 'Saving...' : editingGroupId ? 'Update Group' : 'Create Group'}</span>
              </button>
            </div>
          </div>
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
            <p className="text-xs text-slate-400 -mt-2">
              {canManageGroupMembers
                ? 'Add or remove technicians from this group.'
                : 'Technicians assigned to this CCTV group.'}
            </p>

            {/* Add User to Group Form - Admins/Managers/HR only */}
            {canManageGroupMembers && (
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
            )}

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

                    {canManageGroupMembers && (
                      <button
                        onClick={() => handleRemoveMember(manageGroup.id, m.userId)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                        title="Remove User from Group"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ===== ASSIGN PRODUCTS / EQUIPMENT TO GROUP MODAL (WITH SCANNER GUN + CAMERA + PASTE) ===== */}
      <Modal
        open={assignModalOpen}
        onClose={() => {
          if (!groupAssignSubmitting) {
            setAssignModalOpen(false);
            setScannedGroupSerials([]);
            setGroupAssignNotes('');
            setGroupAssignError(null);
          }
        }}
        title={`Assign Equipment to ${activeGroupWorkspace?.name || 'Group'}`}
        icon={<PackageCheck size={20} className="text-indigo-400" />}
        maxWidth="max-w-xl"
      >
        {activeGroupWorkspace && (
          <form onSubmit={handleAssignProductsToGroup} className="space-y-4">
            {/* Quick Header */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-xs"
                  style={{ backgroundColor: activeGroupWorkspace.color || '#3b82f6' }}
                >
                  <UsersRound size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">{activeGroupWorkspace.name}</h4>
                  <p className="text-[11px] text-indigo-300">
                    {activeGroupWorkspace.locationName ? `Site: ${activeGroupWorkspace.locationName}` : 'Field Deployment Team'}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-indigo-600/30 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/40">
                {scannedGroupSerials.length} Queued
              </span>
            </div>

            {/* Error Banner */}
            {groupAssignError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                <span>{groupAssignError}</span>
              </div>
            )}

            {/* Multi-Serial Barcode Scanner Input Controls */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode size={14} className="text-indigo-400" />
                  <span>Scan or Enter Product Serial Barcodes</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Press Enter to queue next serial</span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={groupRapidInput}
                    onChange={(e) => setGroupRapidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGroupRapidSerial();
                      }
                    }}
                    placeholder="Scan gun or type serial (e.g. CAM-4K-9810)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none"
                    autoFocus
                  />
                  <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>

                <button
                  type="button"
                  onClick={() => handleAddGroupRapidSerial()}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                >
                  Add
                </button>

                <button
                  type="button"
                  onClick={() => setGroupScannerOpen(true)}
                  className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition"
                  title="Scan with Camera / Webcam"
                >
                  <Camera size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setGroupPasteModalOpen(true)}
                  className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition"
                  title="Paste Bulk Serials from Excel / Bill"
                >
                  <ClipboardPaste size={16} />
                </button>
              </div>

              {/* Scanned Serials Chips List */}
              {scannedGroupSerials.length > 0 ? (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
                    <span>Queued Serials ({scannedGroupSerials.length})</span>
                    <button
                      type="button"
                      onClick={() => setScannedGroupSerials([])}
                      className="text-rose-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    {scannedGroupSerials.map((code, idx) => (
                      <span
                        key={`${code}-${idx}`}
                        className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs font-mono font-semibold flex items-center gap-1.5"
                      >
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveGroupSerial(idx)}
                          className="text-indigo-400 hover:text-rose-400 transition"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic text-center py-2">
                  No serials queued yet. Use scanner gun, camera, or paste from sheet.
                </p>
              )}
            </div>

            {/* Handover / Deployment Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Deployment / Handover Remarks
              </label>
              <textarea
                value={groupAssignNotes}
                onChange={(e) => setGroupAssignNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Dispatched to team for Sector 4 CCTV pole installations..."
                className={textareaClassName}
              />
            </div>

            <ModalFooter
              onClose={() => setAssignModalOpen(false)}
              submitLabel={
                groupAssignSubmitting
                  ? 'Assigning Equipment...'
                  : `Assign ${scannedGroupSerials.length} Devices to Group`
              }
              submitting={groupAssignSubmitting}
            />
          </form>
        )}
      </Modal>

      {/* ===== RETURN EQUIPMENT TO CENTRAL STOCK MODAL ===== */}
      <Modal
        open={!!returnItemModal}
        onClose={() => setReturnItemModal(null)}
        title="Return Equipment to Central Stock"
        icon={<ArrowRightLeft size={20} className="text-emerald-400" />}
        maxWidth="max-w-md"
      >
        {returnItemModal && (
          <form onSubmit={handleReturnProductFromGroup} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Equipment Selected</span>
              <p className="text-sm font-extrabold text-white">{returnItemModal.deviceName}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                  {returnItemModal.barcode}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {returnItemModal.modelNumber || 'Hardware'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Returned Physical Condition
              </label>
              <select
                value={returnItemCondition}
                onChange={(e) => setReturnItemCondition(e.target.value)}
                className={inputClassName}
              >
                <option value="GOOD">1. GOOD - Fully Operational</option>
                <option value="DAMAGED">2. DAMAGED - Broken / Decommissioned</option>
                <option value="NEEDS_REPAIR">3. NEEDS REPAIR - Requires Service / RMA</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Return Inspection Notes / Remarks
              </label>
              <textarea
                value={returnItemNotes}
                onChange={(e) => setReturnItemNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Returned from site installation. Lens clean, all accessories included."
                className={textareaClassName}
              />
            </div>

            <ModalFooter
              onClose={() => setReturnItemModal(null)}
              submitLabel={returnSubmitting ? 'Checking In...' : 'Confirm Return to Central Stock'}
              submitting={returnSubmitting}
            />
          </form>
        )}
      </Modal>

      {/* ===== PASTE BULK SERIALS SUB-MODAL ===== */}
      <Modal
        open={groupPasteModalOpen}
        onClose={() => setGroupPasteModalOpen(false)}
        title="Paste Serials from Excel / Invoice"
        icon={<ClipboardPaste size={18} className="text-emerald-400" />}
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Paste one serial per line, or separated by commas, tabs, or spaces.
          </p>
          <textarea
            value={groupPasteText}
            onChange={(e) => setGroupPasteText(e.target.value)}
            rows={6}
            placeholder="CAM-4K-001&#10;CAM-4K-002&#10;NVR-16CH-992&#10;FIBER-SFP-10G"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <ModalFooter>
            <button
              type="button"
              onClick={() => setGroupPasteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyGroupPaste}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20"
            >
              Import Serials
            </button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ===== SMART CAMERA BARCODE SCANNER ===== */}
      <SmartBarcodeScannerModal
        isOpen={groupScannerOpen}
        onClose={() => setGroupScannerOpen(false)}
        onDetected={(code) => handleAddGroupRapidSerial(code)}
      />

      {/* ===== GROUP FORM CAMERA SCANNER (CREATE / EDIT GROUP MODAL) ===== */}
      <SmartBarcodeScannerModal
        isOpen={groupFormScannerOpen}
        onClose={() => setGroupFormScannerOpen(false)}
        onDetected={(code) => handleAddGroupFormBarcode(code)}
      />

      {/* ===== GROUP FORM PASTE MODAL (CREATE / EDIT GROUP MODAL) ===== */}
      <Modal
        open={groupFormPasteOpen}
        onClose={() => setGroupFormPasteOpen(false)}
        title="Paste Serials for Group Assignment"
        icon={<ClipboardPaste size={18} className="text-emerald-400" />}
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Paste one serial per line, or separated by commas, tabs, or spaces.
          </p>
          <textarea
            value={groupFormPasteText}
            onChange={(e) => setGroupFormPasteText(e.target.value)}
            rows={6}
            placeholder="CAM-4K-001&#10;CAM-4K-002&#10;NVR-16CH-992&#10;FIBER-SFP-10G"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <ModalFooter>
            <button
              type="button"
              onClick={() => setGroupFormPasteOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyGroupFormPaste}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20"
            >
              Import Serials
            </button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ===== CONFIRM DELETE GROUP MODAL ===== */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/30">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Field Group</h3>
                <p className="text-xs text-slate-400">Manager & Admin Action</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: groupToDelete.color || '#3b82f6' }}
                />
                <span className="font-extrabold text-white text-sm">{groupToDelete.name}</span>
              </div>
              {groupToDelete.locationName && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <MapPin size={12} />
                  <span className="truncate">{groupToDelete.locationName}</span>
                </p>
              )}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-4 text-xs text-slate-400">
                <span>{groupToDelete.members?.length || 0} Members</span>
                <span>•</span>
                <span>{groupToDelete._count?.announcements || groupToDelete.announcements?.length || 0} Posts</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong>{groupToDelete.name}</strong>? All members will be unassigned, linked equipment will be released back to central warehouse stock, and discussion boards will be removed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                disabled={deletingGroup}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteGroup}
                disabled={deletingGroup}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/20 flex items-center transition"
              >
                {deletingGroup ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Permanently Delete Group</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Retrieve & Replace Modal */}
      {selectedRetrieveItem && (
        <RetrieveAndReplaceModal
          isOpen={retrieveModalOpen}
          onClose={() => {
            setRetrieveModalOpen(false);
            setSelectedRetrieveItem(null);
          }}
          item={selectedRetrieveItem}
          clientId={activeGroupWorkspace?.clientId}
          onSuccess={() => {
            if (activeGroupWorkspace) fetchGroupEquipment(activeGroupWorkspace.id);
            fetchGroups();
          }}
        />
      )}

      {/* QUICK CLIENT CREATION MODAL */}
      <Modal
        open={quickClientModalOpen}
        onClose={() => setQuickClientModalOpen(false)}
        title="Register & Link New Client"
        icon={<Building2 size={20} className="text-blue-400" />}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuickCreateClient} className="space-y-3.5 py-1">
          <FormField label="Client Company / Organization Name">
            <input
              type="text"
              value={qcCompany}
              onChange={(e) => setQcCompany(e.target.value)}
              placeholder="e.g. Apex Surveillance Corp / Metro Rail Corp"
              className={inputClassName}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Contact Person Name">
              <input
                type="text"
                value={qcName}
                onChange={(e) => setQcName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className={inputClassName}
                required
              />
            </FormField>

            <FormField label="Phone Number">
              <input
                type="tel"
                value={qcPhone}
                onChange={(e) => setQcPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Official Email (Optional)">
              <input
                type="email"
                value={qcEmail}
                onChange={(e) => setQcEmail(e.target.value)}
                placeholder="client@company.com"
                className={inputClassName}
              />
            </FormField>

            <FormField label="City / Region (Optional)">
              <input
                type="text"
                value={qcCity}
                onChange={(e) => setQcCity(e.target.value)}
                placeholder="e.g. Kolkata, Mumbai"
                className={inputClassName}
              />
            </FormField>
          </div>

          <FormField label="Site Address (Optional)">
            <textarea
              value={qcAddress}
              onChange={(e) => setQcAddress(e.target.value)}
              rows={2}
              placeholder="Full site / office address..."
              className={textareaClassName}
            />
          </FormField>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setQuickClientModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingClient}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30"
            >
              {creatingClient ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save & Link to Group</span>
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
