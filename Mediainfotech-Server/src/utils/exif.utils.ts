// @ts-ignore
import ExifParser from 'exif-parser';
import fs from 'fs';

export const extractGpsFromPhoto = (filePath: string): { lat: number; lng: number } | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    if (
      result.tags &&
      typeof result.tags.GPSLatitude === 'number' &&
      typeof result.tags.GPSLongitude === 'number' &&
      !isNaN(result.tags.GPSLatitude) &&
      !isNaN(result.tags.GPSLongitude)
    ) {
      return {
        lat: result.tags.GPSLatitude,
        lng: result.tags.GPSLongitude,
      };
    }
  } catch (err) {
    // Non-JPEG or image without EXIF
  }
  return null;
};
