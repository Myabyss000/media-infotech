'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Package,
  Barcode,
  Sparkles,
  Calendar,
  DollarSign,
  Building,
  MapPin,
  Tag,
  ArrowLeft,
  Layers,
  Search,
  CheckCircle2,
  Camera,
  ListPlus,
  Trash2,
  ClipboardPaste,
  AlertCircle,
  Plus,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartBarcodeScannerModal } from './SmartBarcodeScannerModal';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: any | null;
  initialBarcode?: string;
}

type RegistrationMode = 'single' | 'multi-serial' | 'auto-bulk';

export function InventoryModal({ isOpen, onClose, onSuccess, item, initialBarcode }: InventoryModalProps) {
  const isEditing = Boolean(item?.id);

  const [presets, setPresets] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [presetSearch, setPresetSearch] = useState('');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  // Scanner modal state
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'single' | 'continuous'>('single');

  // Registration mode state
  const [regMode, setRegMode] = useState<RegistrationMode>('single');
  const [autoBulkCount, setAutoBulkCount] = useState('5');

  // Multi-serial scanned queue
  const [scannedSerials, setScannedSerials] = useState<string[]>([]);
  const [rapidSerialInput, setRapidSerialInput] = useState('');
  const [rapidSerialError, setRapidSerialError] = useState<string | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const rapidInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    deviceName: '',
    modelNumber: '',
    barcode: '',
    category: 'Hardware/Device',
    condition: 'NEW',
    status: 'IN_STOCK',
    buyDate: '',
    warrantyExpiry: '',
    invoiceNo: '',
    location: 'HQ Central Store, Rack A-1',
    stockAmount: '1',
    unitPrice: '',
    supplier: 'Media Infotech Master Stock',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await api.get('/api/inventory/presets');
      setPresets(res.data?.data || []);
    } catch (e) {
      console.error('Failed to load presets', e);
    }
  };

  useEffect(() => {
    if (item) {
      setForm({
        deviceName: item.deviceName || '',
        modelNumber: item.modelNumber || '',
        barcode: item.barcode || '',
        category: item.category || 'Hardware/Device',
        condition: item.condition || 'NEW',
        status: item.status || 'IN_STOCK',
        buyDate: item.buyDate ? new Date(item.buyDate).toISOString().split('T')[0] : '',
        warrantyExpiry: item.warrantyExpiry ? new Date(item.warrantyExpiry).toISOString().split('T')[0] : '',
        invoiceNo: item.invoiceNo || '',
        location: item.location || 'HQ Central Store, Rack A-1',
        stockAmount: item.stockAmount ? item.stockAmount.toString() : '1',
        unitPrice: item.unitPrice ? item.unitPrice.toString() : '',
        supplier: item.supplier || 'Media Infotech Master Stock',
        notes: item.notes || '',
      });
      setRegMode('single');
      setScannedSerials([]);
    } else {
      setForm({
        deviceName: '',
        modelNumber: '',
        barcode: initialBarcode || '',
        category: 'Hardware/Device',
        condition: 'NEW',
        status: 'IN_STOCK',
        buyDate: new Date().toISOString().split('T')[0],
        warrantyExpiry: '',
        invoiceNo: '',
        location: 'HQ Central Store, Rack A-1',
        stockAmount: '1',
        unitPrice: '',
        supplier: 'Media Infotech Master Stock',
        notes: '',
      });
      setRegMode('single');
      setScannedSerials([]);
    }
    setShowPresetDropdown(false);
    setSubmitError(null);
    setRapidSerialError(null);
  }, [item, initialBarcode, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !scannerModalOpen && !pasteModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, scannerModalOpen, pasteModalOpen, onClose]);

  const playBeep = (isError = false) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (isError) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (_) {}
  };

  const handleSelectPreset = (preset: any) => {
    const cleanNamePart = preset.deviceName
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    const randomCode = `MIT-${cleanNamePart}-${Math.floor(100 + Math.random() * 900)}`;

    setForm({
      ...form,
      deviceName: preset.deviceName,
      category: preset.category || 'Hardware/Device',
      condition: preset.defaultCondition || 'NEW',
      unitPrice: preset.unitPrice ? preset.unitPrice.toString() : form.unitPrice,
      barcode: randomCode,
    });
    setSelectedPreset(preset.deviceName);
    setShowPresetDropdown(false);
  };

  const handleGenerateBarcode = () => {
    const clean = form.deviceName
      ? form.deviceName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()
      : 'DEV';
    const randomCode = `MIT-${clean}-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
    setForm({ ...form, barcode: randomCode });
  };

  // Add a serial barcode to the multi-serial queue
  const handleAddRapidSerial = (codeToAdd?: string) => {
    const targetCode = (codeToAdd || rapidSerialInput).trim().toUpperCase();
    if (!targetCode) return;

    if (scannedSerials.includes(targetCode)) {
      playBeep(true);
      setRapidSerialError(`Duplicate serial: "${targetCode}" is already in this batch queue!`);
      setTimeout(() => setRapidSerialError(null), 3000);
      setRapidSerialInput('');
      return;
    }

    playBeep(false);
    setScannedSerials((prev) => [...prev, targetCode]);
    setRapidSerialInput('');
    setRapidSerialError(null);

    // Keep rapid input focused
    setTimeout(() => {
      rapidInputRef.current?.focus();
    }, 50);
  };

  // Remove a single serial from the queue
  const handleRemoveSerial = (indexToRemove: number) => {
    setScannedSerials((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Parse and append pasted serial numbers (from invoice / Excel)
  const handleApplyPasteSerials = () => {
    if (!pasteRawText.trim()) return;

    // Split by newlines, commas, tabs, semicolons
    const tokens = pasteRawText
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    const newSerials: string[] = [];
    let dupCount = 0;

    for (const token of tokens) {
      if (scannedSerials.includes(token) || newSerials.includes(token)) {
        dupCount++;
      } else {
        newSerials.push(token);
      }
    }

    if (newSerials.length > 0) {
      playBeep(false);
      setScannedSerials((prev) => [...prev, ...newSerials]);
    }

    setPasteModalOpen(false);
    setPasteRawText('');

    if (dupCount > 0) {
      setRapidSerialError(`Added ${newSerials.length} serials (${dupCount} duplicates skipped).`);
      setTimeout(() => setRapidSerialError(null), 4000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.deviceName.trim()) {
      alert('Device Name is required.');
      return;
    }

    try {
      setSubmitting(true);

      if (isEditing) {
        // Edit single existing asset
        await api.put(`/api/inventory/${item.id}`, form);
        alert('Hardware asset updated successfully!');
      } else if (regMode === 'multi-serial') {
        // Multi-Serial Continuous Registration
        if (scannedSerials.length === 0) {
          alert('Please scan or enter at least one serial barcode for this device.');
          setSubmitting(false);
          return;
        }

        const res = await api.post('/api/inventory/batch-serials', {
          deviceData: form,
          barcodes: scannedSerials,
        });

        alert(`Successfully registered ${res.data?.count || scannedSerials.length} units of "${form.deviceName}" with physical serial barcodes!`);
      } else if (regMode === 'auto-bulk') {
        // Auto-Generated Synthetic Bulk
        const totalToCreate = parseInt(autoBulkCount, 10) || 1;
        const bulkItems = [];
        const baseName = form.deviceName;
        const clean = baseName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();

        for (let i = 1; i <= totalToCreate; i++) {
          const barcode = `MIT-${clean}-${Date.now().toString().slice(-4)}-${String(i).padStart(3, '0')}`;
          bulkItems.push({
            ...form,
            barcode,
            stockAmount: 1,
            notes: form.notes ? `${form.notes} (Batch Unit #${i})` : `Batch Unit #${i}`,
          });
        }

        await api.post('/api/inventory/bulk', { items: bulkItems });
        alert(`Successfully registered ${totalToCreate} units of "${form.deviceName}" with generated barcodes!`);
      } else {
        // Single unit registration
        await api.post('/api/inventory', form);
        alert('New device added to inventory successfully!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save inventory error:', err);
      const errMsg = err.response?.data?.error || 'Failed to save inventory item';
      setSubmitError(errMsg);
      alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredPresets = presets.filter(
    (p) =>
      p.deviceName.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(presetSearch.toLowerCase())
  );

  const unitPriceNum = parseFloat(form.unitPrice) || 0;
  const batchTotalCount = regMode === 'multi-serial' ? scannedSerials.length : regMode === 'auto-bulk' ? parseInt(autoBulkCount, 10) || 1 : 1;
  const totalBatchValuation = unitPriceNum * batchTotalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Return</span>
            </button>
            <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isEditing ? 'Edit Hardware Asset' : 'Register Hardware Equipment'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEditing
                  ? `Update specifications and valuation for ${item.deviceName}`
                  : 'Add telecom, CCTV, fiber & networking hardware with single or rapid multi-barcode tracking.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="inventory-form"
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar"
        >
          {/* Submission Error Banner */}
          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-3 animate-in fade-in">
              <AlertCircle size={20} className="text-rose-400 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-rose-300">Registration Error</p>
                <p className="text-[11px] text-rose-200/90">{submitError}</p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-rose-400 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Quick Preset Selector */}
          {!isEditing && presets.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-950/60 border border-blue-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Quick Company Preset Catalog (60 standard items)</span>
                </span>
                <span className="text-[11px] text-slate-400">Click to autofill</span>
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={presetSearch}
                      onChange={(e) => {
                        setPresetSearch(e.target.value);
                        setShowPresetDropdown(true);
                      }}
                      onFocus={() => setShowPresetDropdown(true)}
                      placeholder="Search preset: Dahua, Digisol, Splitter, Fiber, POE, HDMI..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                  >
                    <Layers size={14} />
                    <span>Browse All ({presets.length})</span>
                  </button>
                </div>

                {/* Dropdown list */}
                {showPresetDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredPresets.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">No matching presets found.</div>
                    ) : (
                      filteredPresets.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPreset(p)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-blue-600/20 hover:text-white transition flex items-center justify-between text-xs text-slate-300 group"
                        >
                          <div>
                            <p className="font-bold text-white group-hover:text-blue-300">{p.deviceName}</p>
                            <p className="text-[10px] text-slate-400">{p.category}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                              Select
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registration Mode Tabs */}
          {!isEditing && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-400" />
                  <span>Registration Mode</span>
                </span>
                <span className="text-[11px] text-slate-400">Choose how serial barcodes are entered</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRegMode('single')}
                  className={`py-2 px-3 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    regMode === 'single'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tag size={14} />
                  <span>Single Unit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegMode('multi-serial');
                    setTimeout(() => rapidInputRef.current?.focus(), 100);
                  }}
                  className={`py-2 px-3 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    regMode === 'multi-serial'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListPlus size={14} />
                  <span>Multi-Serial Scan</span>
                  {scannedSerials.length > 0 && (
                    <Badge variant="info" className="ml-1 text-[10px] px-1.5 py-0 bg-white/20 text-white border-transparent">
                      {scannedSerials.length}
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRegMode('auto-bulk')}
                  className={`py-2 px-3 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    regMode === 'auto-bulk'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Auto-Gen Batch</span>
                </button>
              </div>
            </div>
          )}

          {/* Master Device Specifications Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-blue-400" />
                <span>Device Specifications</span>
              </span>

              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="IN_STOCK">IN STOCK</option>
                  <option value="ASSIGNED">ASSIGNED (In Field)</option>
                  <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Device / Asset Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.deviceName}
                  onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
                  placeholder="e.g. 1X8 CASSCET, Dahua Camera, Digisol ONT..."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Model / Part Number</label>
                <input
                  type="text"
                  value={form.modelNumber}
                  onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
                  placeholder="e.g. DS-2CD2143G2-I"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Hardware/Device">Hardware / Device</option>
                  <option value="Fiber Optic & Splitters">Fiber Optic & Splitters</option>
                  <option value="CCTV/Surveillance">CCTV & Surveillance</option>
                  <option value="Networking/Routers">Networking & Routers</option>
                  <option value="Cables/Wiring">Cables & Accessories</option>
                  <option value="Servers/Computing">Servers & Computing</option>
                  <option value="Power/UPS">Power & UPS Batteries</option>
                  <option value="Field Tools">Field Equipment & Tools</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="NEW">NEW - Fresh Stock</option>
                  <option value="EXCELLENT">EXCELLENT - Mint Condition</option>
                  <option value="GOOD">GOOD - Fully Functional</option>
                  <option value="FAIR">FAIR - Minor Scratches / Wear</option>
                  <option value="DAMAGED">DAMAGED - Needs Repair</option>
                  <option value="DEFECTIVE">DEFECTIVE - Inoperable</option>
                </select>
              </div>
            </div>
          </div>

          {/* MODE 1: SINGLE UNIT BARCODE */}
          {(isEditing || regMode === 'single') && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Serial Number / Scannable Barcode <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <Barcode size={12} />
                  <span>Scanner Gun Ready</span>
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode size={16} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value.toUpperCase() })}
                    placeholder="Scan with handheld gun, camera, or auto-generate..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('single');
                    setScannerModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                  title="Scan using Live Camera, Image Upload, or Gun tester"
                >
                  <Camera size={14} />
                  <span>Scan Code</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                  title="Generate unique serial barcode"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Auto-Gen</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: MULTI-SERIAL RAPID SCANNER QUEUE */}
          {!isEditing && regMode === 'multi-serial' && (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/30 via-slate-950 to-slate-950 border-2 border-blue-500/40 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <ListPlus size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Continuous Multi-Barcode Scanner Queue
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Scan physical boxes back-to-back with a gun, camera, or paste from Excel
                    </p>
                  </div>
                </div>

                <Badge variant="info" className="text-xs px-2.5 py-1 bg-blue-600 text-white font-mono font-bold">
                  {scannedSerials.length} Scanned
                </Badge>
              </div>

              {/* Rapid Scan Input Bar */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode size={18} className="absolute left-3.5 top-3 text-blue-400" />
                    <input
                      ref={rapidInputRef}
                      type="text"
                      value={rapidSerialInput}
                      onChange={(e) => setRapidSerialInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRapidSerial();
                        }
                      }}
                      placeholder="Scan box with barcode gun or type serial and hit Enter..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border-2 border-blue-500/50 rounded-2xl text-xs sm:text-sm font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 shadow-inner"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleAddRapidSerial()}
                    disabled={!rapidSerialInput.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1 px-4 py-2.5 rounded-2xl"
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setScannerMode('continuous');
                      setScannerModalOpen(true);
                    }}
                    className="bg-slate-900 border-slate-700 hover:border-blue-500 text-blue-400 text-xs font-bold gap-1.5 px-3.5 rounded-2xl"
                    title="Open live camera continuous multi-scanner"
                  >
                    <Camera size={15} />
                    <span className="hidden sm:inline">Camera Scan</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPasteModalOpen(true)}
                    className="bg-slate-900 border-slate-700 hover:border-indigo-500 text-indigo-400 text-xs font-bold gap-1.5 px-3 rounded-2xl"
                    title="Paste serials from Excel / invoice"
                  >
                    <ClipboardPaste size={15} />
                    <span className="hidden sm:inline">Paste Excel</span>
                  </Button>
                </div>

                {rapidSerialError && (
                  <div className="px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle size={14} className="shrink-0 text-amber-400" />
                    <span>{rapidSerialError}</span>
                  </div>
                )}
              </div>

              {/* Scanned Serials Chips List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Registered Serials Queue ({scannedSerials.length} units):
                  </span>
                  {scannedSerials.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannedSerials([])}
                      className="text-[11px] text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Clear Queue</span>
                    </button>
                  )}
                </div>

                {scannedSerials.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-1">
                    <Barcode size={28} className="mx-auto opacity-30 animate-pulse" />
                    <p className="font-semibold text-slate-400">Queue is empty</p>
                    <p className="text-[11px]">
                      Pull the trigger on your scanner gun, use Camera Scan, or Paste from Invoice above.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/90 rounded-2xl border border-slate-800 custom-scrollbar">
                    {scannedSerials.map((code, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs font-mono font-bold shadow-sm group hover:border-blue-400 transition"
                      >
                        <span className="text-[10px] text-blue-400 bg-blue-900/80 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSerial(idx)}
                          className="text-blue-400 hover:text-rose-400 transition p-0.5"
                          title="Remove this serial"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Batch Financial Valuation Card */}
              {scannedSerials.length > 0 && unitPriceNum > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Batch Valuation: </span>
                    <span className="font-bold text-white">
                      {scannedSerials.length} units × ₹{unitPriceNum.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-400 font-mono">
                    Total: ₹{totalBatchValuation.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: AUTO-GENERATE BATCH */}
          {!isEditing && regMode === 'auto-bulk' && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <Sparkles size={16} />
                  <span>Auto-Generated Company Barcodes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Quantity:</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={autoBulkCount}
                    onChange={(e) => setAutoBulkCount(e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-900 border border-indigo-500/40 rounded-lg text-xs font-mono font-bold text-indigo-300 text-center focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                The system will generate indexed sequential barcodes (e.g. <code>MIT-DAHU-001</code> to <code>MIT-DAHU-{String(autoBulkCount).padStart(3, '0')}</code>) for standard non-serialized cables or consumables.
              </p>
            </div>
          )}

          {/* Logistics, Purchase & Warranty Details */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building size={14} className="text-blue-400" />
              <span>Purchase, Warranty & Stock Logistics</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unit Price (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  placeholder="e.g. 2200"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Purchase Invoice / Bill No.
                </label>
                <input
                  type="text"
                  value={form.invoiceNo}
                  onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                  placeholder="e.g. INV-2026-8823"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase / Buy Date</label>
                <input
                  type="date"
                  value={form.buyDate}
                  onChange={(e) => setForm({ ...form, buyDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warranty Expiry Date</label>
                <input
                  type="date"
                  value={form.warrantyExpiry}
                  onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier / Vendor Name</label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="e.g. Media Infotech Master Stock"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Storage Location (Warehouse / Rack)
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. HQ Central Store, Rack A-1"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Operational Notes / Remarks</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Standard patch cords included, verified working condition..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ← Cancel
          </button>

          <Button
            type="submit"
            form="inventory-form"
            disabled={submitting || (!isEditing && regMode === 'multi-serial' && scannedSerials.length === 0)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-blue-500/20 px-5"
          >
            {submitting
              ? 'Saving Assets...'
              : isEditing
              ? 'Save Asset Changes'
              : regMode === 'multi-serial'
              ? `Register ${scannedSerials.length} Units with Physical Serials`
              : regMode === 'auto-bulk'
              ? `Register ${autoBulkCount} Units in Batch`
              : 'Register Hardware Asset'}
          </Button>
        </div>
      </div>

      {/* Embedded Barcode & Image Scanner Modal */}
      <SmartBarcodeScannerModal
        isOpen={scannerModalOpen}
        mode={scannerMode}
        initialBatch={scannedSerials}
        onClose={() => setScannerModalOpen(false)}
        onDetected={(code) => {
          if (regMode === 'multi-serial') {
            handleAddRapidSerial(code);
          } else {
            setForm((prev) => ({ ...prev, barcode: code }));
          }
        }}
        onBatchDetected={(batch) => {
          setScannedSerials(batch);
        }}
      />

      {/* Paste from Excel / Invoice Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Paste Multiple Serial Numbers</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Copy a column from Excel, CSV, or vendor PDF and paste below. Serials separated by newlines, commas, or tabs will be extracted automatically.
            </p>

            <textarea
              rows={6}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder={`SN100234\nSN100235\nSN100236\nor SN100234, SN100235, SN100236`}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPasteModalOpen(false)}
                className="text-xs bg-slate-900 border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyPasteSerials}
                disabled={!pasteRawText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
              >
                <Plus size={14} />
                <span>Import Serials to Queue</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
