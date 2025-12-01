import { getCachedData, setCachedData, clearCache } from '../utils/cacheService';

const API_URL = process.env.REACT_APP_LINKS_API_URL;
const API_KEY = process.env.REACT_APP_LINKS_API_KEY || '';

const handleResponse = async (response) => {
  const text = await response.text();
  console.log('Response status:', response.status);
  console.log('Response text:', text);
  
  try {
    const data = JSON.parse(text);
    
    if (data.status && data.status >= 200 && data.status < 300) {
      return data.data ?? null;
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }
    
    return data.data ?? data ?? null;
  } catch (parseError) {
    if (parseError.message && parseError.message !== 'Invalid JSON response') {
      throw parseError;
    }
    console.error('Parse error:', parseError, 'Text:', text);
    throw new Error('Invalid JSON response: ' + text.substring(0, 100));
  }
};

const withKey = (payload = {}) => {
  if (!API_KEY) {
    return payload;
  }
  return { ...payload, key: API_KEY };
};

export const fetchCategories = async (useCache = true) => {
  if (useCache) {
    const cached = getCachedData('categories');
    if (cached) {
      return cached;
    }
  }

  if (!API_URL) {
    throw new Error('REACT_APP_LINKS_API_URL is not configured');
  }
  const url = API_KEY ? `${API_URL}?key=${encodeURIComponent(API_KEY)}&type=categories&method=read` : `${API_URL}?type=categories&method=read`;
  const response = await fetch(url, {
    method: 'GET',
  });
  const data = await handleResponse(response);
  if (data) {
    setCachedData('categories', data);
  }
  return data;
};

export const createCategory = async (payload) => {
  if (!API_URL) {
    throw new Error('REACT_APP_LINKS_API_URL is not configured');
  }
  
  const data = withKey(payload);
  console.log('Sending request:', data);
  
  const params = new URLSearchParams();
  params.append('key', API_KEY || '');
  params.append('type', 'categories');
  params.append('method', data.method || 'create');
  
  if (data.method === 'create') {
    params.append('id', data.id || '');
    params.append('name', data.name || '');
    params.append('color', data.color || '#FFFFFF');
    params.append('order', data.order !== undefined ? String(data.order) : '');
  } else if (data.method === 'update') {
    if (!data.id) {
      throw new Error('Missing id for update');
    }
    params.append('id', data.id);
    params.append('patch', JSON.stringify(data.patch || {}));
    console.log('Update params:', { id: data.id, patch: data.patch });
  } else if (data.method === 'delete') {
    if (!data.id) {
      throw new Error('Missing id for delete');
    }
    params.append('id', data.id);
  }
  
  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: 'GET',
    });
    const result = await handleResponse(response);
    clearCache('categories');
    return result;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export const updateCategory = async (payload) => {
  return createCategory({ method: 'update', ...payload });
};

export const deleteCategory = async (id) => {
  return createCategory({ method: 'delete', id });
};

