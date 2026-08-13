'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit,
  Trash2,
  Truck,
  Zap,
  Radio,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';
import { AlertBanner } from '@/components/ui/AlertBanner';

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({
    IN_STOCK: 0,
    ASSIGNED: 0,
    UNDER_MAINTENANCE: 0,
    RETIRED: 0,
  });

  // Filter State
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Physical Barcode Scanner State
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hardwareScanning, setHardwareScanning] = useState(false);

  // Input Field Focus Ref for Hardware Scanner
  const serialInputRef = useRef<HTMLInputElement | null>(null);
  const scannerModalInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isFieldScanReady, setIsFieldScanReady] = useState(false);

  // Form State
  const [form, setForm] = useState({
    deviceName: '',
    modelNumber: '',
    barcode: '',
    category: 'Hardware/Device',
    condition: 'NEW',
    status: 'IN_STOCK',
    buyDate: '',
    stockAmount: '1',
    unitPrice: '',
    supplier: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [search, filterCondition, filterStatus]);

  // Focus scanner modal input automatically when opened and select existing text
  useEffect(() => {
    if (scanModalOpen && scannerModalInputRef.current) {
      scannerModalInputRef.current.focus();
      scannerModalInputRef.current.select();
    }
  }, [scanModalOpen]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let query = `/api/inventory?search=${search}`;
      if (filterCondition !== 'ALL') query += `&condition=${filterCondition}`;
      if (filterStatus !== 'ALL') query += `&status=${filterStatus}`;

      const res = await api.get(query);
      setItems(res.data.data || []);
      if (res.data.statusCounts) {
        setStatusCounts(res.data.statusCounts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      deviceName: '',
      modelNumber: '',
      barcode: '',
      category: 'Hardware/Device',
      condition: 'NEW',
      status: 'IN_STOCK',
      buyDate: '',
      stockAmount: '1',
      unitPrice: '',
      supplier: '',
      notes: '',
    });
    setIsFieldScanReady(false);
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setForm({
      deviceName: item.deviceName || '',
      modelNumber: item.modelNumber || '',
      barcode: item.barcode || '',
      category: item.category || 'Hardware/Device',
      condition: item.condition || 'NEW',
      status: item.status || 'IN_STOCK',
      buyDate: item.buyDate ? new Date(item.buyDate).toISOString().split('T')[0] : '',
      stockAmount: item.stockAmount ? item.stockAmount.toString() : '1',
      unitPrice: item.unitPrice ? item.unitPrice.toString() : '',
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setIsFieldScanReady(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.barcode.trim()) {
      alert('Please enter or scan a barcode/serial code for this device.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/api/inventory/${editingItem.id}`, form);
      } else {
        await api.post('/api/inventory', form);
      }
      setModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save inventory device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device from inventory?')) return;
    try {
      await api.delete(`/api/inventory/${id}`);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete device');
    }
  };

  // Hardware Scanner Lookup Handler
  const handleBarcodeLookup = async (barcodeToSearch: string) => {
    setScanError(null);
    setScannedResult(null);

    const cleanBarcode = barcodeToSearch.trim();
    if (!cleanBarcode) return;

    try {
      setHardwareScanning(true);
      const res = await api.get(`/api/inventory/barcode/${encodeURIComponent(cleanBarcode)}`);
      setScannedResult(res.data);
    } catch (err: any) {
      setScanError('No device found matching scanned barcode: ' + cleanBarcode);
    } finally {
      setHardwareScanning(false);
      // Auto-select text in modal input so the NEXT scan gun trigger pull completely overwrites instead of appending!
      if (scannerModalInputRef.current) {
        scannerModalInputRef.current.select();
      }
    }
  };

  // Trigger Hardware Scanner ready mode on serial input field
  const activateSerialScanner = () => {
    setIsFieldScanReady(true);
    if (serialInputRef.current) {
      serialInputRef.current.focus();
      serialInputRef.current.select();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        subtitle="Hardware device catalog, serial barcode scanning, condition, buy dates, stock amounts, and suppliers."
        icon={<Package className="text-blue-400" size={28} />}
        action={
          <div className="flex items-center space-x-3">
            {/* Physical Hardware Scanner Gun Button */}
            <button
              onClick={() => {
                setScanModalOpen(true);
                setScannedBarcode('');
                setScannedResult(null);
                setScanError(null);
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-blue-500/40 hover:border-blue-400 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/10"
            >
              <Barcode size={18} className="text-blue-400 animate-pulse" />
              <span>Hardware Barcode Scanner</span>
            </button>

            {hasPermission('inventory', 'create') && (
              <button
                onClick={openAddModal}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/25"
              >
                <Plus size={16} />
                <span>Add Device</span>
              </button>
            )}
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">In Stock Devices</p>
          <p className="text-xl font-extrabold font-mono text-emerald-400 mt-1">{statusCounts.IN_STOCK}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Devices</p>
          <p className="text-xl font-extrabold font-mono text-blue-400 mt-1">{statusCounts.ASSIGNED}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Under Maintenance</p>
          <p className="text-xl font-extrabold font-mono text-amber-400 mt-1">{statusCounts.UNDER_MAINTENANCE}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Retired</p>
          <p className="text-xl font-extrabold font-mono text-slate-400 mt-1">{statusCounts.RETIRED}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Search or scan barcode label with handheld scanner..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          >
            <option value="ALL">All Conditions</option>
            <option value="NEW">New</option>
            <option value="EXCELLENT">Excellent</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="DAMAGED">Damaged</option>
            <option value="DEFECTIVE">Defective</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>
      </div>

      {/* Device List Table */}
      {loading ? (
        <div className="text-xs text-slate-400">Loading device inventory...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4">Device & Model</th>
                <th className="p-4">Barcode / Serial</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Buy Date & Supplier</th>
                <th className="p-4">Stock & Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No inventory devices found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const conditionBadge =
                    item.condition === 'NEW'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : item.condition === 'DAMAGED' || item.condition === 'DEFECTIVE'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-blue-500/20 text-blue-400';

                  const statusBadge =
                    item.status === 'IN_STOCK'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : item.status === 'ASSIGNED'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : item.status === 'UNDER_MAINTENANCE'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <p className="font-bold text-white text-sm">{item.deviceName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {item.modelNumber || 'No Model #'} • <span className="text-slate-500">{item.category}</span>
                        </p>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 inline-flex items-center space-x-1">
                          <Barcode size={12} />
                          <span>{item.barcode}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${conditionBadge}`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        <p>{item.buyDate ? formatDate(item.buyDate) : 'N/A'}</p>
                        {item.supplier && (
                          <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Truck size={10} />
                            <span>{item.supplier}</span>
                          </p>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        <p className="text-white font-bold">{item.stockAmount} Units</p>
                        {item.unitPrice && <p className="text-[11px] text-emerald-400">{formatCurrency(item.unitPrice)}</p>}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${statusBadge}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {hasPermission('inventory', 'update') && (
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                              title="Edit Device"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {hasPermission('inventory', 'delete') && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                              title="Delete Device"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Device Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Package size={20} className="text-blue-400" />
                <span>{editingItem ? 'Edit Inventory Device' : 'Add New Inventory Device'}</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Device Name
                  </label>
                  <input
                    type="text"
                    value={form.deviceName}
                    onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
                    placeholder="e.g. 4K Dome CCTV Camera"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={form.modelNumber}
                    onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
                    placeholder="e.g. Hikvision DS-2CD2143G0"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Barcode / Serial Code with Hardware Scanner Mode Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">
                    Barcode / Serial Code
                  </label>

                  {/* Hardware Scanner Trigger Button */}
                  <button
                    type="button"
                    onClick={activateSerialScanner}
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1.5 transition ${
                      isFieldScanReady
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                    }`}
                  >
                    <Barcode size={14} />
                    <span>{isFieldScanReady ? 'Scanner Ready — Scan Now' : 'Scan Serial with Device'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    ref={serialInputRef}
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    onFocus={(e) => {
                      setIsFieldScanReady(true);
                      e.target.select();
                    }}
                    onBlur={() => setIsFieldScanReady(false)}
                    placeholder="Scan device serial barcode label with handheld scanner..."
                    className={`w-full p-3 bg-slate-950 border rounded-xl text-xs text-white font-mono transition ${
                      isFieldScanReady ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-800'
                    }`}
                    required
                  />

                  {isFieldScanReady && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                      <Radio size={12} className="animate-pulse text-emerald-400" />
                      <span>Ready for Scanner Gun</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Pull the trigger on your physical barcode scanner gun to scan serial label. Each scan overwrites previous.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="CCTV Camera">CCTV Camera</option>
                    <option value="NVR/DVR Recorder">NVR/DVR Recorder</option>
                    <option value="Network Switch/Router">Network Switch/Router</option>
                    <option value="Biometric Machine">Biometric Machine</option>
                    <option value="Cabling/Accessories">Cabling/Accessories</option>
                    <option value="Hardware/Device">Hardware/Device</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Condition
                  </label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="NEW">New</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="DEFECTIVE">Defective</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="IN_STOCK">In Stock</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Buy Date
                  </label>
                  <input
                    type="date"
                    value={form.buyDate}
                    onChange={(e) => setForm({ ...form, buyDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Stock Amount
                  </label>
                  <input
                    type="number"
                    value={form.stockAmount}
                    onChange={(e) => setForm({ ...form, stockAmount: e.target.value })}
                    min={1}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    placeholder="e.g. 4500"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Supplier Name / Vendor
                </label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="e.g. CP Plus National Distributor"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Notes / Technical Specs
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional specs or warranty info..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Device' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hardware Barcode Scanner Gun Mode Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Barcode size={22} className="text-blue-400 animate-pulse" />
                <span>Hardware Barcode Scanner</span>
              </h2>
              <button
                onClick={() => setScanModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Hardware Scanner Mode Visual Indicator */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-blue-500/40 text-center space-y-3 shadow-inner">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                <Zap size={32} className="animate-pulse text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Scanner Gun Ready</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pull the trigger on your handheld scanner. Each new scan replaces previous.
                </p>
              </div>
            </div>

            {/* Hardware Scanner Dedicated Input (Fires lookup on scan/Enter) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBarcodeLookup(scannedBarcode);
              }}
              className="space-y-3"
            >
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">
                Scanned Barcode Buffer
              </label>
              <div className="flex space-x-2">
                <input
                  ref={scannerModalInputRef}
                  type="text"
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Scanner gun will type barcode here..."
                  className="flex-1 p-3 bg-slate-950 border border-blue-500/40 rounded-xl text-sm text-white font-mono ring-2 ring-blue-500/20"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition"
                >
                  Lookup
                </button>
              </div>
            </form>

            {/* Scan Error */}
            <AlertBanner message={scanError} />

            {/* Scanned Device Result Preview */}
            {scannedResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{scannedResult.deviceName}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                    {scannedResult.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">Model: {scannedResult.modelNumber || 'N/A'}</p>
                <p className="text-[11px] text-slate-300">Condition: {scannedResult.condition}</p>
                <p className="text-[11px] text-slate-400">Supplier: {scannedResult.supplier || 'N/A'}</p>

                <button
                  type="button"
                  onClick={() => {
                    setScanModalOpen(false);
                    openEditModal(scannedResult);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition"
                >
                  Edit Scanned Device Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
