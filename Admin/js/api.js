let token = sessionStorage.getItem('cpn-token');
export function setToken(value) { token = value; value ? sessionStorage.setItem('cpn-token', value) : sessionStorage.removeItem('cpn-token'); }
export const hasToken = () => Boolean(token);
export async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(`/api${path}`, { ...options, signal: controller.signal, headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined });
  } catch (error) { throw new Error(error.name === 'AbortError' ? 'Kết nối quá lâu. Vui lòng thử lại.' : 'Không kết nối được máy chủ.'); }
  finally { clearTimeout(timeout); }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') { setToken(null); window.dispatchEvent(new Event('session-expired')); }
    throw new Error(data.errors?.length ? `${data.message} ${data.errors.map(e => e.field + ': ' + e.message).join(' ')}` : data.message || 'Yêu cầu thất bại.');
  }
  return data;
}
export async function allUsers(role, active) {
  const users = []; let page = 1; let total = Infinity;
  while (users.length < total) { const data = await api(`/users?role=${role}&limit=100&page=${page++}${active ? '&active=1' : ''}`); users.push(...data.items); total = data.total; if (!data.items.length) break; }
  return users;
}
