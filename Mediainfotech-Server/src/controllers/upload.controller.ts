import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import path from 'path';

export const handleSingleUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Determine the folder based on destination or fieldname
    const folder = path.basename(req.file.destination || 'documents');
    const relativeUrl = `/uploads/${folder}/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      url: relativeUrl,
      fileUrl: relativeUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to process file upload' });
  }
};
