/**
 * Pure TypeScript Zero-Dependency Client-Side EXIF GPS Extractor
 */
export async function getGpsFromImageFile(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer(); // Read first 128KB where EXIF header resides
    const view = new DataView(buffer);

    // Check SOI marker 0xFFD8
    if (view.getUint16(0, false) !== 0xFFD8) {
      return null;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      if (view.getUint8(offset) !== 0xFF) return null;
      const marker = view.getUint8(offset + 1);

      // APP1 Marker (0xFFE1) contains EXIF
      if (marker === 0xE1) {
        const app1Length = view.getUint16(offset + 2, false);
        const exifStart = offset + 4;

        // Check 'Exif\0\0' (0x45786966 0x0000)
        if (
          view.getUint32(exifStart, false) === 0x45786966 &&
          view.getUint16(exifStart + 4, false) === 0x0000
        ) {
          const tiffStart = exifStart + 6;
          const isLittleEndian = view.getUint16(tiffStart, false) === 0x4949; // 'II'

          if (!isLittleEndian && view.getUint16(tiffStart, false) !== 0x4D4D) {
            return null; // Invalid TIFF header
          }

          const firstIfdOffset = view.getUint32(tiffStart + 4, isLittleEndian);
          if (firstIfdOffset < 8) return null;

          const ifd0Start = tiffStart + firstIfdOffset;
          const numEntries = view.getUint16(ifd0Start, isLittleEndian);

          let gpsIfdOffset = 0;
          for (let i = 0; i < numEntries; i++) {
            const entryOffset = ifd0Start + 2 + i * 12;
            if (entryOffset + 12 > length) break;
            const tag = view.getUint16(entryOffset, isLittleEndian);
            if (tag === 0x8825) {
              // GPS IFD Pointer
              gpsIfdOffset = view.getUint32(entryOffset + 8, isLittleEndian);
              break;
            }
          }

          if (gpsIfdOffset) {
            const gpsStart = tiffStart + gpsIfdOffset;
            if (gpsStart + 2 > length) return null;
            const numGpsEntries = view.getUint16(gpsStart, isLittleEndian);

            let latRef = 'N';
            let lngRef = 'E';
            let latDeg: number[] | null = null;
            let lngDeg: number[] | null = null;

            for (let i = 0; i < numGpsEntries; i++) {
              const entryOffset = gpsStart + 2 + i * 12;
              if (entryOffset + 12 > length) break;
              const tag = view.getUint16(entryOffset, isLittleEndian);
              const valueOffset = view.getUint32(entryOffset + 8, isLittleEndian);

              if (tag === 0x0001) {
                // GPSLatitudeRef
                latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
              } else if (tag === 0x0002) {
                // GPSLatitude
                const rStart = tiffStart + valueOffset;
                if (rStart + 24 <= length) {
                  latDeg = [
                    view.getUint32(rStart, isLittleEndian) / view.getUint32(rStart + 4, isLittleEndian),
                    view.getUint32(rStart + 8, isLittleEndian) / view.getUint32(rStart + 12, isLittleEndian),
                    view.getUint32(rStart + 16, isLittleEndian) / view.getUint32(rStart + 20, isLittleEndian),
                  ];
                }
              } else if (tag === 0x0003) {
                // GPSLongitudeRef
                lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
              } else if (tag === 0x0004) {
                // GPSLongitude
                const rStart = tiffStart + valueOffset;
                if (rStart + 24 <= length) {
                  lngDeg = [
                    view.getUint32(rStart, isLittleEndian) / view.getUint32(rStart + 4, isLittleEndian),
                    view.getUint32(rStart + 8, isLittleEndian) / view.getUint32(rStart + 12, isLittleEndian),
                    view.getUint32(rStart + 16, isLittleEndian) / view.getUint32(rStart + 20, isLittleEndian),
                  ];
                }
              }
            }

            if (latDeg && lngDeg) {
              let lat = latDeg[0] + latDeg[1] / 60 + latDeg[2] / 3600;
              let lng = lngDeg[0] + lngDeg[1] / 60 + lngDeg[2] / 3600;

              if (latRef === 'S') lat = -lat;
              if (lngRef === 'W') lng = -lng;

              if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                return { lat, lng };
              }
            }
          }
        }
        break;
      }

      offset += 2 + view.getUint16(offset + 2, false);
    }
  } catch (e) {
    // Non-EXIF image
  }
  return null;
}
