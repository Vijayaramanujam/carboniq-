import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * Extracts text from an image or scanned document using OCR.space API
 */
export async function performOCRSpace(filePath, fileName, engine = '2') {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      text: '',
      error: 'OCR_SPACE_API_KEY is not configured in server/.env. Please provide your free OCR.space API key.',
      confidence: 0,
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), { filename: fileName });
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', engine);
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');

    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: {
        ...formData.getHeaders(),
        apikey: apiKey.trim(),
      },
      timeout: 30000,
    });

    const data = response.data;

    if (data.IsErroredOnProcessing) {
      const errDetail = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join(', ')
        : data.ErrorMessage || 'OCR.space processing error';

      // If Engine 2 failed due to small dimensions, auto-retry with Engine 1
      if (engine === '2' && errDetail.toLowerCase().includes('engine 1')) {
        return performOCRSpace(filePath, fileName, '1');
      }

      return {
        success: false,
        text: '',
        error: errDetail,
        confidence: 0,
      };
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      return {
        success: false,
        text: '',
        error: 'No text detected in document image',
        confidence: 0,
      };
    }

    const parsedText = data.ParsedResults.map((r) => r.ParsedText).join('\n\n').trim();

    return {
      success: true,
      text: parsedText,
      error: null,
      confidence: parsedText.length > 20 ? 0.85 : 0.4,
    };
  } catch (error) {
    const message = error.response?.data?.ErrorMessage || error.message || 'Failed to contact OCR.space API';
    return {
      success: false,
      text: '',
      error: message,
      confidence: 0,
    };
  }
}
