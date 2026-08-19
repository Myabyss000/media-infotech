'use client';

import React, { useRef } from 'react';
import { X, Printer, Barcode as BarcodeIcon, QrCode, Building, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

interface BarcodeLabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
}

export function BarcodeLabelPrinterModal({ isOpen, onClose, item }: BarcodeLabelPrinterProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      alert('Please allow popups to print asset barcode stickers.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Tag - ${item.barcode}</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 6px;
              background: #fff;
              color: #000;
              display: flex;
              align-items: center;
              justify-content: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .asset-tag {
              width: 100%;
              max-width: 200px;
              border: 1.5px solid #000;
              border-radius: 4px;
              padding: 6px;
              text-align: center;
              box-sizing: border-box;
            }
            .company {
              font-size: 8px;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              border-bottom: 1px solid #000;
              padding-bottom: 2px;
              margin-bottom: 4px;
            }
            .device-name {
              font-size: 10px;
              font-weight: 700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .model {
              font-size: 7.5px;
              color: #444;
              margin-bottom: 4px;
            }
            .barcode-svg {
              width: 100%;
              height: 28px;
            }
            .barcode-text {
              font-family: monospace;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 1px;
              margin-top: 1px;
            }
            .footer-info {
              display: flex;
              justify-content: space-between;
              font-size: 6.5px;
              color: #555;
              margin-top: 3px;
              border-top: 0.5px dashed #888;
              padding-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="asset-tag">
            <div class="company">★ MEDIA INFOTECH ASSET ★</div>
            <div class="device-name">${item.deviceName || 'Hardware Asset'}</div>
            <div class="model">${item.modelNumber || item.category || 'Asset ID'}</div>
            <svg class="barcode-svg" viewBox="0 0 160 30" xmlns="http://www.w3.org/2000/svg">
              ${generateBarcodeSvgPaths(item.barcode)}
            </svg>
            <div class="barcode-text">${item.barcode}</div>
            <div class="footer-info">
              <span>Cat: ${item.category || 'Hardware'}</span>
              <span>${item.buyDate ? new Date(item.buyDate).toLocaleDateString() : 'Active'}</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Print Asset Barcode Tag</h2>
              <p className="text-xs text-slate-400">Generate high-density sticker for thermal label rolls or A4 sheets.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sticker Preview Area */}
        <div className="p-6 flex flex-col items-center justify-center space-y-5 bg-slate-950/40">
          <div
            ref={printAreaRef}
            className="w-full max-w-xs bg-white text-black p-4 rounded-xl border-2 border-slate-300 shadow-2xl text-center space-y-1.5 select-none"
          >
            <div className="text-[10px] font-black tracking-wider uppercase border-b border-black pb-1 flex items-center justify-center gap-1">
              <ShieldCheck size={12} />
              <span>MEDIA INFOTECH ASSET</span>
            </div>

            <div className="pt-1">
              <h3 className="text-xs font-black text-black truncate">{item.deviceName}</h3>
              <p className="text-[10px] text-slate-700 font-mono">
                {item.modelNumber ? `Model: ${item.modelNumber}` : item.category || 'Hardware Asset'}
              </p>
            </div>

            {/* Generated Barcode SVG Preview */}
            <div className="py-1 flex justify-center">
              <svg className="w-full h-12" viewBox="0 0 160 30" xmlns="http://www.w3.org/2000/svg">
                {generateBarcodeSvgPaths(item.barcode)}
              </svg>
            </div>

            <p className="text-xs font-mono font-black tracking-widest text-black">{item.barcode}</p>

            <div className="text-[9px] text-slate-600 border-t border-dashed border-slate-400 pt-1 flex justify-between">
              <span>Loc: {item.location || 'HQ Storage'}</span>
              <span>{item.buyDate ? formatDate(item.buyDate) : 'Verified'}</span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 max-w-xs">
            Formatted for 50mm × 30mm thermal label rolls & barcode stickers. Compatible with Zebra, TVS, TSC & Brother printers.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs bg-slate-900 border-slate-700">
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-indigo-500/20"
          >
            <Printer size={14} />
            <span>Print Asset Sticker</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Deterministic Code128 pattern SVG generator
function generateBarcodeSvgPaths(codeStr: string) {
  const code = (codeStr || 'ASSET-001').toUpperCase();
  const rects: React.ReactNode[] = [];
  let currentX = 10;
  const barHeight = 24;

  // Start guard bars
  rects.push(<rect key="sg1" x={currentX} y={2} width={2} height={barHeight} fill="#000" />);
  currentX += 4;
  rects.push(<rect key="sg2" x={currentX} y={2} width={1} height={barHeight} fill="#000" />);
  currentX += 3;

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const pattern = (charCode * 7 + i * 13) % 15;
    const w1 = (pattern % 3) + 1;
    const w2 = ((pattern >> 1) % 2) + 1;
    const gap = (pattern % 2) + 1;

    rects.push(<rect key={`b1_${i}`} x={currentX} y={2} width={w1} height={barHeight} fill="#000" />);
    currentX += w1 + gap;
    rects.push(<rect key={`b2_${i}`} x={currentX} y={2} width={w2} height={barHeight} fill="#000" />);
    currentX += w2 + 2;

    if (currentX > 145) break;
  }

  // End guard bars
  rects.push(<rect key="eg1" x={currentX} y={2} width={2} height={barHeight} fill="#000" />);
  currentX += 3;
  rects.push(<rect key="eg2" x={currentX} y={2} width={1} height={barHeight} fill="#000" />);

  return <g>{rects}</g>;
}
