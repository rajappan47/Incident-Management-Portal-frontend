// src/utils/exportCsv.js
import api from '../services/api';

/**
 * Trigger CSV file download from backend API
 * @param {string} url - The backend endpoint (/incidents/export/csv)
 * @param {object} params - Current filter/search queries
 * @param {string} defaultFilename - Fallback filename
 */
export const downloadCsv = async (url, params = {}, defaultFilename = 'incidents_export.csv') => {
  try {
    const response = await api.get(url, {
      params,
      responseType: 'blob', // IMPORTANT: Handles stream/blob binary response
    });

    // Create a Blob from response data
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = window.URL.createObjectURL(blob);

    // Get filename from Content-Disposition header if available
    let filename = defaultFilename;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    // Create hidden anchor link and click it to download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Clean up
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('CSV Export Error:', error);
    throw error;
  }
};