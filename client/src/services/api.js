const API_BASE = '/api';

let authToken = localStorage.getItem('carboniq_jwt_token') || null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('carboniq_jwt_token', token);
  } else {
    localStorage.removeItem('carboniq_jwt_token');
  }
}

export function getAuthToken() {
  return authToken || localStorage.getItem('carboniq_jwt_token');
}

function getAuthHeaders(isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: text || 'Service response could not be parsed' };
    }
  } catch (err) {
    return { success: false, error: 'Connection reset or server restarting: ' + err.message };
  }
}

// Health diagnostic check
export async function checkHealth() {
  return safeFetchJson(`${API_BASE}/health`);
}

// Authentication endpoints
export async function registerCompany(data) {
  return safeFetchJson(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function verifyCompanyOtp(data) {
  const json = await safeFetchJson(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (json.success && json.token) {
    setAuthToken(json.token);
  }
  return json;
}

export async function resendCompanyOtp(data) {
  return safeFetchJson(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function loginCompany(data) {
  const json = await safeFetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (json.success && json.token) {
    setAuthToken(json.token);
  }
  return json;
}

export async function getCompanyProfile() {
  return safeFetchJson(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(true),
  });
}

export async function updateCompanyProfile(data) {
  return safeFetchJson(`${API_BASE}/auth/me`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(data),
  });
}

export async function completeCompanyOnboarding() {
  return safeFetchJson(`${API_BASE}/auth/complete-onboarding`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
  });
}

// Document endpoints
export async function uploadDocumentFiles(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return safeFetchJson(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: getAuthHeaders(false),
    body: formData,
  });
}

export async function uploadZipArchive(file) {
  const formData = new FormData();
  formData.append('file', file);
  return safeFetchJson(`${API_BASE}/documents/upload-zip`, {
    method: 'POST',
    headers: getAuthHeaders(false),
    body: formData,
  });
}

export async function fetchDocuments(params = {}) {
  const query = new URLSearchParams(params).toString();
  return safeFetchJson(`${API_BASE}/documents?${query}`, {
    headers: getAuthHeaders(true),
  });
}

export async function fetchDocumentById(id) {
  return safeFetchJson(`${API_BASE}/documents/${id}`, {
    headers: getAuthHeaders(true),
  });
}

export async function reuploadDocumentFile(id, file) {
  const formData = new FormData();
  formData.append('file', file);
  return safeFetchJson(`${API_BASE}/documents/${id}/reupload`, {
    method: 'POST',
    headers: getAuthHeaders(false),
    body: formData,
  });
}

export async function reprocessDocumentExtraction(id) {
  return safeFetchJson(`${API_BASE}/documents/${id}/reprocess`, {
    method: 'POST',
    headers: getAuthHeaders(true),
  });
}

export async function submitDocumentReview(id, reviewData) {
  return safeFetchJson(`${API_BASE}/documents/${id}/review`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify(reviewData),
  });
}

// Activity records endpoints
export async function createManualActivity(activityData) {
  return safeFetchJson(`${API_BASE}/activities`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(activityData),
  });
}

export async function fetchActivities(params = {}) {
  const query = new URLSearchParams(params).toString();
  return safeFetchJson(`${API_BASE}/activities?${query}`, {
    headers: getAuthHeaders(true),
  });
}

export function getPreviewUrl(id) {
  const token = getAuthToken();
  return `${API_BASE}/documents/${id}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

// Emission factor database endpoints
export async function fetchEmissionFactors(params = {}) {
  const cleanParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      cleanParams[key] = value;
    }
  }
  const query = new URLSearchParams(cleanParams).toString();
  const url = query ? `${API_BASE}/emission-factors?${query}` : `${API_BASE}/emission-factors`;
  return safeFetchJson(url);
}

export async function fetchEmissionFactorSummary() {
  return safeFetchJson(`${API_BASE}/emission-factors/summary`);
}

export async function calculateDocumentEmissions(payload) {
  return safeFetchJson(`${API_BASE}/documents/calculate-emissions`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });
}

// Statutory Compliance & Export Endpoints
export async function fetchStatutorySummary(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE}/reports/summary?${query}` : `${API_BASE}/reports/summary`;
  const res = await fetch(url, {
    headers: getAuthHeaders(true),
  });
  return res.json();
}

export async function downloadStatutoryReport(endpoint, fallbackFilename) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/reports/${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error || 'Failed to download report');
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackFilename;

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadDocumentReportPDF(id, originalFileName) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/documents/${id}/report/pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error || 'Failed to download document report');
  }

  const safeName = (originalFileName || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}_Carbon_Certificate.pdf`;

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}


