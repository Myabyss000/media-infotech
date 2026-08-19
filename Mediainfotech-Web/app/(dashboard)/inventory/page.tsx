'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Camera,
  Upload,
  RefreshCw,
  Download,
  Printer,
  Edit,
  Trash2,
  LayoutGrid,
  List,
  ShieldCheck,
  UserCheck,
  Wrench,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  DollarSign,
  Tag,
  MapPin,
  Building,
  Truck,
  UsersRound,
  PackageCheck,
  ArrowUpRight,
  X,
  Scan,
  FileText,
  CheckCircle2,
  Layers,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { InventoryStatsCards } from '@/components/inventory/InventoryStatsCards';
import { InventoryItemDrawer } from '@/components/inventory/InventoryItemDrawer';
import { BarcodeLabelPrinterModal } from '@/components/inventory/BarcodeLabelPrinterModal';
import { SmartBarcodeScannerModal } from '@/components/inventory/SmartBarcodeScannerModal';
import { CustodyDispatchModal } from '@/components/inventory/CustodyDispatchModal';
import { ManualAllocationModal } from '@/components/inventory/ManualAllocationModal';
import { InventoryModal } from '@/components/inventory/InventoryModal';
import { BatchProductLookupModal } from '@/components/inventory/BatchProductLookupModal';
import { BatchReturnModal } from '@/components/inventory/BatchReturnModal';
import { InventoryAuditDocumentModal } from '@/components/inventory/InventoryAuditDocumentModal';
import { RetrieveAndReplaceModal } from '@/components/inventory/RetrieveAndReplaceModal';
import { useHardwareScanner } from '@/lib/useHardwareScanner';
import { RotateCcw } from 'lucide-react';

export default function InventoryPage() {
  const { hasPermission, hasRole, user } = useAuth();
  const isPrivileged = hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('inventory', 'create') || hasPermission('inventory', 'delete');

  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [seedingPresets, setSeedingPresets] = useState(false);
  const [batchLookupOpen, setBatchLookupOpen] = useState(false);
  const [batchReturnModalOpen, setBatchReturnModalOpen] = useState(false);
  const [auditDocModalOpen, setAuditDocModalOpen] = useState(false);

  // Bulk Selection & Deletion State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Display & Grouping Mode (Consolidated Product Model vs Individual Serials)
  const [displayMode, setDisplayMode] = useState<'PRODUCT_GROUPED' | 'INDIVIDUAL'>('PRODUCT_GROUPED');

  // Filters
  const [search, setSearch] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<
    'ALL' | 'IN_STOCK' | 'ASSIGNED' | 'INSTALLED' | 'MUST_RETURN' | 'UNDER_MAINTENANCE' | 'LOW_STOCK' | 'EXPIRING_SOON'
  >('IN_STOCK');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterCondition, setFilterCondition] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Field Product Retrieval / RMA State
  const [retrieveModalOpen, setRetrieveModalOpen] = useState(false);
  const [selectedRetrieveItem, setSelectedRetrieveItem] = useState<any | null>(null);

  // Modals & Drawers State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [scannedInitialBarcode, setScannedInitialBarcode] = useState<string>('');

  const [manualAllocOpen, setManualAllocOpen] = useState(false);
  const [allocTargetItem, setAllocTargetItem] = useState<any | null>(null);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [itemToPrint, setItemToPrint] = useState<any | null>(null);

  const [smartScannerOpen, setSmartScannerOpen] = useState(false);

  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchItem, setDispatchItem] = useState<any | null>(null);
  const [dispatchMode, setDispatchMode] = useState<'CHECK_OUT' | 'CHECK_IN'>('CHECK_OUT');

  // 24/7 Background Physical Scanner Gun Listener
  useHardwareScanner({
    onScan: (barcode) => {
      handleSmartScan(barcode);
    },
    enabled: !createModalOpen && !manualAllocOpen && !printModalOpen && !smartScannerOpen && !dispatchModalOpen,
  });

  useEffect(() => {
    fetchInventory();
    fetchStats();
    fetchAuxiliaryData();
  }, [search, activeTabFilter, filterCategory, filterCondition]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (filterCondition !== 'ALL') params.append('condition', filterCondition);

      if (activeTabFilter === 'IN_STOCK') params.append('segment', 'IN_STOCK');
      else if (activeTabFilter === 'ASSIGNED') params.append('segment', 'FIELD_KIT');
      else if (activeTabFilter === 'INSTALLED') params.append('segment', 'INSTALLED');
      else if (activeTabFilter === 'MUST_RETURN') params.append('segment', 'MUST_RETURN');
      else if (activeTabFilter === 'UNDER_MAINTENANCE') params.append('segment', 'UNDER_MAINTENANCE');
      else if (activeTabFilter === 'LOW_STOCK') params.append('lowStock', 'true');
      else if (activeTabFilter === 'EXPIRING_SOON') params.append('warrantyStatus', 'EXPIRING_SOON');

      const res = await api.get(`/api/inventory?${params.toString()}`);
      setItems(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/api/inventory/stats');
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [uRes, cRes, vRes, gRes] = await Promise.all([
        api.get('/api/users?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/api/clients?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/api/vehicles').catch(() => ({ data: [] })),
        api.get('/api/groups').catch(() => ({ data: [] })),
      ]);
      setUsers(uRes.data?.data || uRes.data || []);
      setClients(cRes.data?.data || cRes.data || []);
      setVehicles(vRes.data || []);
      setGroups(gRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchInventory(), fetchStats(), fetchAuxiliaryData()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpen360 = (itemId: string) => {
    setSelectedItemId(itemId);
    setDrawerOpen(true);
  };

  const handleOpenPrint = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToPrint(item);
    setPrintModalOpen(true);
  };

  const handleOpenDispatch = (item: any, mode: 'CHECK_OUT' | 'CHECK_IN', e: React.MouseEvent) => {
    e.stopPropagation();
    setDispatchItem(item);
    setDispatchMode(mode);
    setDispatchModalOpen(true);
  };

  // Universal Smart Barcode Scanner Handler (Camera, Upload Image, or Physical Scanner Gun)
  const handleSmartScan = async (scannedCode: string) => {
    if (!scannedCode) return;
    const clean = scannedCode.trim();

    try {
      setLoading(true);
      const res = await api.get(`/api/inventory/barcode/${encodeURIComponent(clean)}`);
      if (res.data?.id) {
        // Found existing item -> open 360 dossier
        handleOpen360(res.data.id);
      }
    } catch (err: any) {
      // Unregistered barcode -> prompt to register with this barcode prefilled!
      setScannedInitialBarcode(clean);
      setEditingItem(null);
      setCreateModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert('No inventory records to export.');
      return;
    }

    const headers = [
      'Device Name',
      'Model Number',
      'Barcode / Serial',
      'Category',
      'Condition',
      'Status',
      'Stock Quantity',
      'Storage Location',
      'Custodian / Deployment',
      'Supplier',
      'Purchase Date',
      'Warranty Expiry',
    ];

    const rows = items.map((i) => {
      const custodian = i.assignedUser
        ? `Technician ${i.assignedUser.firstName} ${i.assignedUser.lastName}`
        : i.assignedClient
          ? `Client Site: ${i.assignedClient.companyName || i.assignedClient.name}`
          : i.assignedVehicle
            ? `Vehicle: ${i.assignedVehicle.registrationNo}`
            : 'In Stock';

      return [
        `"${i.deviceName || ''}"`,
        `"${i.modelNumber || ''}"`,
        `"${i.barcode || ''}"`,
        `"${i.category || ''}"`,
        `"${i.condition || ''}"`,
        `"${i.status || ''}"`,
        i.stockAmount || 1,
        `"${i.location || ''}"`,
        `"${custodian}"`,
        `"${i.supplier || ''}"`,
        `"${i.buyDate ? new Date(i.buyDate).toISOString().split('T')[0] : ''}"`,
        `"${i.warrantyExpiry ? new Date(i.warrantyExpiry).toISOString().split('T')[0] : ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MediaInfotech_Inventory_Assets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncPresets = async () => {
    if (!confirm('Synchronize the 60 standard company telecom, fiber, and CCTV equipment items into master inventory?')) return;
    try {
      setSeedingPresets(true);
      const res = await api.post('/api/inventory/seed-presets');
      alert(res.data?.message || 'Standard company preset catalog synchronized successfully!');
      await Promise.all([fetchInventory(), fetchStats()]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to sync presets');
    } finally {
      setSeedingPresets(false);
    }
  };

  // Consolidated Product Model Grouping
  const groupedProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        groupKey: string;
        deviceName: string;
        modelNumber: string | null;
        category: string;
        condition: string;
        status: string;
        totalUnits: number;
        inStockCount: number;
        fieldKitCount: number;
        installedCount: number;
        mustReturnCount: number;
        maintenanceCount: number;
        location: string | null;
        supplier: string | null;
        unitPrice: number | null;
        items: any[];
      }
    >();

    items.forEach((item) => {
      const normName = (item.deviceName || '').trim().toLowerCase();
      const normModel = (item.modelNumber || '').trim().toLowerCase();
      const key = `${normName}___${normModel}`;

      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          deviceName: item.deviceName,
          modelNumber: item.modelNumber,
          category: item.category || 'Hardware/Device',
          condition: item.condition || 'NEW',
          status: item.status || 'IN_STOCK',
          totalUnits: 0,
          inStockCount: 0,
          fieldKitCount: 0,
          installedCount: 0,
          mustReturnCount: 0,
          maintenanceCount: 0,
          location: item.location,
          supplier: item.supplier,
          unitPrice: item.unitPrice,
          items: [],
        });
      }

      const grp = map.get(key)!;
      const count = item.stockAmount || 1;
      grp.totalUnits += count;

      const isDamaged = item.condition === 'DAMAGED' || item.condition === 'DEFECTIVE' || item.condition === 'NEEDS_REPAIR';
      const isMaintenance = item.status === 'UNDER_MAINTENANCE' || item.status === 'RETIRED';
      const isExplicitlyMarkedReturn = (item.location && item.location.toLowerCase().includes('must return')) || item.retrievedAt !== null;
      const isInstalled = (item.isInstalledAtSite === true || (item.location && item.location.toLowerCase().includes('installed')) || item.assignedClientId != null) && !item.retrievedAt;

      if (isDamaged || isMaintenance || isExplicitlyMarkedReturn) {
        grp.mustReturnCount += count;
        if (isMaintenance) grp.maintenanceCount += count;
      } else if (isInstalled) {
        grp.installedCount += count;
      } else if (item.status === 'ASSIGNED') {
        grp.fieldKitCount += count;
      } else {
        grp.inStockCount += count;
      }

      grp.items.push(item);
    });

    return Array.from(map.values());
  }, [items]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === items.length && items.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((i) => i.id));
    }
  };

  const handleToggleSelectItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectGroup = (grp: { items: any[] }, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const groupItemIds = grp.items.map((i) => i.id);
    const allSelected = groupItemIds.every((id) => selectedItemIds.includes(id));
    if (allSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !groupItemIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...groupItemIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedItemIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await api.post('/api/inventory/bulk-delete', { itemIds: selectedItemIds });
      alert(res.data?.message || `Successfully deleted ${selectedItemIds.length} items.`);
      setBulkDeleteModalOpen(false);
      setSelectedItemIds([]);
      await Promise.all([fetchInventory(), fetchStats()]);
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      alert(err.response?.data?.error || 'Failed to bulk delete items');
    } finally {
      setBulkDeleting(false);
    }
  };

  const selectedItemsList = items.filter((i) => selectedItemIds.includes(i.id));
  const hasInstalledOrAssigned = selectedItemsList.some(
    (i) => i.status === 'ASSIGNED' || i.assignedClientId != null || (i.location && i.location.toLowerCase().includes('installed'))
  );

  return (
    <div className="space-y-6">
      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isPrivileged ? 'Hardware Inventory' : 'My Equipment'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isPrivileged
              ? 'Stock levels, serial tracking & field dispatch.'
              : 'Hardware and tools in your custody or field group.'}
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Universal Barcode Scanner */}
          <Button
            variant="outline"
            onClick={() => setSmartScannerOpen(true)}
            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold gap-1.5"
            title="Scan Barcode"
          >
            <Camera size={14} className="text-blue-400" />
            <span>Scan</span>
          </Button>

          {isPrivileged && (
            <>
              {/* Batch Dispatch */}
              {hasPermission('inventory', 'update') && (
                <Button
                  onClick={() => {
                    setDispatchItem(null);
                    setDispatchMode('CHECK_OUT');
                    setDispatchModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <PackageCheck size={14} />
                  <span>Dispatch</span>
                </Button>
              )}

              {/* Batch Return */}
              {hasPermission('inventory', 'update') && (
                <Button
                  onClick={() => setBatchReturnModalOpen(true)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold gap-1.5"
                >
                  <ArrowRightLeft size={14} />
                  <span>Return</span>
                </Button>
              )}

              {/* Add Device */}
              {hasPermission('inventory', 'create') && (
                <Button
                  onClick={() => {
                    setScannedInitialBarcode('');
                    setEditingItem(null);
                    setCreateModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Plus size={14} />
                  <span>Add Device</span>
                </Button>
              )}

              {/* More Tools Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setMoreToolsOpen(!moreToolsOpen)}
                  className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold gap-1.5"
                >
                  <SlidersHorizontal size={14} />
                  <span>Tools</span>
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${moreToolsOpen ? 'rotate-180' : ''}`} />
                </Button>

                {moreToolsOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-0.5"
                    onMouseLeave={() => setMoreToolsOpen(false)}
                  >
                    <button
                      onClick={() => {
                        setBatchLookupOpen(true);
                        setMoreToolsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition font-medium"
                    >
                      <Barcode size={14} className="text-indigo-400" />
                      <span>Multi-Serial Lookup</span>
                    </button>

                    <button
                      onClick={() => {
                        setAllocTargetItem(null);
                        setManualAllocOpen(true);
                        setMoreToolsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition font-medium"
                    >
                      <ArrowRightLeft size={14} className="text-blue-400" />
                      <span>Manual Allocation</span>
                    </button>

                    <button
                      onClick={() => {
                        setAuditDocModalOpen(true);
                        setMoreToolsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition font-medium"
                    >
                      <FileText size={14} className="text-purple-400" />
                      <span>Audit Documents</span>
                    </button>

                    <button
                      onClick={() => {
                        handleExportCSV();
                        setMoreToolsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition font-medium"
                    >
                      <Download size={14} className="text-emerald-400" />
                      <span>Export CSV</span>
                    </button>

                    {hasPermission('inventory', 'create') && (
                      <button
                        onClick={() => {
                          handleSyncPresets();
                          setMoreToolsOpen(false);
                        }}
                        disabled={seedingPresets}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition font-medium"
                      >
                        <Package size={14} className={`text-amber-400 ${seedingPresets ? 'animate-spin' : ''}`} />
                        <span>{seedingPresets ? 'Syncing...' : 'Sync 60 Presets'}</span>
                      </button>
                    )}

                    <div className="pt-1 mt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          handleManualRefresh();
                          setMoreToolsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition font-medium"
                      >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-400' : 'text-slate-400'} />
                        <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!isPrivileged && (
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold gap-1.5"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-400' : 'text-slate-400'} />
              <span>Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      {!isPrivileged ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In My Toolbag</span>
            <p className="text-2xl font-black font-mono text-white mt-1">
              {items.filter((i) => i.assignedUserId === user?.id).length}
            </p>
            <p className="text-[11px] text-blue-400 mt-0.5">Personal Custody</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Group Van</span>
            <p className="text-2xl font-black font-mono text-white mt-1">
              {items.filter((i) => i.assignedGroupId).length}
            </p>
            <p className="text-[11px] text-indigo-400 mt-0.5">Team & Van Assets</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational & Good</span>
            <p className="text-2xl font-black font-mono text-white mt-1">
              {items.filter((i) => i.condition === 'NEW' || i.condition === 'GOOD' || i.condition === 'EXCELLENT').length}
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Ready for Deployment</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Defective / Returns</span>
            <p className="text-2xl font-black font-mono text-white mt-1">
              {items.filter((i) => i.condition === 'DAMAGED' || i.condition === 'DEFECTIVE').length}
            </p>
            <p className="text-[11px] text-rose-400 mt-0.5">Warehouse Return Required</p>
          </div>
        </div>
      ) : (
        <InventoryStatsCards stats={stats} loading={statsLoading} />
      )}

      {/* Lifecycle & Stock Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2.5 overflow-x-auto no-scrollbar">
        {isPrivileged ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTabFilter('IN_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'IN_STOCK'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>In Stock</span>
              {stats?.inStock !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-emerald-400 font-mono">
                  {stats.inStock}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('ASSIGNED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'ASSIGNED'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <UserCheck size={13} className="text-blue-400" />
              <span>In Field Kits</span>
              {stats?.inFieldKits !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-blue-400 font-mono">
                  {stats.inFieldKits}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('INSTALLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'INSTALLED'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <Building size={13} className="text-cyan-400" />
              <span>Installed at Sites</span>
              {stats?.installedAtSites !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-cyan-400 font-mono">
                  {stats.installedAtSites}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('MUST_RETURN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'MUST_RETURN'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <ArrowRightLeft size={13} className="text-rose-400" />
              <span>Must Return / Defective</span>
              {stats?.mustReturn !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-rose-400 font-mono">
                  {stats.mustReturn}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('UNDER_MAINTENANCE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'UNDER_MAINTENANCE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <Wrench size={13} className="text-amber-400" />
              <span>Maintenance / Repair</span>
              {stats?.underMaintenance !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-amber-400 font-mono">
                  {stats.underMaintenance}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'LOW_STOCK'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <AlertTriangle size={13} className="text-rose-400" />
              <span>Low Stock</span>
              {stats?.lowStockCount !== undefined && stats.lowStockCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-950/60 text-rose-400 font-bold font-mono">
                  {stats.lowStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'ALL'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <span>All Items</span>
              {stats?.totalDevices !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-slate-400 font-mono">
                  {stats.totalDevices}
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'ALL'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <span>All Items ({items.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('IN_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'IN_STOCK'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <span>In My Toolbag ({items.filter((i) => i.assignedUserId === user?.id).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('ASSIGNED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'ASSIGNED'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <span>In Group Van ({items.filter((i) => i.assignedGroupId).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('UNDER_MAINTENANCE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${activeTabFilter === 'UNDER_MAINTENANCE'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <span>Defective / Returns ({items.filter((i) => i.condition === 'DAMAGED' || i.condition === 'DEFECTIVE').length})</span>
            </button>
          </>
        )}
      </div>

      {/* Toolbar Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5 flex-1 max-w-3xl flex-wrap">
          {/* Select All Checkbox */}
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
              <input
                type="checkbox"
                id="selectAllInventory"
                checked={selectedItemIds.length === items.length && items.length > 0}
                onChange={handleToggleSelectAll}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="selectAllInventory" className="text-xs text-slate-400 cursor-pointer select-none font-semibold">
                {selectedItemIds.length > 0 ? `${selectedItemIds.length}/${items.length}` : 'All'}
              </label>
            </div>
          )}

          {/* Search Input and Multi-Scan Button cleanly placed side-by-side */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by device, serial, barcode, model..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setBatchLookupOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-sm"
              title="Multi-Serial Batch Lookup Scanner"
            >
              <Barcode size={13} className="text-indigo-400" />
              <span>Multi-Scan</span>
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Hardware/Device">Hardware / Device</option>
            <option value="Fiber Optic & Splitters">Fiber Optic & Splitters</option>
            <option value="CCTV/Surveillance">CCTV & Surveillance</option>
            <option value="Networking/Routers">Networking & Routers</option>
            <option value="Cables/Wiring">Cables & Wiring</option>
            <option value="Servers/Computing">Servers & Computing</option>
            <option value="Power/UPS">Power & UPS Batteries</option>
            <option value="Field Tools">Field Equipment</option>
          </select>

          {/* Condition Filter */}
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Conditions</option>
            <option value="NEW">New</option>
            <option value="EXCELLENT">Excellent</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="DAMAGED">Damaged</option>
            <option value="DEFECTIVE">Defective</option>
          </select>
        </div>

        {/* View & Grouping Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Display Mode: Consolidated by Product Model vs Individual Serials */}
          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDisplayMode('PRODUCT_GROUPED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${displayMode === 'PRODUCT_GROUPED' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              title="Consolidate multiple scanned serials into unified product cards with combined stock count"
            >
              <Layers size={13} />
              <span>By Product ({groupedProducts.length})</span>
            </button>
            <button
              onClick={() => setDisplayMode('INDIVIDUAL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${displayMode === 'INDIVIDUAL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              title="View each individual serial barcode separately"
            >
              <Barcode size={13} />
              <span>By Serial ({items.length})</span>
            </button>
          </div>

          {/* Grid vs Table View */}
          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              title="3D Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              title="Corporate Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-xs">Loading hardware inventory...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-400 text-xs">
          No hardware devices found matching your filter criteria.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayMode === 'PRODUCT_GROUPED'
            ? groupedProducts.map((grp) => {
              const isAllSelected =
                grp.items.length > 0 && grp.items.every((it) => selectedItemIds.includes(it.id));
              const primaryItem = grp.items[0];

              return (
                <div
                  key={grp.groupKey}
                  onClick={() => handleOpen360(primaryItem.id)}
                  className={`p-5 rounded-3xl bg-slate-900 border hover:border-blue-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between relative ${isAllSelected
                      ? 'border-blue-500 bg-blue-950/20 shadow-blue-500/10 ring-1 ring-blue-500'
                      : 'border-slate-800'
                    }`}
                >
                  {/* Selection Checkbox */}
                  <div
                    className="absolute top-4 right-4 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={() => handleToggleSelectGroup(grp)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title={`Select all ${grp.items.length} units of ${grp.deviceName}`}
                    />
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-3 pr-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:scale-105 transition flex-shrink-0">
                        <Package size={22} />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {grp.inStockCount > 0 && (
                          <Badge variant="success" className="text-[10px] font-bold">
                            {grp.inStockCount} In Stock
                          </Badge>
                        )}
                        {grp.installedCount > 0 && (
                          <Badge variant="default" className="text-[10px] font-bold bg-cyan-600/30 text-cyan-300 border-cyan-500/40">
                            {grp.installedCount} Installed at Site
                          </Badge>
                        )}
                        {grp.fieldKitCount > 0 && (
                          <Badge variant="default" className="text-[10px] font-bold bg-blue-600/30 text-blue-300 border-blue-500/40">
                            {grp.fieldKitCount} In Field Kit
                          </Badge>
                        )}
                        {grp.mustReturnCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] font-bold bg-rose-600/30 text-rose-300 border-rose-500/40">
                            {grp.mustReturnCount} Must Return
                          </Badge>
                        )}
                        {grp.maintenanceCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {grp.maintenanceCount} Maint.
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5">
                      <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition truncate">
                        {grp.deviceName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        {grp.modelNumber ? `Model: ${grp.modelNumber}` : grp.category || 'Hardware'}
                      </p>

                      {/* Serial Barcodes Chips (Clickable) */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                          <span>Scanned Serials ({grp.items.length})</span>
                          {grp.location && (
                            <span className="text-slate-400 truncate max-w-[140px] flex items-center gap-1">
                              <MapPin size={10} className="text-amber-400" />
                              <span>{grp.location}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar p-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                          {grp.items.map((it) => {
                            const isItInstalled = it.isInstalledAtSite === true || (it.location && it.location.toLowerCase().includes('installed')) || it.assignedClientId != null;
                            const isItMustReturn = it.condition === 'DAMAGED' || it.condition === 'DEFECTIVE' || it.condition === 'NEEDS_REPAIR' || it.status === 'UNDER_MAINTENANCE' || it.retrievedAt !== null || (it.location && it.location.toLowerCase().includes('must return'));

                            return (
                              <button
                                key={it.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpen360(it.id);
                                }}
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 transition ${
                                  isItMustReturn
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                    : isItInstalled
                                    ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                    : it.status === 'IN_STOCK'
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }`}
                                title={`Serial: ${it.barcode} (${isItInstalled ? 'Installed at Site' : isItMustReturn ? 'Must Return / Defective' : it.status}) - Click for 360° Dossier`}
                              >
                                <span>{it.barcode}</span>
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isItMustReturn
                                      ? 'bg-rose-400'
                                      : isItInstalled
                                      ? 'bg-cyan-400'
                                      : it.status === 'IN_STOCK'
                                      ? 'bg-emerald-400'
                                      : 'bg-blue-400'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Total Stock Units:</span>
                        <span className="font-mono font-bold text-white text-sm">
                          {grp.totalUnits} {grp.totalUnits === 1 ? 'Unit' : 'Units'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Status Distribution:</span>
                        <span className="text-slate-300 font-medium truncate max-w-[200px]">
                          {grp.inStockCount > 0 ? `${grp.inStockCount} In Stock` : ''}
                          {grp.installedCount > 0 ? `${grp.inStockCount > 0 ? ' • ' : ''}${grp.installedCount} Installed at Site` : ''}
                          {grp.fieldKitCount > 0 ? `${grp.inStockCount > 0 || grp.installedCount > 0 ? ' • ' : ''}${grp.fieldKitCount} in Field Kit` : ''}
                          {grp.mustReturnCount > 0 ? `${grp.inStockCount > 0 || grp.installedCount > 0 || grp.fieldKitCount > 0 ? ' • ' : ''}${grp.mustReturnCount} Must Return` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-[130px]">
                        {grp.supplier || 'Main Store'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleOpenPrint(primaryItem, e)}
                        className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 transition"
                        title="Print Barcode Labels"
                      >
                        <Printer size={13} />
                      </button>

                      <button
                        onClick={(e) =>
                          handleOpenDispatch(
                            primaryItem,
                            primaryItem.status === 'ASSIGNED' ? 'CHECK_IN' : 'CHECK_OUT',
                            e
                          )
                        }
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition"
                        title="Dispatch Equipment"
                      >
                        <ArrowRightLeft size={13} />
                      </button>

                      <span className="text-xs text-blue-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                        <span>Manage</span>
                        <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
            : items.map((i) => {
              const isInstalled = (i.isInstalledAtSite === true || (i.location && i.location.toLowerCase().includes('installed')) || i.assignedClientId != null) && !i.retrievedAt;
              const isMustReturn = i.condition === 'DAMAGED' || i.condition === 'DEFECTIVE' || i.condition === 'NEEDS_REPAIR' || i.status === 'UNDER_MAINTENANCE' || i.retrievedAt !== null || (i.location && i.location.toLowerCase().includes('must return'));
              const isInFieldKit = i.status === 'ASSIGNED' && !isInstalled && !isMustReturn;

              const conditionBadge =
                i.condition === 'NEW'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : i.condition === 'DAMAGED' || i.condition === 'DEFECTIVE' || i.condition === 'NEEDS_REPAIR'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

              const custodian = isInstalled
                ? `Client Site: ${i.assignedClient?.companyName || i.assignedClient?.name || (i.tickets?.[0]?.ticket ? `Ticket #${i.tickets[0].ticket.ticketNumber}` : 'Installed at Site')}`
                : isMustReturn
                ? `Return Required ${i.damageNotes ? `(${i.damageNotes})` : ''}`
                : i.assignedUser
                ? `Tech: ${i.assignedUser.firstName} ${i.assignedUser.lastName}`
                : i.assignedGroup
                ? `Group: ${i.assignedGroup.name}`
                : i.assignedVehicle
                ? `Van: ${i.assignedVehicle.registrationNo}`
                : 'In Central Stock';

              const isSelected = selectedItemIds.includes(i.id);
              return (
                <div
                  key={i.id}
                  onClick={() => handleOpen360(i.id)}
                  className={`p-5 rounded-3xl bg-slate-900 border hover:border-blue-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between relative ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/20 shadow-blue-500/10 ring-1 ring-blue-500'
                      : isMustReturn
                      ? 'border-rose-500/30 bg-rose-950/5'
                      : isInstalled
                      ? 'border-cyan-500/30 bg-cyan-950/5'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div
                    className="absolute top-4 right-4 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectItem(i.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Select item for bulk actions"
                    />
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-3 pr-6">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:scale-105 transition flex-shrink-0 ${
                        isMustReturn
                          ? 'bg-rose-600/20 text-rose-400 border-rose-500/30'
                          : isInstalled
                          ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30'
                          : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                      }`}>
                        <Package size={22} />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isInstalled ? (
                          <Badge variant="default" className="text-[9px] bg-cyan-600/30 text-cyan-300 border-cyan-500/40">
                            🟢 INSTALLED AT SITE
                          </Badge>
                        ) : isMustReturn ? (
                          <Badge variant="destructive" className="text-[9px] bg-rose-600/30 text-rose-300 border-rose-500/40">
                            🔴 MUST RETURN
                          </Badge>
                        ) : isInFieldKit ? (
                          <Badge variant="default" className="text-[9px] bg-blue-600/30 text-blue-300 border-blue-500/40">
                            🔵 IN FIELD KIT
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[9px]">
                            📦 IN STOCK
                          </Badge>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${conditionBadge}`}>
                          {i.condition}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5">
                      <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition truncate">
                        {i.deviceName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        {i.modelNumber ? `Model: ${i.modelNumber}` : i.category || 'Hardware'}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                          {i.barcode}
                        </span>
                        {i.location && (
                          <span className={`text-[11px] font-medium truncate flex items-center gap-1 ${
                            isInstalled ? 'text-cyan-300' : isMustReturn ? 'text-rose-300' : 'text-amber-300'
                          }`}>
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{i.location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Stock Units:</span>
                        <span className="font-mono font-bold text-white">
                          {i.stockAmount || 1} {i.stockAmount === 1 ? 'Unit' : 'Units'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Custodian / Site:</span>
                        <span className="text-slate-300 font-medium truncate max-w-[170px]">
                          {custodian}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-[130px]">
                        {i.location ? `Loc: ${i.location}` : 'Central Store'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isInstalled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRetrieveItem(i);
                            setRetrieveModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1"
                          title="Retrieve faulty product from field and replace"
                        >
                          <RotateCcw size={12} />
                          <span>Retrieve</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleOpenPrint(i, e)}
                        className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 transition"
                        title="Print Barcode Sticker"
                      >
                        <Printer size={13} />
                      </button>

                      <button
                        onClick={(e) =>
                          handleOpenDispatch(
                            i,
                            i.status === 'ASSIGNED' ? 'CHECK_IN' : 'CHECK_OUT',
                            e
                          )
                        }
                        className={`p-1.5 rounded-lg border transition ${
                          i.status === 'ASSIGNED'
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                        }`}
                        title={i.status === 'ASSIGNED' ? 'Check-In Asset' : 'Dispatch Asset'}
                      >
                        <ArrowRightLeft size={13} />
                      </button>

                      <span className="text-xs text-blue-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                        <span>360°</span>
                        <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        /* CORPORATE TABLE VIEW */
        <DataTable
          headers={[
            '',
            'Device & Model',
            'Barcode(s) / Serial',
            'Condition',
            'Location & Buy Date',
            'Stock Units',
            'Custodian / Deployment',
            'Status',
            'Actions',
          ]}
        >
          {displayMode === 'PRODUCT_GROUPED'
            ? groupedProducts.map((grp) => {
              const isAllSelected =
                grp.items.length > 0 && grp.items.every((it) => selectedItemIds.includes(it.id));
              const primaryItem = grp.items[0];

              return (
                <tr
                  key={grp.groupKey}
                  onClick={() => handleOpen360(primaryItem.id)}
                  className={`hover:bg-slate-800/40 transition cursor-pointer ${isAllSelected ? 'bg-blue-950/30 border-l-4 border-blue-500' : ''
                    }`}
                >
                  {/* Row Checkbox */}
                  <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={() => handleToggleSelectGroup(grp)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Device & Model */}
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                        <Package size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-white truncate max-w-xs">{grp.deviceName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {grp.modelNumber ? `Model: ${grp.modelNumber}` : grp.category || 'Hardware'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Barcode / Serials */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-xs max-h-16 overflow-y-auto custom-scrollbar">
                      {grp.items.map((it) => (
                        <span
                          key={it.id}
                          className="font-mono text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20"
                        >
                          {it.barcode}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Condition */}
                  <td className="p-4 text-xs">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/20 text-emerald-400">
                      {grp.condition}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="p-4 text-xs">
                    <p className="text-white font-medium">{grp.location || 'HQ Main Warehouse'}</p>
                    <p className="text-slate-400 text-[11px]">{grp.supplier || 'Company Stock'}</p>
                  </td>

                  {/* Stock Units */}
                  <td className="p-4 text-xs font-mono">
                    <p className="text-white font-bold">{grp.totalUnits} units</p>
                    <p className="text-slate-400 text-[11px]">
                      {grp.inStockCount > 0 ? `${grp.inStockCount} In Stock • ` : ''}
                      {grp.installedCount > 0 ? `${grp.installedCount} Installed • ` : ''}
                      {grp.fieldKitCount > 0 ? `${grp.fieldKitCount} Field • ` : ''}
                      {grp.mustReturnCount > 0 ? `${grp.mustReturnCount} Return` : ''}
                    </p>
                  </td>

                  {/* Custodian / Deployment */}
                  <td className="p-4 text-xs text-slate-300">
                    <span>
                      {grp.installedCount > 0
                        ? `${grp.installedCount} Installed on Site`
                        : grp.fieldKitCount > 0
                        ? `${grp.fieldKitCount} in Field Kit`
                        : grp.mustReturnCount > 0
                        ? `${grp.mustReturnCount} Must Return`
                        : 'In Warehouse Stock'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <StatusBadge
                      status={grp.inStockCount > 0 ? 'ACTIVE' : grp.installedCount > 0 ? 'ACTIVE' : 'PENDING'}
                      label={
                        grp.installedCount > 0
                          ? 'INSTALLED AT SITE'
                          : grp.inStockCount > 0
                          ? `${grp.inStockCount} IN STOCK`
                          : grp.mustReturnCount > 0
                          ? 'MUST RETURN'
                          : 'IN FIELD KIT'
                      }
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpen360(primaryItem.id);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition border border-blue-500/30"
                      >
                        Manage ({grp.totalUnits})
                      </button>
                      <button
                        onClick={(e) => handleOpenPrint(primaryItem, e)}
                        className="p-1 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 text-xs font-semibold transition border border-indigo-500/20"
                        title="Print Tag"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
            : items.map((i) => {
              const isSelected = selectedItemIds.includes(i.id);
              const isInstalled = (i.isInstalledAtSite === true || (i.location && i.location.toLowerCase().includes('installed')) || i.assignedClientId != null) && !i.retrievedAt;
              const isMustReturn = i.condition === 'DAMAGED' || i.condition === 'DEFECTIVE' || i.condition === 'NEEDS_REPAIR' || i.status === 'UNDER_MAINTENANCE' || i.retrievedAt !== null || (i.location && i.location.toLowerCase().includes('must return'));
              const isInFieldKit = i.status === 'ASSIGNED' && !isInstalled && !isMustReturn;

              const conditionBadge =
                i.condition === 'NEW'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isMustReturn
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-blue-500/20 text-blue-400';

              const custodian = isInstalled
                ? `Client Site: ${i.assignedClient?.companyName || i.assignedClient?.name || (i.tickets?.[0]?.ticket ? `Ticket #${i.tickets[0].ticket.ticketNumber}` : 'Installed at Site')}`
                : isMustReturn
                ? `Return Required ${i.damageNotes ? `(${i.damageNotes})` : ''}`
                : i.assignedUser
                ? `Tech: ${i.assignedUser.firstName} ${i.assignedUser.lastName}`
                : i.assignedGroup
                ? `Group: ${i.assignedGroup.name}`
                : i.assignedVehicle
                ? `Van: ${i.assignedVehicle.registrationNo}`
                : 'In Warehouse Stock';

              return (
                <tr
                  key={i.id}
                  onClick={() => handleOpen360(i.id)}
                  className={`hover:bg-slate-800/40 transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/30 border-l-4 border-blue-500'
                      : isMustReturn
                      ? 'bg-rose-950/10'
                      : isInstalled
                      ? 'bg-cyan-950/10'
                      : ''
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectItem(i.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Device & Model */}
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs ${
                        isMustReturn
                          ? 'bg-rose-600/20 text-rose-400'
                          : isInstalled
                          ? 'bg-cyan-600/20 text-cyan-400'
                          : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        <Package size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-white truncate max-w-xs">{i.deviceName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {i.modelNumber || i.category || 'Hardware'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Barcode / Serial */}
                  <td className="p-4 text-xs font-mono font-bold text-blue-400">{i.barcode}</td>

                  {/* Condition */}
                  <td className="p-4 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${conditionBadge}`}>
                      {i.condition}
                    </span>
                  </td>

                  {/* Location & Buy Date */}
                  <td className="p-4 text-xs">
                    <p className="text-white font-medium">{i.location || 'HQ Main Warehouse'}</p>
                    <p className="text-slate-400 text-[11px]">{i.buyDate ? formatDate(i.buyDate) : 'N/A'}</p>
                  </td>

                  {/* Stock Units */}
                  <td className="p-4 text-xs font-mono">
                    <p className="text-white font-bold">{i.stockAmount || 1} units</p>
                    <p className="text-slate-400 text-[11px]">
                      {isInstalled ? 'Installed at Site' : isMustReturn ? 'Pending Return' : isInFieldKit ? 'In Field Kit' : 'Warehouse Ready'}
                    </p>
                  </td>

                  {/* Custodian */}
                  <td className="p-4 text-xs text-slate-300">
                    <span className="truncate max-w-xs block">{custodian}</span>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <StatusBadge
                      status={
                        isInstalled
                          ? 'ACTIVE'
                          : isMustReturn
                          ? 'REJECTED'
                          : i.status === 'IN_STOCK'
                          ? 'ACTIVE'
                          : 'PENDING'
                      }
                      label={
                        isInstalled
                          ? 'INSTALLED AT SITE'
                          : isMustReturn
                          ? 'MUST RETURN'
                          : isInFieldKit
                          ? 'IN FIELD KIT'
                          : 'IN STOCK'
                      }
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {isInstalled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRetrieveItem(i);
                            setRetrieveModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition"
                          title="Retrieve faulty product from field and replace"
                        >
                          <RotateCcw size={12} />
                          <span>Retrieve</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpen360(i.id);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition border border-blue-500/30"
                      >
                        360°
                      </button>

                      <button
                        onClick={(e) => handleOpenPrint(i, e)}
                        className="p-1 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 text-xs font-semibold transition border border-indigo-500/20"
                        title="Print Tag"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
        </DataTable>
      )}

      {/* 360° Asset Dossier Drawer */}
      <InventoryItemDrawer
        itemId={selectedItemId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={() => {
          fetchInventory();
          fetchStats();
        }}
        users={users}
        clients={clients}
        vehicles={vehicles}
        groups={groups}
      />

      {/* Barcode Label Printer Modal */}
      <BarcodeLabelPrinterModal
        isOpen={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false);
          setItemToPrint(null);
        }}
        item={itemToPrint}
      />

      {/* Universal Smart Barcode Scanner Modal (Camera, Upload Photo, Gun) */}
      <SmartBarcodeScannerModal
        isOpen={smartScannerOpen}
        onClose={() => setSmartScannerOpen(false)}
        onDetected={handleSmartScan}
      />

      {/* Custody Dispatch / Check-In Modal */}
      <CustodyDispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => {
          setDispatchModalOpen(false);
          setDispatchItem(null);
        }}
        onSuccess={() => {
          fetchInventory();
          fetchStats();
        }}
        item={dispatchItem}
        mode={dispatchMode}
        users={users}
        clients={clients}
        vehicles={vehicles}
        groups={groups}
      />

      {/* Manual Allocation Modal */}
      <ManualAllocationModal
        isOpen={manualAllocOpen}
        onClose={() => {
          setManualAllocOpen(false);
          setAllocTargetItem(null);
        }}
        onSuccess={() => {
          fetchInventory();
          fetchStats();
        }}
        preselectedItem={allocTargetItem}
        items={items}
        users={users}
        clients={clients}
        vehicles={vehicles}
      />

      {/* Create / Register Device Modal */}
      <InventoryModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setScannedInitialBarcode('');
        }}
        onSuccess={() => {
          fetchInventory();
          fetchStats();
        }}
        item={editingItem}
        initialBarcode={scannedInitialBarcode}
      />

      {/* Multi-Serial Product Lookup & Batch Dossier Modal */}
      <BatchProductLookupModal
        isOpen={batchLookupOpen}
        onClose={() => setBatchLookupOpen(false)}
        onOpen360={(itemId) => handleOpen360(itemId)}
        onFilterMainInventory={(barcodes) => {
          setSearch(barcodes.join(' '));
        }}
        onSelectForDispatch={(items) => {
          setDispatchItem(null);
          setDispatchMode('CHECK_OUT');
          setDispatchModalOpen(true);
        }}
      />

      {/* Multi-Serial Batch Product Return / Check-In Modal */}
      <BatchReturnModal
        isOpen={batchReturnModalOpen}
        onClose={() => setBatchReturnModalOpen(false)}
        onSuccess={() => {
          fetchInventory();
          fetchStats();
        }}
      />

      {/* Inventory Audit Document & Movement Reports Modal (Daily, Weekly, Monthly) */}
      <InventoryAuditDocumentModal
        isOpen={auditDocModalOpen}
        onClose={() => setAuditDocModalOpen(false)}
      />

      {/* Floating Bulk Action Bar */}
      {selectedItemIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-200 max-w-2xl w-[92%] sm:w-auto justify-between flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="info" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30 px-2.5 py-1 font-bold flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              <span>{selectedItemIds.length} Selected</span>
            </Badge>
            <span className="text-xs text-slate-400 hidden sm:inline">
              of {items.length} total
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasPermission('inventory', 'delete') && (
              <Button
                onClick={() => setBulkDeleteModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-1.5 px-3.5 py-1.5 rounded-xl shadow-lg shadow-rose-600/20 h-auto"
              >
                <Trash2 size={14} />
                <span>Delete Selected ({selectedItemIds.length})</span>
              </Button>
            )}

            {hasPermission('inventory', 'update') && (
              <Button
                onClick={() => {
                  setDispatchItem(null);
                  setDispatchMode('CHECK_OUT');
                  setDispatchModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 px-3.5 py-1.5 rounded-xl shadow-md h-auto hidden sm:flex"
              >
                <PackageCheck size={14} />
                <span>Batch Dispatch</span>
              </Button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/30">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Bulk Delete {selectedItemIds.length} Assets</h3>
                <p className="text-xs text-slate-400">Permanent inventory removal action</p>
              </div>
            </div>

            {hasInstalledOrAssigned && (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Warning:</strong> One or more selected items are currently <strong>ASSIGNED</strong> in the field or deployed at client premises. Deleting them will remove their custody tracking records.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the <strong>{selectedItemIds.length} selected hardware products</strong> from inventory? This action cannot be undone and will delete all associated logs and serial records.
            </p>

            {/* Selected Items preview */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 custom-scrollbar text-xs">
              {selectedItemsList.slice(0, 15).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-slate-300 py-0.5">
                  <span className="font-semibold truncate max-w-[260px]">{item.deviceName}</span>
                  <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {item.barcode}
                  </span>
                </div>
              ))}
              {selectedItemsList.length > 15 && (
                <p className="text-[10px] text-slate-500 italic text-center pt-1">
                  + {selectedItemsList.length - 15} more items selected
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <Button
                onClick={handleExecuteBulkDelete}
                disabled={bulkDeleting}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/20"
              >
                {bulkDeleting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Permanently Delete {selectedItemIds.length} Items</span>
              </Button>
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
          clientId={selectedRetrieveItem.assignedClientId}
          onSuccess={async () => {
            await Promise.all([fetchInventory(), fetchStats()]);
          }}
        />
      )}
    </div>
  );
}
