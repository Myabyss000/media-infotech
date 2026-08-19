'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  CheckCircle2,
  Package,
  Barcode,
  Clock,
  MessageSquare,
  Send,
  Trash2,
  Building2,
  LayoutGrid,
  List as ListIcon,
  Check,
  Camera,
  Download,
  Maximize2,
  FileImage,
  X,
  User,
  RotateCcw,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Loader2,
  Lock,
  ArrowRight,
  Phone,
  Mail,
  Truck,
  Calendar,
  AlertCircle,
  Hash,
  Reply,
  CornerDownRight,
  Video,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Wrench,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';
import { api, getApiBaseUrl } from '@/lib/api';
import { getGpsFromImageFile } from '@/lib/exif';
import { TicketConsumeEquipmentModal } from '@/components/tickets/TicketConsumeEquipmentModal';
import { RetrieveAndReplaceModal } from '@/components/inventory/RetrieveAndReplaceModal';

export default function TicketsPage() {
  const API_BASE_URL = getApiBaseUrl();
  const { user, hasPermission, hasRole } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isManagerOrAdmin =
    hasRole('ADMIN', 'MANAGER', 'HR') ||
    userRole === 'ADMIN' ||
    userRole === 'MANAGER' ||
    userRole === 'HR';
  const isAdmin = hasRole('ADMIN') || userRole === 'ADMIN';
  const canManageTickets = isManagerOrAdmin || hasPermission('tickets', 'create');

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const [statusCounts, setStatusCounts] = useState({
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  });

  // Dropdown Options
  const [groups, setGroups] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [filterTechnician, setFilterTechnician] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('ALL_TIME');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState('');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [ticketToResolve, setTicketToResolve] = useState<any | null>(null);
  const [activeTicketDrawer, setActiveTicketDrawer] = useState<any | null>(null);
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);

  // Form State for Ticket Creation
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assignedGroupId: '',
    assignedUserId: '',
    clientId: '',
    vehicleId: '',
    inventoryItemIds: [] as string[],
  });

  // Form State for Ticket Resolution with Proof Photo & GPS Log
  const [resolveForm, setResolveForm] = useState({
    resolutionNote: '',
    inventoryItemIds: [] as string[],
  });
  const [resolvePhotoFile, setResolvePhotoFile] = useState<File | null>(null);
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState<string | null>(null);
  const resolvePhotoInputRef = useRef<HTMLInputElement>(null);

  // Geolocation Audit State for Resolution (captured in background)
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [gpsCaptured, setGpsCaptured] = useState(false);

  // Comment & Discussion Photo Upload & Live Camera State
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoChoiceOpen, setPhotoChoiceOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [commentGpsLocation, setCommentGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  } | null>(null);
  const [fetchingCommentGps, setFetchingCommentGps] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [previewModalPhoto, setPreviewModalPhoto] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerRefreshing, setDrawerRefreshing] = useState(false);

  // Field Product Retrieval & Preselected Install States
  const [selectedRetrieveItem, setSelectedRetrieveItem] = useState<any | null>(null);
  const [retrieveModalOpen, setRetrieveModalOpen] = useState(false);
  const [selectedPreinstalledItem, setSelectedPreinstalledItem] = useState<any | null>(null);

  const handleMarkItemForReturn = async (itemId: string, itemName: string) => {
    if (!activeTicketDrawer) return;
    if (!confirm(`Mark "${itemName}" as uninstalled leftover to be returned to warehouse?`)) return;
    try {
      await api.post(`/api/tickets/${activeTicketDrawer.id}/inventory/${itemId}/mark-return`, {
        condition: 'GOOD',
        notes: 'Uninstalled leftover from field run',
      });
      await Promise.all([handleRefreshActiveTicket(), fetchTickets()]);
    } catch (err: any) {
      console.error('Failed to mark item for return:', err);
      alert(err?.response?.data?.error || 'Failed to mark item for return');
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, filterGroup, filterTechnician, timeRange, startDate, endDate, search]);

  const fetchAuxiliaryData = async () => {
    try {
      const [gRes, cRes, vRes, iRes, uRes] = await Promise.all([
        api.get('/api/groups').catch(() => ({ data: [] })),
        api.get('/api/clients?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/api/vehicles').catch(() => ({ data: [] })),
        api.get('/api/inventory?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/api/users?limit=100').catch(() => ({ data: { data: [] } })),
      ]);
      setGroups(gRes.data || []);
      setClients(cRes.data?.data || cRes.data || []);
      setVehicles(vRes.data || []);
      setInventoryList(iRes.data?.data || iRes.data || []);
      setUsersList(uRes.data?.data || uRes.data || []);
    } catch (e) {
      console.error('Failed to load auxiliary options', e);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchTickets(), fetchAuxiliaryData()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshActiveTicket = async () => {
    if (!activeTicketDrawer?.id) return;
    try {
      setDrawerRefreshing(true);
      const res = await api.get(`/api/tickets/${activeTicketDrawer.id}`);
      if (res.data) {
        setActiveTicketDrawer(res.data);
      }
      fetchTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerRefreshing(false);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = `/api/tickets?search=${search}`;
      if (filterStatus !== 'ALL') query += `&status=${filterStatus}`;
      if (filterPriority !== 'ALL') query += `&priority=${filterPriority}`;
      if (filterGroup !== 'ALL') query += `&assignedGroupId=${filterGroup}`;
      if (filterTechnician !== 'ALL') query += `&assignedUserId=${filterTechnician}`;

      if (timeRange !== 'ALL_TIME' && timeRange !== 'CUSTOM') {
        query += `&timeRange=${timeRange}`;
      } else if (timeRange === 'CUSTOM' && startDate && endDate) {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await api.get(query);
      const ticketData = res.data.data || [];
      setTickets(ticketData);
      if (res.data.statusCounts) {
        setStatusCounts(res.data.statusCounts);
      }

      if (activeTicketDrawer) {
        const updated = ticketData.find((t: any) => t.id === activeTicketDrawer.id);
        if (updated) setActiveTicketDrawer(updated);
      }
    } catch (e) {
      console.error('Fetch tickets error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Acquire technician GPS coordinates silently for admin/manager audit
  const captureResolutionGps = () => {
    if (!navigator.geolocation) {
      setFetchingGps(false);
      return;
    }

    setFetchingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              address = data.display_name;
            }
          }
        } catch {
          // fallback
        }

        setGpsLocation({ lat, lng, accuracy, address });
        setGpsCaptured(true);
        setFetchingGps(false);
      },
      () => {
        setFetchingGps(false);
        setGpsCaptured(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleOpenTicketDetails = async (t: any) => {
    setActiveTicketDrawer(t);
    captureCommentGps();
    try {
      const res = await api.get(`/api/tickets/${t.id}`);
      if (res.data) {
        setActiveTicketDrawer(res.data);
      }
    } catch (err) {
      // Keep initial ticket state if fetch fails
    }
  };

  const handleOpenResolveModal = (t: any) => {
    setTicketToResolve(t);
    setResolveForm({
      resolutionNote: t.resolutionNote || '',
      inventoryItemIds: [],
    });
    handleClearResolvePhoto();
    setGpsLocation(null);
    setGpsCaptured(false);
    setResolveModalOpen(true);
    captureResolutionGps();
  };

  const handleGroupSelect = (selectedGroupId: string) => {
    if (selectedGroupId) {
      const groupEquipment = inventoryList.filter((inv) => inv.assignedGroupId === selectedGroupId);
      const groupEquipmentIds = groupEquipment.map((inv) => inv.id);
      setForm((prev) => ({
        ...prev,
        assignedGroupId: selectedGroupId,
        inventoryItemIds: groupEquipmentIds,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        assignedGroupId: '',
        inventoryItemIds: [],
      }));
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/tickets', form);
      setModalOpen(false);
      setForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: '',
        assignedGroupId: '',
        assignedUserId: '',
        clientId: '',
        vehicleId: '',
        inventoryItemIds: [],
      });
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Status updater with role-based restrictions
  const handleUpdateStatus = async (
    id: string,
    status: string,
    resolutionNote?: string,
    proofPhotoFile?: File | null,
    locationData?: { lat: number; lng: number; accuracy: number; address?: string } | null,
    inventoryItemIds?: string[]
  ) => {
    try {
      if (proofPhotoFile || locationData) {
        const formData = new FormData();
        formData.append('status', status);
        if (resolutionNote) formData.append('resolutionNote', resolutionNote);
        if (proofPhotoFile) formData.append('proofPhoto', proofPhotoFile);
        if (locationData) {
          formData.append('resolveLat', locationData.lat.toString());
          formData.append('resolveLng', locationData.lng.toString());
          formData.append('resolveAccuracy', locationData.accuracy.toString());
          if (locationData.address) formData.append('resolveAddress', locationData.address);
        }
        if (inventoryItemIds && inventoryItemIds.length > 0) {
          formData.append('inventoryItemIds', JSON.stringify(inventoryItemIds));
        }

        await api.put(`/api/tickets/${id}/status`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(`/api/tickets/${id}/status`, {
          status,
          resolutionNote,
          inventoryItemIds,
        });
      }

      await fetchTickets();
      if (activeTicketDrawer && activeTicketDrawer.id === id) {
        const fresh = await api.get(`/api/tickets/${id}`);
        setActiveTicketDrawer(fresh.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update ticket status');
    }
  };

  const handleResolvePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Photo size exceeds 50MB limit.');
      return;
    }

    setResolvePhotoFile(file);
    if (file.type.startsWith('image/')) {
      setResolvePhotoPreview(URL.createObjectURL(file));
    } else {
      setResolvePhotoPreview(null);
    }
  };

  const handleClearResolvePhoto = () => {
    setResolvePhotoFile(null);
    if (resolvePhotoPreview) {
      URL.revokeObjectURL(resolvePhotoPreview);
      setResolvePhotoPreview(null);
    }
    if (resolvePhotoInputRef.current) {
      resolvePhotoInputRef.current.value = '';
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToResolve) return;
    if (!resolveForm.resolutionNote.trim()) {
      alert('Please enter resolution summary & notes.');
      return;
    }

    setResolving(true);
    try {
      await handleUpdateStatus(
        ticketToResolve.id,
        'RESOLVED',
        resolveForm.resolutionNote.trim(),
        resolvePhotoFile,
        gpsLocation,
        resolveForm.inventoryItemIds
      );
      setResolveModalOpen(false);
      setTicketToResolve(null);
      setResolveForm({ resolutionNote: '', inventoryItemIds: [] });
      handleClearResolvePhoto();
      setGpsLocation(null);
      setGpsCaptured(false);
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(false);
    }
  };

  // Admin-only ticket deletion handler
  const handleDeleteTicket = async (ticketId: string) => {
    if (!isAdmin) {
      alert('Permission denied: Only System Admins can delete tickets.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this support ticket? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/tickets/${ticketId}`);
      if (activeTicketDrawer && activeTicketDrawer.id === ticketId) {
        setActiveTicketDrawer(null);
      }
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete ticket');
    }
  };

  const captureCommentGps = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setFetchingCommentGps(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          let address = '';
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
              headers: { 'Accept-Language': 'en' },
            });
            const data = await res.json();
            address = data.display_name || '';
          } catch (e) {
            // fallback
          }
          setCommentGpsLocation({ lat, lng, accuracy: Math.round(accuracy), address });
          setFetchingCommentGps(false);
        },
        () => {
          setFetchingCommentGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  };

  const getInstantGps = async (): Promise<{ lat: number; lng: number; accuracy: number; address?: string } | null> => {
    if (commentGpsLocation?.lat && commentGpsLocation?.lng) {
      return commentGpsLocation;
    }
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          let address = '';
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
              headers: { 'Accept-Language': 'en' },
            });
            const data = await res.json();
            address = data.display_name || '';
          } catch (e) {}
          const loc = { lat, lng, accuracy: Math.round(accuracy), address };
          setCommentGpsLocation(loc);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 }
      );
    });
  };

  const startCamera = async (mode: 'environment' | 'user' = 'environment') => {
    setPhotoChoiceOpen(false);
    captureCommentGps();

    // Check if WebRTC getUserMedia is available in current browser context (requires localhost or HTTPS)
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      // In insecure contexts like HTTP LAN (192.168.x.x), directly trigger native mobile camera
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        photoInputRef.current?.click();
      }
      return;
    }

    setCameraLoading(true);
    setCameraModalOpen(true);
    setFacingMode(mode);

    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Live viewfinder unavailable, falling back to native camera app:', err);
      setCameraModalOpen(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        photoInputRef.current?.click();
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const fileName = `live-camera-${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          setSelectedPhotoFile(file);
          setPhotoPreviewUrl(URL.createObjectURL(file));
          stopCamera();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit.');
      return;
    }

    setSelectedPhotoFile(file);
    if (file.type.startsWith('image/')) {
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } else {
      setPhotoPreviewUrl(null);
    }
    setPhotoChoiceOpen(false);

    // 1. Try reading pinpoint GPS directly from photo's EXIF metadata
    setFetchingCommentGps(true);
    try {
      const exifCoords = await getGpsFromImageFile(file);
      if (exifCoords?.lat && exifCoords?.lng) {
        let address = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${exifCoords.lat}&lon=${exifCoords.lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          address = data.display_name || '';
        } catch (e) {}

        setCommentGpsLocation({
          lat: exifCoords.lat,
          lng: exifCoords.lng,
          accuracy: 3,
          address,
        });
        setFetchingCommentGps(false);
        return;
      }
    } catch (err) {}

    // 2. Fallback to HTML5 Geolocation API
    captureCommentGps();
  };

  const handleClearPhoto = () => {
    setSelectedPhotoFile(null);
    setCommentGpsLocation(null);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleStartReply = (c: any) => {
    setReplyingTo(c);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketDrawer || (!commentText.trim() && !selectedPhotoFile)) return;
    setSubmittingComment(true);
    try {
      // Eagerly await instant GPS coordinates if photo or update is being posted
      const finalGps = await getInstantGps();

      const formData = new FormData();
      if (commentText.trim()) {
        formData.append('content', commentText.trim());
      }
      if (selectedPhotoFile) {
        formData.append('photo', selectedPhotoFile);
      }
      if (replyingTo?.id) {
        formData.append('parentId', replyingTo.id);
      }
      if (finalGps?.lat && finalGps?.lng) {
        formData.append('lat', finalGps.lat.toString());
        formData.append('lng', finalGps.lng.toString());
        if (finalGps.accuracy) {
          formData.append('accuracy', finalGps.accuracy.toString());
        }
        if (finalGps.address) {
          formData.append('address', finalGps.address);
        }
      }

      await api.post(`/api/tickets/${activeTicketDrawer.id}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCommentText('');
      handleClearPhoto();
      setReplyingTo(null);

      const fresh = await api.get(`/api/tickets/${activeTicketDrawer.id}`);
      setActiveTicketDrawer(fresh.data);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activeTicketDrawer || !confirm('Delete this comment?')) return;
    try {
      await api.delete(`/api/tickets/${activeTicketDrawer.id}/comments/${commentId}`);
      const fresh = await api.get(`/api/tickets/${activeTicketDrawer.id}`);
      setActiveTicketDrawer(fresh.data);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  const toggleInventorySelection = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      inventoryItemIds: prev.inventoryItemIds.includes(itemId)
        ? prev.inventoryItemIds.filter((id) => id !== itemId)
        : [...prev.inventoryItemIds, itemId],
    }));
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { bg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30', dot: 'bg-rose-500' };
      case 'HIGH':
        return { bg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', dot: 'bg-orange-500' };
      case 'MEDIUM':
        return { bg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', dot: 'bg-blue-500' };
      default:
        return { bg: 'bg-slate-800 text-slate-400 border border-slate-700', dot: 'bg-slate-500' };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', label: 'Open' };
      case 'IN_PROGRESS':
        return { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', label: 'In Progress' };
      case 'RESOLVED':
        return { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'Resolved' };
      case 'CLOSED':
        return { badge: 'bg-slate-800 text-slate-400 border border-slate-700', label: 'Closed' };
      default:
        return { badge: 'bg-slate-800 text-slate-400 border border-slate-700', label: status };
    }
  };

  const KANBAN_COLUMNS = [
    { key: 'OPEN', title: 'Open', color: 'text-amber-400', dot: 'bg-amber-400' },
    { key: 'IN_PROGRESS', title: 'In Progress', color: 'text-blue-400', dot: 'bg-blue-400' },
    { key: 'RESOLVED', title: 'Resolved', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    { key: 'CLOSED', title: 'Closed', color: 'text-slate-400', dot: 'bg-slate-500' },
  ];

  const totalTicketsCount =
    statusCounts.OPEN + statusCounts.IN_PROGRESS + statusCounts.RESOLVED + statusCounts.CLOSED;

  const STATUS_TABS = [
    { key: 'ALL', label: 'All Tickets', count: totalTicketsCount, activeStyle: 'bg-blue-600 text-white shadow-md' },
    { key: 'OPEN', label: 'Open', count: statusCounts.OPEN, dot: 'bg-amber-400', activeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
    { key: 'IN_PROGRESS', label: 'In Progress', count: statusCounts.IN_PROGRESS, dot: 'bg-blue-400', activeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
    { key: 'RESOLVED', label: 'Resolved', count: statusCounts.RESOLVED, dot: 'bg-emerald-400', activeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
    { key: 'CLOSED', label: 'Archived', count: statusCounts.CLOSED, dot: 'bg-slate-400', activeStyle: 'bg-slate-800 text-slate-200 border-slate-600' },
  ];

  const hasActiveFilters =
    filterStatus !== 'ALL' ||
    filterPriority !== 'ALL' ||
    filterGroup !== 'ALL' ||
    filterTechnician !== 'ALL' ||
    timeRange !== 'ALL_TIME' ||
    search.trim() !== '';

  const resetAllFilters = () => {
    setFilterStatus('ALL');
    setFilterPriority('ALL');
    setFilterGroup('ALL');
    setFilterTechnician('ALL');
    setTimeRange('ALL_TIME');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Support & Field Tickets</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track client issues, field dispatch, SLA deadlines, equipment, and verified resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition flex items-center space-x-2 text-xs font-semibold shadow-sm disabled:opacity-50"
            title="Refresh all tickets & status metrics"
          >
            <RefreshCw size={14} className={refreshing || loading ? 'animate-spin text-blue-400' : 'text-slate-400'} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Tickets'}</span>
          </button>

          {canManageTickets && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/20 shrink-0"
            >
              <Plus size={16} />
              <span>Raise Support Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Status Segmented Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const isActive = filterStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 border transition shrink-0 ${
                isActive
                  ? tab.activeStyle
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets, clients, or issues..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-2xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListIcon size={13} />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Board</span>
            </button>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white max-w-[140px] truncate focus:outline-none"
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
              title="Reset Filters"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        /* ===================== MODERN HIGH-DENSITY LIST / ROW VIEW ===================== */
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800">
              Loading support tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
              <TicketIcon size={32} className="mx-auto text-slate-600 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-400">No tickets match your filter criteria.</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting filters or raising a new support ticket.</p>
            </div>
          ) : (
            tickets.map((t) => {
              const priority = getPriorityStyle(t.priority);
              const status = getStatusStyle(t.status);
              const isOverdue =
                t.dueDate &&
                new Date(t.dueDate) < new Date() &&
                t.status !== 'RESOLVED' &&
                t.status !== 'CLOSED';

              return (
                <div
                  key={t.id}
                  onClick={() => handleOpenTicketDetails(t)}
                  className="group p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:shadow-md"
                >
                  {/* Left Column: ID, Status, Title, Description */}
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    <div className="pt-0.5 shrink-0">
                      <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 block text-center">
                        {t.ticketNumber}
                      </span>
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${status.badge}`}>
                          {status.label}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${priority.bg}`}>
                          {t.priority}
                        </span>
                        <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition leading-snug">
                          {t.title}
                        </h3>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">{t.description}</p>
                      )}

                      {/* Metadata Chips Row */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        {t.client && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-purple-300 bg-purple-950/30 border border-purple-500/20 px-2.5 py-0.5 rounded-xl">
                            <Building2 size={12} className="text-purple-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{t.client.companyName || t.client.name}</span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded-xl border border-slate-800">
                          <User size={12} className="text-blue-400 shrink-0" />
                          <span>
                            {t.assignedUser
                              ? `${t.assignedUser.firstName} ${t.assignedUser.lastName}`
                              : t.assignedGroup?.name || 'Unassigned'}
                          </span>
                        </span>

                        {t.dueDate && (
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-xl ${
                              isOverdue
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                                : 'bg-slate-950 text-slate-400 border border-slate-800'
                            }`}
                          >
                            <Clock size={12} className="shrink-0" />
                            <span>Due {new Date(t.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}

                        {t.proofPhoto && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-0.5 rounded-xl">
                            <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                            <span>Verified Proof</span>
                          </span>
                        )}

                        {t.inventoryItems && t.inventoryItems.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-300 bg-blue-950/30 border border-blue-500/20 px-2 py-0.5 rounded-xl">
                            <Package size={12} className="text-blue-400 shrink-0" />
                            <span>{t.inventoryItems.length} Equipment</span>
                          </span>
                        )}

                        {(t._count?.comments > 0 || t.comments?.length > 0) && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 pl-1">
                            <MessageSquare size={12} />
                            <span>{t._count?.comments || t.comments?.length || 0}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Workflow Action Button & Admin Controls */}
                  <div
                    className="flex items-center space-x-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 w-full lg:w-auto justify-between lg:justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Workflow Progress Button */}
                    {t.status === 'OPEN' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                      >
                        <span>Start Work</span>
                        <ArrowRight size={13} />
                      </button>
                    )}

                    {t.status === 'IN_PROGRESS' && (
                      <div className="flex items-center space-x-1.5">
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'OPEN')}
                            className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            title="Revert to Open (Admin/Manager Only)"
                          >
                            ← Open
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenResolveModal(t)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                        >
                          <span>Resolve (Proof)</span>
                          <CheckCircle2 size={13} />
                        </button>
                      </div>
                    )}

                    {t.status === 'RESOLVED' && (
                      <div className="flex items-center space-x-2">
                        {isManagerOrAdmin ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                              className="px-2.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition flex items-center space-x-1"
                              title="Reopen to In Progress"
                            >
                              <RotateCcw size={12} />
                              <span>Reopen</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'CLOSED')}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                            >
                              Close Ticket →
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <ShieldCheck size={14} />
                            <span>Submitted for Manager Close</span>
                          </span>
                        )}
                      </div>
                    )}

                    {t.status === 'CLOSED' && (
                      isManagerOrAdmin ? (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                          className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <RotateCcw size={12} />
                          <span>Reopen</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono py-1">Archived</span>
                      )
                    )}

                    {/* Admin Delete Trash Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(t.id)}
                        className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 transition"
                        title="Delete Ticket (Admin Only)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ===================== KANBAN BOARD VIEW ===================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                className="rounded-3xl bg-slate-900/60 border border-slate-800 p-4 space-y-3 min-h-[480px] flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h3 className={`text-xs font-extrabold uppercase tracking-wider ${col.color}`}>{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {colTickets.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-0.5">
                  {colTickets.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                      No {col.title.toLowerCase()} tickets
                    </div>
                  ) : (
                    colTickets.map((t) => {
                      const priority = getPriorityStyle(t.priority);

                      return (
                        <div
                          key={t.id}
                          onClick={() => handleOpenTicketDetails(t)}
                          className="group p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition cursor-pointer space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-400">
                              {t.ticketNumber}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${priority.bg}`}>
                              {t.priority}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-xs leading-snug group-hover:text-blue-400 transition line-clamp-2">
                            {t.title}
                          </h4>

                          {t.client && (
                            <div className="flex items-center space-x-1.5 text-[10px] text-purple-300 bg-purple-950/30 px-2 py-1 rounded-xl border border-purple-500/20 truncate">
                              <Building2 size={11} className="shrink-0 text-purple-400" />
                              <span className="truncate">{t.client.companyName || t.client.name}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                            <span className="truncate text-slate-400 text-[10px]">
                              {t.assignedUser ? `${t.assignedUser.firstName}` : 'Unassigned'}
                            </span>
                            <span className="text-blue-400 font-semibold text-[10px]">View Hub →</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== COMPREHENSIVE 2-COLUMN TICKET METADATA & WORK HUB ===================== */}
      <Modal
        open={!!activeTicketDrawer}
        onClose={() => setActiveTicketDrawer(null)}
        title={`Ticket Hub • ${activeTicketDrawer?.ticketNumber || ''}`}
        icon={<TicketIcon size={22} className="text-blue-400" />}
        maxWidth="max-w-7xl w-[96vw]"
      >
        {activeTicketDrawer && (
          <div className="py-1 space-y-4">
            {/* Top Status & Creation Meta Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  {activeTicketDrawer.ticketNumber}
                </span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${getPriorityStyle(activeTicketDrawer.priority).bg}`}>
                  {activeTicketDrawer.priority} Priority
                </span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${getStatusStyle(activeTicketDrawer.status).badge}`}>
                  {getStatusStyle(activeTicketDrawer.status).label}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                <span>
                  Raised by <strong className="text-white">{activeTicketDrawer.createdBy?.firstName || 'Staff'}</strong>
                </span>
                <span>•</span>
                <span className="font-mono">{formatDateTime(activeTicketDrawer.createdAt)}</span>
              </div>
            </div>

            {/* 2-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ================= LEFT COLUMN (60% Work & Timeline Area) ================= */}
              <div className="lg:col-span-7 space-y-5">
                {/* Problem Description Card */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-sm">
                  <p className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Reported Issue Overview</p>
                  <h3 className="text-lg font-bold text-white leading-snug">{activeTicketDrawer.title}</h3>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pt-1">{activeTicketDrawer.description}</p>
                </div>

                {/* Resolution Summary & Evidence Proof (When available) */}
                {(activeTicketDrawer.status === 'RESOLVED' || activeTicketDrawer.status === 'CLOSED' || activeTicketDrawer.proofPhoto) && (
                  <div className="p-5 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-3.5 text-xs shadow-sm">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck size={18} className="text-emerald-400" />
                        <span className="font-bold text-emerald-400 text-sm">Resolution Verification Evidence</span>
                      </div>
                      {activeTicketDrawer.resolvedAt && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Resolved {formatDateTime(activeTicketDrawer.resolvedAt)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-slate-300">
                        <span className="text-slate-500 font-semibold">Resolved By:</span>{' '}
                        <strong className="text-white">
                          {activeTicketDrawer.resolvedBy
                            ? `${activeTicketDrawer.resolvedBy.firstName} ${activeTicketDrawer.resolvedBy.lastName}`
                            : activeTicketDrawer.assignedUser
                            ? `${activeTicketDrawer.assignedUser.firstName} ${activeTicketDrawer.assignedUser.lastName}`
                            : 'Field Technician'}
                        </strong>
                      </p>

                      {activeTicketDrawer.resolutionNote && (
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Technician Solution Notes</p>
                          <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                            {activeTicketDrawer.resolutionNote}
                          </p>
                        </div>
                      )}

                      {/* Proof Photo Thumbnail */}
                      {activeTicketDrawer.proofPhoto && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Attached On-Site Proof Photo</p>
                          <div
                            onClick={() =>
                              setPreviewModalPhoto(
                                activeTicketDrawer.proofPhoto.startsWith('http')
                                  ? activeTicketDrawer.proofPhoto
                                  : `${API_BASE_URL}${activeTicketDrawer.proofPhoto}`
                              )
                            }
                            className="relative group rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 max-w-md cursor-pointer hover:border-emerald-400 transition shadow-lg"
                          >
                            <img
                              src={
                                activeTicketDrawer.proofPhoto.startsWith('http')
                                  ? activeTicketDrawer.proofPhoto
                                  : `${API_BASE_URL}${activeTicketDrawer.proofPhoto}`
                              }
                              alt="Resolution proof photo"
                              className="w-full max-h-56 object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="p-2.5 bg-slate-950/90 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                <FileImage size={14} className="text-emerald-400" />
                                <span>Verified Proof Photo</span>
                              </span>
                              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                                <Maximize2 size={12} /> Inspect High-Res
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assigned Hardware Devices with 3 Clear Installation Statuses */}
                {activeTicketDrawer.inventoryItems && activeTicketDrawer.inventoryItems.length > 0 && (
                  <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 text-xs shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                        <Package size={13} className="text-blue-400" />
                        <span>Attached Hardware & Field Equipment ({activeTicketDrawer.inventoryItems.length})</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreinstalledItem(null);
                          setConsumeModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <Wrench size={11} />
                        <span>+ Scan & Install Device</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {activeTicketDrawer.inventoryItems.map((inv: any) => {
                        const isInstalled = inv.isInstalled || inv.inventoryItem?.isInstalledAtSite;
                        const isReturned = inv.isReturned || (inv.inventoryItem?.location && inv.inventoryItem.location.toLowerCase().startsWith('must return'));
                        const isPending = !isInstalled && !isReturned;

                        return (
                          <div
                            key={inv.id}
                            className={`p-3 rounded-2xl border flex flex-col justify-between text-xs space-y-2 transition ${
                              isInstalled
                                ? 'bg-emerald-950/10 border-emerald-500/30 shadow-sm'
                                : isReturned
                                ? 'bg-rose-950/10 border-rose-500/30'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 pr-1">
                                <p className="font-bold text-white truncate">{inv.inventoryItem?.deviceName}</p>
                                <p className="text-[10px] text-indigo-400 font-mono font-bold truncate">
                                  SN: {inv.inventoryItem?.barcode}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 border ${
                                  isInstalled
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : isReturned
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {isInstalled ? '🟢 Installed at Site' : isReturned ? '🔴 Must Return' : '🟡 In Field Kit'}
                              </span>
                            </div>

                            {inv.installedAt && (
                              <p className="text-[10px] text-emerald-400 font-mono">
                                Verified on {new Date(inv.installedAt).toLocaleDateString()}
                              </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-900">
                              {isInstalled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRetrieveItem(inv.inventoryItem);
                                    setRetrieveModalOpen(true);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition flex items-center gap-1"
                                  title="Retrieve faulty product from field and optionally dispatch replacement"
                                >
                                  <RotateCcw size={10} />
                                  <span>Retrieve / Replace</span>
                                </button>
                              )}

                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPreinstalledItem(inv);
                                      setConsumeModalOpen(true);
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1"
                                  >
                                    <Wrench size={10} />
                                    <span>Install Now</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkItemForReturn(inv.inventoryItemId, inv.inventoryItem?.deviceName || 'Device')}
                                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-[10px] font-semibold transition"
                                  >
                                    Mark Return
                                  </button>
                                </>
                              )}

                              {isReturned && (
                                <span className="text-[10px] text-rose-400 font-medium italic">
                                  Marked to return to warehouse
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Discussion & Photos Feed — EXPANDED & SPACIOUS */}
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800/90 pb-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <MessageSquare size={16} className="text-blue-400" />
                      <span>Discussion & On-Site Activity Log</span>
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setConsumeModalOpen(true)}
                        className="px-3 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
                        title="Scan barcode and mark equipment as installed/used on this ticket with GPS & timestamp"
                      >
                        <Wrench size={13} />
                        <span>Install Equipment</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRefreshActiveTicket}
                        disabled={drawerRefreshing}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-slate-800 transition flex items-center gap-1.5 text-xs font-semibold"
                        title="Refresh Discussion & Activity Log"
                      >
                        <RefreshCw size={12} className={drawerRefreshing ? 'animate-spin text-blue-400' : ''} />
                        <span>{drawerRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                      </button>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {activeTicketDrawer.comments?.length || 0} Messages
                      </span>
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="space-y-3.5 min-h-[380px] max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                    {activeTicketDrawer.comments && activeTicketDrawer.comments.length > 0 ? (
                      activeTicketDrawer.comments.map((c: any) => {
                        const photoFullUrl = c.photo ? (c.photo.startsWith('http') ? c.photo : `${API_BASE_URL}${c.photo}`) : null;

                        return (
                          <div
                            key={c.id}
                            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600/30 to-indigo-500/30 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/30 shadow-sm">
                                {c.author?.firstName?.charAt(0) || 'U'}
                              </div>
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-white text-xs">
                                    {c.author?.firstName} {c.author?.lastName}
                                  </span>
                                  {c.author?.role && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase font-semibold border border-slate-700">
                                      {c.author.role}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                    {formatDateTime(c.createdAt)}
                                  </span>
                                </div>

                                {/* Quoted Parent Reply Context */}
                                {c.parent && (
                                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border-l-2 border-blue-500 text-[11px] text-slate-300 my-1 shadow-inner">
                                    <CornerDownRight size={13} className="text-blue-400 shrink-0" />
                                    <span className="text-slate-400 font-medium">Replying to</span>
                                    <span className="font-bold text-blue-300">
                                      @{c.parent.author?.firstName} {c.parent.author?.lastName}
                                    </span>
                                    {c.parent.author?.role && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                                        {c.parent.author.role}
                                      </span>
                                    )}
                                    <span className="truncate text-slate-400 max-w-[260px] italic">
                                      "{c.parent.content || 'Attached photo'}"
                                    </span>
                                  </div>
                                )}

                                {c.content && (
                                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-slate-200 text-xs leading-relaxed break-words">
                                    {c.content}
                                  </div>
                                )}

                                {/* Attached Photo Evidence */}
                                {photoFullUrl && (
                                  <div className="pt-2">
                                    <div
                                      onClick={() => setPreviewModalPhoto(photoFullUrl)}
                                      className="relative group rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 max-w-md cursor-pointer hover:border-blue-500/50 transition shadow-lg"
                                    >
                                      <img
                                        src={photoFullUrl}
                                        alt="Site photo"
                                        className="w-full max-h-60 object-cover group-hover:scale-105 transition duration-300"
                                      />
                                      <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                          <FileImage size={13} className="text-blue-400" />
                                          <span>Attached Photo Evidence</span>
                                        </span>
                                        <span className="text-blue-400 font-semibold flex items-center gap-1 text-[11px]">
                                          <Maximize2 size={11} /> Inspect High-Res
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* GPS Location Log for Admin & Manager */}
                                {isManagerOrAdmin && ((c.lat != null && c.lng != null) || Boolean(c.address)) && (
                                  <div className="mt-2.5 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1.5 shadow-inner">
                                    <div className="flex items-center justify-between font-bold text-emerald-400">
                                      <span className="flex items-center gap-1.5 text-[11px]">
                                        <MapPin size={13} className="text-emerald-400 shrink-0" />
                                        <span>{c.photo ? 'On-Site Media & Photo Capture Location' : 'Message Timestamp & Verified Location'}</span>
                                      </span>
                                      {c.accuracy && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300">
                                          ±{Math.round(c.accuracy)}m Accuracy
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-slate-200 text-xs leading-snug font-medium">
                                      {c.address ||
                                        (c.lat != null && c.lng != null
                                          ? `${Number(c.lat).toFixed(5)}° N, ${Number(c.lng).toFixed(5)}° E`
                                          : 'On-site location verified')}
                                    </p>
                                    {c.lat != null && c.lng != null && (
                                      <a
                                        href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 transition shadow-sm"
                                      >
                                        <ExternalLink size={11} />
                                        <span>Verify on Google Maps</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Comment Actions: Reply + Delete */}
                            <div className="flex items-center space-x-1.5 shrink-0 self-start pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleStartReply(c)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-600/20 text-slate-400 hover:text-blue-300 border border-slate-700/60 transition flex items-center space-x-1 text-[11px] font-semibold"
                                title="Reply to this message"
                              >
                                <Reply size={11} />
                                <span>Reply</span>
                              </button>

                              {(c.authorId === user?.id || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-slate-500 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-rose-500/10 shrink-0"
                                  title="Delete comment"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-16 text-center space-y-2 border border-dashed border-slate-800/90 rounded-2xl">
                        <MessageSquare size={28} className="mx-auto text-slate-600 opacity-60" />
                        <p className="text-xs font-semibold text-slate-400">No discussion updates yet.</p>
                        <p className="text-[11px] text-slate-500">
                          Use the box below to post progress notes, question technicians, or capture on-site photos.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Replying To Banner */}
                  {replyingTo && (
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-950/50 border border-blue-500/40 text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <CornerDownRight size={14} className="text-blue-400 shrink-0" />
                        <span className="text-slate-400">Replying to</span>
                        <strong className="text-blue-300 font-bold truncate">
                          @{replyingTo.author?.firstName} {replyingTo.author?.lastName}
                        </strong>
                        {replyingTo.author?.role && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase shrink-0">
                            {replyingTo.author.role}
                          </span>
                        )}
                        <span className="truncate text-slate-400 max-w-[240px] italic hidden sm:inline">
                          "{replyingTo.content || 'Attached photo'}"
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-[11px] flex items-center space-x-1 shrink-0 ml-2"
                        title="Cancel reply"
                      >
                        <X size={13} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}

                  {/* Attached Photo Preview */}
                  {selectedPhotoFile && (
                    <div className="flex flex-col p-2.5 rounded-2xl bg-slate-900 border border-blue-500/40 gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {photoPreviewUrl ? (
                            <img
                              src={photoPreviewUrl}
                              alt="Selected preview"
                              className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center shrink-0">
                              <FileImage size={20} />
                            </div>
                          )}
                          <div className="truncate text-xs">
                            <p className="font-semibold text-white truncate">{selectedPhotoFile.name}</p>
                            <p className="text-[10px] text-blue-400 font-mono">
                              {(selectedPhotoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to attach
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearPhoto}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition shrink-0"
                          title="Remove Photo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Universal Live GPS Location Tag Indicator for Text & Media */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                    {fetchingCommentGps ? (
                      <div className="flex items-center space-x-1.5 text-slate-400 font-mono">
                        <Loader2 size={11} className="animate-spin text-blue-400 shrink-0" />
                        <span>Detecting live on-site GPS location...</span>
                      </div>
                    ) : commentGpsLocation ? (
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center space-x-1.5 text-emerald-400 truncate">
                          <MapPin size={12} className="text-emerald-400 shrink-0" />
                          <span className="truncate text-slate-300 font-medium">
                            {commentGpsLocation.address ||
                              `${commentGpsLocation.lat.toFixed(4)}°, ${commentGpsLocation.lng.toFixed(4)}°`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            ±{commentGpsLocation.accuracy}m
                          </span>
                          <button
                            type="button"
                            onClick={captureCommentGps}
                            className="text-slate-400 hover:text-white transition p-0.5"
                            title="Refresh Location"
                          >
                            <RefreshCw size={11} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-500 shrink-0" />
                          <span>Location auto-tagging active (Text & Media)</span>
                        </span>
                        <button
                          type="button"
                          onClick={captureCommentGps}
                          className="text-blue-400 hover:underline text-[10px] font-semibold"
                        >
                          Tag Location
                        </button>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex items-center space-x-2.5 pt-3 border-t border-slate-800/90">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*,.heic,.heif,.dng,.raw,.cr2,.nef,.arw,.tiff,.tif,.bmp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />

                    {/* Camera & Upload Options Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPhotoChoiceOpen(!photoChoiceOpen)}
                        className={`p-3 rounded-2xl border transition flex items-center justify-center shrink-0 ${
                          selectedPhotoFile
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Attach Photo with Live Camera or File Upload"
                      >
                        <Camera size={18} />
                      </button>

                      {photoChoiceOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-52 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-30 space-y-1">
                          <button
                            type="button"
                            onClick={() => startCamera('environment')}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-white hover:bg-blue-600/20 hover:text-blue-300 transition flex items-center gap-2"
                          >
                            <Camera size={15} className="text-blue-400" />
                            <span>Live Camera Photo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPhotoChoiceOpen(false);
                              photoInputRef.current?.click();
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-white hover:bg-blue-600/20 hover:text-blue-300 transition flex items-center gap-2"
                          >
                            <Upload size={15} className="text-indigo-400" />
                            <span>Upload From Files</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <input
                      ref={commentInputRef}
                      type="text"
                      value={commentText}
                      onFocus={() => {
                        if (!commentGpsLocation && !fetchingCommentGps) {
                          captureCommentGps();
                        }
                      }}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={
                        replyingTo
                          ? `Replying to @${replyingTo.author?.firstName}...`
                          : selectedPhotoFile
                          ? 'Add optional message with attached photo...'
                          : 'Type progress update, technical notes, or response...'
                      }
                      className={`flex-1 ${inputClassName} py-2.5`}
                    />

                    <button
                      type="submit"
                      disabled={submittingComment || (!commentText.trim() && !selectedPhotoFile)}
                      className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-md shadow-blue-500/20"
                    >
                      <Send size={13} />
                      <span>{submittingComment ? 'Posting...' : replyingTo ? 'Reply' : 'Post Update'}</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* ================= RIGHT COLUMN (40% Rich Metadata & Logistics Panel) ================= */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* 1. Quick Workflow Progression Controls */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {isManagerOrAdmin ? 'Manager Workflow Status Controls' : 'Ticket Workflow Actions'}
                  </p>

                  {isManagerOrAdmin ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'OPEN')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1.5 ${
                          activeTicketDrawer.status === 'OPEN'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span>🟡 Move to Open</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'IN_PROGRESS')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1.5 ${
                          activeTicketDrawer.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span>🔵 In Progress</span>
                      </button>

                      <button
                        onClick={() => handleOpenResolveModal(activeTicketDrawer)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1.5 ${
                          activeTicketDrawer.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                        }`}
                      >
                        <span>🟢 Resolve / Proof</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'CLOSED')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1.5 ${
                          activeTicketDrawer.status === 'CLOSED'
                            ? 'bg-slate-700/60 border-slate-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span>⚪ Close Ticket</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeTicketDrawer.status === 'OPEN' && (
                        <button
                          onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'IN_PROGRESS')}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center space-x-2"
                        >
                          <span>Start Work → Move to In Progress</span>
                        </button>
                      )}

                      {activeTicketDrawer.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleOpenResolveModal(activeTicketDrawer)}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-2"
                        >
                          <span>Submit Resolution & Proof Photo →</span>
                        </button>
                      )}

                      {activeTicketDrawer.status === 'RESOLVED' && (
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-1.5">
                          <ShieldCheck size={14} />
                          <span>Resolution submitted. Pending Product Manager verification.</span>
                        </div>
                      )}

                      {activeTicketDrawer.status === 'CLOSED' && (
                        <div className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs text-center">
                          This ticket has been officially closed and archived.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. SLA & Timeline Details Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-400" />
                    <span>SLA & Timeline Metadata</span>
                  </p>

                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target SLA Date:</span>
                      <span className="font-bold text-white font-mono">
                        {activeTicketDrawer.dueDate ? new Date(activeTicketDrawer.dueDate).toLocaleDateString() : 'No Target Date'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">SLA Status:</span>
                      {activeTicketDrawer.dueDate ? (
                        new Date(activeTicketDrawer.dueDate) < new Date() &&
                        activeTicketDrawer.status !== 'RESOLVED' &&
                        activeTicketDrawer.status !== 'CLOSED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                            🔴 SLA Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            🟢 On-Track
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500">Standard Priority</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Ticket Created:</span>
                      <span className="text-slate-200 font-mono text-[11px]">{formatDateTime(activeTicketDrawer.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Modified:</span>
                      <span className="text-slate-200 font-mono text-[11px]">{formatDateTime(activeTicketDrawer.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Client & Site Account Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1.5">
                    <Building2 size={12} className="text-purple-400" />
                    <span>Client & Account Info</span>
                  </p>

                  {activeTicketDrawer.client ? (
                    <div className="space-y-2 pt-0.5">
                      <div>
                        <p className="font-bold text-white text-sm">
                          {activeTicketDrawer.client.companyName || activeTicketDrawer.client.name}
                        </p>
                        {activeTicketDrawer.client.companyName && (
                          <p className="text-slate-400 text-[11px]">Contact: {activeTicketDrawer.client.name}</p>
                        )}
                      </div>

                      {activeTicketDrawer.client.phone && (
                        <p className="flex items-center space-x-2 text-slate-300">
                          <Phone size={12} className="text-purple-400 shrink-0" />
                          <a href={`tel:${activeTicketDrawer.client.phone}`} className="text-blue-400 hover:underline">
                            {activeTicketDrawer.client.phone}
                          </a>
                        </p>
                      )}

                      {activeTicketDrawer.client.email && (
                        <p className="flex items-center space-x-2 text-slate-300">
                          <Mail size={12} className="text-purple-400 shrink-0" />
                          <a href={`mailto:${activeTicketDrawer.client.email}`} className="text-blue-400 hover:underline truncate">
                            {activeTicketDrawer.client.email}
                          </a>
                        </p>
                      )}

                      {activeTicketDrawer.client.address && (
                        <p className="flex items-start space-x-2 text-slate-300">
                          <MapPin size={12} className="text-purple-400 shrink-0 mt-0.5" />
                          <span>
                            {activeTicketDrawer.client.address}
                            {activeTicketDrawer.client.city ? `, ${activeTicketDrawer.client.city}` : ''}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs italic">No specific client attached to this ticket.</p>
                  )}
                </div>

                {/* 4. Field Assignment & Logistics Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1.5">
                    <User size={12} className="text-blue-400" />
                    <span>Field Team & Logistics Assignment</span>
                  </p>

                  <div className="space-y-2.5 pt-0.5">
                    {/* Assigned Technician */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Direct Assigned Technician</span>
                      {activeTicketDrawer.assignedUser ? (
                        <div className="flex items-center space-x-2.5 mt-1">
                          <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/30">
                            {activeTicketDrawer.assignedUser.firstName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white">
                              {activeTicketDrawer.assignedUser.firstName} {activeTicketDrawer.assignedUser.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {activeTicketDrawer.assignedUser.designation || 'Technician'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs mt-0.5">Not assigned to an individual technician</p>
                      )}
                    </div>

                    {/* Assigned Group */}
                    {activeTicketDrawer.assignedGroup && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase block">Assigned Field Unit / Group</span>
                        <p className="font-bold text-blue-400 mt-0.5">{activeTicketDrawer.assignedGroup.name}</p>
                      </div>
                    )}

                    {/* Dispatched Vehicle */}
                    {activeTicketDrawer.vehicle && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase block">Dispatched Service Vehicle</span>
                        <div className="flex items-center space-x-2 mt-0.5 text-slate-300">
                          <Truck size={13} className="text-blue-400 shrink-0" />
                          <span className="font-mono font-bold text-white">{activeTicketDrawer.vehicle.registrationNo}</span>
                          <span className="text-slate-500 text-[11px]">({activeTicketDrawer.vehicle.model || 'Field Van'})</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Geolocation Audit Log (Restricted to Admin / Manager / HR) */}
                {isManagerOrAdmin && (activeTicketDrawer.resolveLat || activeTicketDrawer.resolveAddress) && (
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5 text-xs">
                    <p className="text-[10px] text-emerald-400 uppercase font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        <span>Technician Location Audit</span>
                      </span>
                      {activeTicketDrawer.resolveAccuracy && (
                        <span className="text-[9px] font-mono">±{activeTicketDrawer.resolveAccuracy}m Accuracy</span>
                      )}
                    </p>

                    <div className="space-y-2 pt-0.5">
                      <p className="text-slate-200 text-xs leading-snug">
                        {activeTicketDrawer.resolveAddress ||
                          (activeTicketDrawer.resolveLat && activeTicketDrawer.resolveLng
                            ? `${Number(activeTicketDrawer.resolveLat).toFixed(5)}° N, ${Number(activeTicketDrawer.resolveLng).toFixed(5)}° E`
                            : 'Technician on-site location verified')}
                      </p>

                      {activeTicketDrawer.resolveLat && activeTicketDrawer.resolveLng && (
                        <a
                          href={`https://www.google.com/maps?q=${activeTicketDrawer.resolveLat},${activeTicketDrawer.resolveLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-emerald-500/30 w-full shadow-sm"
                        >
                          <ExternalLink size={12} />
                          <span>Verify Location on Google Maps</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin-Only Danger Zone */}
                {isAdmin && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between text-xs">
                    <span className="text-rose-400 font-bold uppercase text-[10px]">Admin Management</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTicket(activeTicketDrawer.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center space-x-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Delete Ticket</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================== CREATE TICKET MODAL ===================== */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Raise Support Ticket"
        icon={<TicketIcon size={20} className="text-blue-400" />}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <FormField label="Ticket Title">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. CCTV Camera Offline at Sector 4"
              className={inputClassName}
              required
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe the issue, reported symptoms, or customer request..."
              className={textareaClassName}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Priority Level">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className={inputClassName}
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent / Critical</option>
              </select>
            </FormField>

            <FormField label="Target SLA Due Date">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Assign Field Group">
              <select
                value={form.assignedGroupId}
                onChange={(e) => handleGroupSelect(e.target.value)}
                className={inputClassName}
              >
                <option value="">Select Group (Optional)...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Assign Specific Technician">
              <select
                value={form.assignedUserId}
                onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}
                className={inputClassName}
              >
                <option value="">Select Technician (Optional)...</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Group Equipment Auto-Link Section */}
          {(() => {
            const activeGroup = groups.find((g) => g.id === form.assignedGroupId);
            const groupEquipment = inventoryList.filter((inv) => inv.assignedGroupId === form.assignedGroupId);
            const otherEquipment = inventoryList.filter((inv) => inv.assignedGroupId !== form.assignedGroupId);

            return (
              <div className="space-y-2.5">
                {activeGroup && groupEquipment.length > 0 && (
                  <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-xs flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Package size={15} className="text-indigo-400 shrink-0" />
                      <span className="truncate">
                        Auto-linked <strong>{groupEquipment.length} products</strong> from <strong>{activeGroup.name}</strong>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-900/80 border border-indigo-500/40 text-[10px] font-mono font-bold text-indigo-300 shrink-0 ml-2">
                      {groupEquipment.length} Selected
                    </span>
                  </div>
                )}

                <FormField label={`Assign Hardware / Equipment (${form.inventoryItemIds.length} Selected)`}>
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-950 p-2.5 rounded-2xl border border-slate-800 custom-scrollbar">
                    {/* 1. Group Allocated Equipment */}
                    {activeGroup && groupEquipment.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
                            Group Equipment (Auto-Linked from {activeGroup.name})
                          </p>
                        </div>
                        {groupEquipment.map((inv) => {
                          const isSelected = form.inventoryItemIds.includes(inv.id);
                          return (
                            <div
                              key={inv.id}
                              onClick={() => toggleInventorySelection(inv.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                                isSelected
                                  ? 'bg-indigo-950/70 border border-indigo-500/60 text-white font-semibold'
                                  : 'bg-slate-900/60 border border-slate-800 text-slate-300'
                              }`}
                            >
                              <div>
                                <p className="text-white font-bold">{inv.deviceName}</p>
                                <p className="text-[10px] text-indigo-300 font-mono">
                                  SN: {inv.barcode} • {inv.modelNumber || 'Hardware'} • Allocated to Group
                                </p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                                  isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                                }`}
                              >
                                {isSelected && <Check size={12} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Additional Warehouse Inventory */}
                    <div className="space-y-1 pt-1">
                      {activeGroup && groupEquipment.length > 0 && (
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-1 pt-1">
                          Additional Available Warehouse Stock
                        </p>
                      )}

                      {otherEquipment.length === 0 && (!activeGroup || groupEquipment.length === 0) ? (
                        <p className="text-xs text-slate-500 text-center py-2">No inventory equipment available.</p>
                      ) : (
                        otherEquipment.map((inv) => {
                          const isSelected = form.inventoryItemIds.includes(inv.id);
                          return (
                            <div
                              key={inv.id}
                              onClick={() => toggleInventorySelection(inv.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                                isSelected
                                  ? 'bg-blue-600/20 border border-blue-500/40 text-white font-semibold'
                                  : 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:bg-slate-900'
                              }`}
                            >
                              <div>
                                <p className="text-white">{inv.deviceName}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  SN: {inv.barcode} • {inv.modelNumber || 'Hardware'}
                                </p>
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
                  </div>
                </FormField>
              </div>
            );
          })()}

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel={submitting ? 'Raising...' : 'Create Ticket'}
            submitting={submitting}
          />
        </form>
      </Modal>

      {/* ===================== RESOLVE TICKET MODAL ===================== */}
      <Modal
        open={resolveModalOpen}
        onClose={() => {
          setResolveModalOpen(false);
          handleClearResolvePhoto();
        }}
        title="Resolve Ticket • Verified Proof of Work"
        icon={<CheckCircle2 size={20} className="text-emerald-400" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          <FormField label="Resolution Summary & Solution Notes">
            <textarea
              value={resolveForm.resolutionNote}
              onChange={(e) => setResolveForm({ ...resolveForm, resolutionNote: e.target.value })}
              rows={3}
              placeholder="Explain how the issue was fixed, components replaced, or adjustments made on site..."
              className={textareaClassName}
              required
            />
          </FormField>

          {/* Proof Photo Attachment */}
          <FormField label="Resolution Proof Photo (Site Verification)">
            <input
              ref={resolvePhotoInputRef}
              type="file"
              accept="image/*,.heic,.heif,.dng,.raw,.cr2,.nef,.arw,.tiff,.tif,.bmp"
              onChange={handleResolvePhotoSelect}
              className="hidden"
            />

            {resolvePhotoFile ? (
              <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  {resolvePhotoPreview ? (
                    <img
                      src={resolvePhotoPreview}
                      alt="Proof preview"
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileImage size={20} />
                    </div>
                  )}
                  <div className="truncate text-xs">
                    <p className="font-bold text-white truncate">{resolvePhotoFile.name}</p>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      {(resolvePhotoFile.size / (1024 * 1024)).toFixed(2)} MB • Verified Proof Attached
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearResolvePhoto}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition shrink-0"
                  title="Remove Photo"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => resolvePhotoInputRef.current?.click()}
                className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 hover:border-emerald-500/50 cursor-pointer transition flex flex-col items-center justify-center space-y-1.5 text-center group"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Camera size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition">
                    Click to attach Proof Photo
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Supports high-resolution camera captures and RAW formats (up to 50MB)
                  </p>
                </div>
              </div>
            )}
          </FormField>

          {/* On-Site Verification Indicator */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <div>
                <p className="font-bold text-white text-[11px]">On-Site Audit Verification</p>
                <p className="text-[10px] text-slate-400">
                  {fetchingGps
                    ? 'Acquiring geolocation tag...'
                    : gpsCaptured
                    ? 'GPS location captured for manager verification'
                    : 'Location verification active'}
                </p>
              </div>
            </div>
            {fetchingGps && <Loader2 size={13} className="text-blue-400 animate-spin" />}
          </div>

          <ModalFooter
            onClose={() => {
              setResolveModalOpen(false);
              handleClearResolvePhoto();
            }}
            submitLabel={resolving ? 'Verifying & Resolving...' : 'Confirm Resolution'}
            submitting={resolving}
            variant="emerald"
          />
        </form>
      </Modal>

      {/* ===================== LIVE ON-SITE CAMERA VIEWFINDER MODAL ===================== */}
      <Modal
        open={cameraModalOpen}
        onClose={stopCamera}
        title="Live On-Site Camera Capture"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center min-h-[300px] max-h-[440px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover max-h-[440px]"
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraLoading && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 text-white">
                <Loader2 size={32} className="animate-spin text-blue-400" />
                <p className="font-semibold">Starting camera...</p>
              </div>
            )}

            {/* Flip Camera Button */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-slate-700/70 hover:bg-blue-600 transition shadow-lg z-10"
              title="Switch Camera (Front/Back)"
            >
              <RefreshCw size={16} />
            </button>

            {/* Location Tag Status */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 text-[10px] font-mono z-10">
              <MapPin size={11} className="animate-pulse" />
              <span>
                {commentGpsLocation ? 'GPS Tagged' : fetchingCommentGps ? 'Locating...' : 'GPS Ready'}
              </span>
            </div>
          </div>

          {/* Location Summary if captured */}
          {commentGpsLocation?.address && (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-slate-300 text-[11px]">
              <MapPin size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">{commentGpsLocation.address}</span>
            </div>
          )}

          {/* Camera Bottom Shutter Bar */}
          <div className="flex items-center justify-center space-x-6 pt-2 pb-1">
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition text-xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition flex items-center justify-center border-4 border-white/20"
              title="Capture On-Site Photo"
            >
              <Camera size={26} />
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== HIGH-RESOLUTION LIGHTBOX MODAL ===================== */}
      {previewModalPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setPreviewModalPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-1 text-white">
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <FileImage size={15} className="text-blue-400" />
                <span>Site Photo Inspection</span>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewModalPhoto}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1 transition shadow-md"
                >
                  <Download size={12} />
                  <span>Download Original</span>
                </a>
                <button
                  onClick={() => setPreviewModalPhoto(null)}
                  className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center max-h-[75vh] w-full shadow-2xl">
              <img
                src={previewModalPhoto}
                alt="Ticket attachment preview"
                className="max-h-[72vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* In-Field Ticket Equipment Installation & Consumption Modal */}
      {activeTicketDrawer && (
        <TicketConsumeEquipmentModal
          isOpen={consumeModalOpen}
          onClose={() => {
            setConsumeModalOpen(false);
            setSelectedPreinstalledItem(null);
          }}
          ticketId={activeTicketDrawer.id}
          ticketNumber={activeTicketDrawer.ticketNumber}
          preselectedItem={selectedPreinstalledItem}
          onSuccess={async () => {
            await Promise.all([handleRefreshActiveTicket(), fetchTickets()]);
          }}
        />
      )}

      {/* Retrieve / Replace Field Product Modal */}
      {selectedRetrieveItem && (
        <RetrieveAndReplaceModal
          isOpen={retrieveModalOpen}
          onClose={() => {
            setRetrieveModalOpen(false);
            setSelectedRetrieveItem(null);
          }}
          item={selectedRetrieveItem}
          ticketId={activeTicketDrawer?.id}
          clientId={activeTicketDrawer?.clientId}
          onSuccess={async () => {
            await Promise.all([handleRefreshActiveTicket(), fetchTickets()]);
          }}
        />
      )}
    </div>
  );
}
