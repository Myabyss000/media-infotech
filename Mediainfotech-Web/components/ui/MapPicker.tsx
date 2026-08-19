'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, LocateFixed, Loader2, Globe, Check, AlertCircle, Sparkles } from 'lucide-react';

interface MapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  locationName?: string;
  onLocationSelect: (data: {
    latitude: number;
    longitude: number;
    address: string;
    locationName?: string;
  }) => void;
}

export function MapPicker({
  latitude,
  longitude,
  address,
  locationName,
  onLocationSelect,
}: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState(address || locationName || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locDetecting, setLocDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const initialLat = latitude || 22.5726; // Default to Kolkata / India central coordinates if not set
  const initialLng = longitude || 88.3639;

  // Initialize Leaflet Map dynamically
  useEffect(() => {
    let isMounted = true;

    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;

      // Inject Leaflet CSS if not already present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Inject Leaflet JS if not already present
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      if (!isMounted || !mapContainerRef.current || leafletMapRef.current) return;

      const L = (window as any).L;
      if (!L) return;

      // Custom Dark Tile Layer
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: latitude && longitude ? 15 : 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create Custom Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
                 <div style="background-color: white; width: 10px; height: 10px; border-radius: 50%;"></div>
               </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      leafletMapRef.current = map;
      markerRef.current = marker;

      // Handle Map Click -> Move Pin & Reverse Geocode
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        updatePinPosition(lat, lng, true);
      });

      // Handle Marker Drag -> Move Pin & Reverse Geocode
      marker.on('dragend', async () => {
        const position = marker.getLatLng();
        updatePinPosition(position.lat, position.lng, true);
      });
    };

    loadLeaflet();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map view when latitude/longitude props change externally
  useEffect(() => {
    if (latitude && longitude && leafletMapRef.current && markerRef.current) {
      const L = (window as any).L;
      if (L) {
        leafletMapRef.current.setView([latitude, longitude], 15);
        markerRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // Update Pin Position & Reverse Geocode
  const updatePinPosition = async (lat: number, lng: number, fetchAddress: boolean) => {
    const L = (window as any).L;
    const formattedLat = parseFloat(lat.toFixed(6));
    const formattedLng = parseFloat(lng.toFixed(6));

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.panTo([lat, lng]);
    }

    if (fetchAddress) {
      setStatusMessage('Finding address for selected map point...');
      try {
        const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
        const data = await res.json();
        let name = '';
        let fullAddr = '';

        if (data && data.features && data.features.length > 0) {
          const prop = data.features[0].properties;
          name = prop.name || prop.street || prop.district || 'Selected Site';
          const parts = [prop.name, prop.street, prop.district, prop.city, prop.state, prop.country].filter(Boolean);
          fullAddr = parts.join(', ');
        }

        if (!fullAddr) {
          // Fallback to Nominatim
          const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const nomData = await nomRes.json();
          fullAddr = nomData.display_name || `${formattedLat}, ${formattedLng}`;
          if (!name) name = nomData.display_name?.split(',')[0] || 'Selected Site';
        }

        setSearchQuery(fullAddr);
        setStatusMessage('Location updated from map pin!');
        onLocationSelect({
          latitude: formattedLat,
          longitude: formattedLng,
          address: fullAddr,
          locationName: name,
        });
      } catch (err) {
        console.error('Reverse geocode error:', err);
        setStatusMessage(null);
        onLocationSelect({
          latitude: formattedLat,
          longitude: formattedLng,
          address: `${formattedLat}, ${formattedLng}`,
        });
      }
    } else {
      onLocationSelect({
        latitude: formattedLat,
        longitude: formattedLng,
        address: address || '',
        locationName,
      });
    }
  };

  // Search Address with Dual Engine (Photon + Nominatim)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setShowDropdown(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        // Query 1: Photon API (Fast, handles informal queries like "Patuli Lake Side")
        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`);
        const photonData = await photonRes.json();

        let results: any[] = [];

        if (photonData && photonData.features && photonData.features.length > 0) {
          results = photonData.features.map((f: any) => {
            const p = f.properties;
            const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
            const displayName = parts.join(', ');
            return {
              display_name: displayName || p.name,
              name: p.name || displayName.split(',')[0],
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
            };
          });
        }

        // Query 2: Fallback to Nominatim if Photon yields < 2 results
        if (results.length < 2) {
          try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              const nomResults = nomData.map((n: any) => ({
                display_name: n.display_name,
                name: n.display_name.split(',')[0],
                lat: parseFloat(n.lat),
                lon: parseFloat(n.lon),
              }));
              results = [...results, ...nomResults];
            }
          } catch (e) {
            // Ignore fallback error
          }
        }

        setSuggestions(results);
        if (results.length === 0) {
          setStatusMessage('No exact location match. Click anywhere on the map below to drop pin!');
        }
      } catch (err) {
        console.error('Search geocode error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  // User selects a suggestion from dropdown
  const handleSelectSuggestion = (sug: any) => {
    setShowDropdown(false);
    setSearchQuery(sug.display_name);
    setStatusMessage(`📍 Location Locked: ${sug.name || sug.display_name.split(',')[0]}`);

    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (leafletMapRef.current) {
      if (leafletMapRef.current.flyTo) {
        leafletMapRef.current.flyTo([lat, lng], 16, { duration: 1 });
      } else {
        leafletMapRef.current.setView([lat, lng], 16);
      }
    }

    onLocationSelect({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      address: sug.display_name,
      locationName: sug.name || sug.display_name.split(',')[0],
    });
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      } else if (searchQuery.trim().length >= 2) {
        setLoading(true);
        try {
          const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery.trim())}&limit=1`);
          const photonData = await photonRes.json();
          if (photonData && photonData.features && photonData.features.length > 0) {
            const f = photonData.features[0];
            const p = f.properties;
            const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
            const displayName = parts.join(', ');
            handleSelectSuggestion({
              display_name: displayName || p.name,
              name: p.name || displayName.split(',')[0],
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
            });
          } else {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1`);
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              handleSelectSuggestion({
                display_name: nomData[0].display_name,
                name: nomData[0].display_name.split(',')[0],
                lat: parseFloat(nomData[0].lat),
                lon: parseFloat(nomData[0].lon),
              });
            }
          }
        } catch (err) {
          console.error('Enter search geocode error:', err);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Detect Current Browser GPS Position
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      return;
    }
    setLocDetecting(true);
    setStatusMessage('Getting your exact GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updatePinPosition(lat, lng, true);
        setLocDetecting(false);
      },
      (err) => {
        setStatusMessage('GPS permission denied. Please click on the map to place a pin.');
        setLocDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Top Search Input & Auto-Detect GPS Button */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <MapPin size={13} className="text-emerald-400" />
            <span>Search Map Location & Auto-Pin (e.g. Barasat)</span>
          </label>
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={locDetecting}
            className="px-2.5 py-1 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-bold text-[11px] flex items-center space-x-1 transition"
          >
            <LocateFixed size={12} className={locDetecting ? 'animate-spin text-blue-400' : ''} />
            <span>{locDetecting ? 'Detecting GPS...' : 'Auto-Detect My GPS'}</span>
          </button>
        </div>

        {/* Search Bar with Live Suggestions */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type place name (e.g. Barasat, Salt Lake Sector 5, Kolkata, Dankuni Toll)..."
            className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
          )}

          {/* Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-800/60">
              {suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(sug)}
                  className="p-2.5 text-xs text-slate-200 hover:bg-indigo-600/20 hover:text-white cursor-pointer transition flex items-start space-x-2.5"
                >
                  <MapPin size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-white">{sug.name || sug.display_name.split(',')[0]}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{sug.display_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Helpful Status Message / Hint */}
      {statusMessage && (
        <div className="p-2 rounded-xl bg-slate-950 border border-blue-500/20 text-[11px] text-blue-300 flex items-center space-x-2">
          <Sparkles size={13} className="text-blue-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Interactive Map Picker Container (Click / Drag to set pin) */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full h-56 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 z-0 shadow-inner"
        />

        {/* Map Click Instructions Badge Overlay */}
        <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-[10px] text-slate-300 font-semibold flex items-center space-x-1 shadow-lg">
          <MapPin size={11} className="text-emerald-400" />
          <span>Click anywhere on the map to set pin location</span>
        </div>
      </div>

      {/* Coordinates Locked Summary */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase">Latitude</span>
          <span className="font-mono text-emerald-400 font-extrabold">{latitude ? latitude.toFixed(6) : '—'}</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase">Longitude</span>
          <span className="font-mono text-emerald-400 font-extrabold">{longitude ? longitude.toFixed(6) : '—'}</span>
        </div>
      </div>
    </div>
  );
}
