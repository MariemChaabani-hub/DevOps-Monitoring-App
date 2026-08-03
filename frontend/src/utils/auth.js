/**
 * Shared helpers for reading the stored JWT and attaching it to
 * requests made against JWT-protected backend routes.
 */

export const getToken = () => localStorage.getItem('adminToken');

export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
