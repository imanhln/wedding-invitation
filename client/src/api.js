const TOKEN_KEY = 'wedding_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(url, { method = 'GET', body, auth = false, raw = false } = {}) {
  const headers = {};
  if (body && !raw) headers['Content-Type'] = 'application/json';
  if (auth) headers['x-admin-token'] = getToken();

  const res = await fetch(url, {
    method,
    headers,
    body: raw ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

/* ------------------------------- Công khai ------------------------------- */
export const fetchContent = () => request('/api/content');
export const fetchWishes = () => request('/api/wishes');
export const sendWish = (payload) => request('/api/wishes', { method: 'POST', body: payload });
export const sendRsvp = (payload) => request('/api/rsvp', { method: 'POST', body: payload });

/* --------------------------------- Admin --------------------------------- */
export const adminLogin = (password) => request('/api/admin/login', { method: 'POST', body: { password } });
export const adminCheck = () => request('/api/admin/me', { auth: true });
export const adminLogout = () => request('/api/admin/logout', { method: 'POST', auth: true });
export const saveContent = (content) => request('/api/admin/content', { method: 'PUT', body: content, auth: true });
export const resetContent = () => request('/api/admin/content/reset', { method: 'POST', auth: true });
export const listUploads = () => request('/api/admin/uploads', { auth: true });
export const deleteUpload = (name) => request(`/api/admin/uploads/${encodeURIComponent(name)}`, { method: 'DELETE', auth: true });
export const adminRsvp = () => request('/api/admin/rsvp', { auth: true });
export const deleteRsvp = (id) => request(`/api/admin/rsvp/${id}`, { method: 'DELETE', auth: true });
export const adminWishes = () => request('/api/admin/wishes', { auth: true });
export const toggleWish = (id, hidden) => request(`/api/admin/wishes/${id}`, { method: 'PATCH', body: { hidden }, auth: true });
export const deleteWish = (id) => request(`/api/admin/wishes/${id}`, { method: 'DELETE', auth: true });
export const importData = (payload) => request('/api/admin/import', { method: 'POST', body: payload, auth: true });

export async function uploadFiles(fileList) {
  const form = new FormData();
  [...fileList].forEach((f) => form.append('files', f));
  return request('/api/admin/upload', { method: 'POST', body: form, auth: true, raw: true });
}

export function exportUrl() {
  return `/api/admin/export?token=${encodeURIComponent(getToken())}`;
}
