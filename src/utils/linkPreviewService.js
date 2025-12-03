const ALL_PROXIES = [
  {
    name: 'api-codetabs',
    url: (targetUrl) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    },
    returnsHtml: true
  },
  {
    name: 'allorigins-raw',
    url: (targetUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    },
    returnsHtml: true
  }
];

const PROXY_ENDPOINTS = ALL_PROXIES;

export const fetchLinkPreview = async (url) => {
  const cachedData = localStorage.getItem(`preview-${url}`);
  if (cachedData) {
    const parsed = JSON.parse(cachedData);
    if (parsed.image) {
      return parsed;
    }
  }

  for (const proxy of PROXY_ENDPOINTS) {
    try {
      const proxyUrl = proxy.url(url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let response;
      try {
        response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.log(`Proxy ${proxy.name} timeout`);
        }
        throw fetchError;
      }

      if (!response.ok) {
        continue;
      }

      if (proxy.returnsHtml === false) {
        const previewData = await proxy.parse(response, url);
        if (!previewData || !previewData.image) {
          continue;
        }
        localStorage.setItem(`preview-${url}`, JSON.stringify(previewData));
        return previewData;
      }

      const html = await proxy.parse(response, url);
      if (!html) {
        continue;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const text = doc.querySelector('title')?.textContent || '';
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                         doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || 
                   doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || '';

      if (!image) {
        continue;
      }

      const previewData = {
        text: text || url,
        description: description || '',
        image: image || '',
        url
      };

      localStorage.setItem(`preview-${url}`, JSON.stringify(previewData));
      return previewData;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Proxy ${proxy.name} timeout`);
      } else {
        console.log(`Proxy ${proxy.name} failed:`, error.message);
      }
      continue;
    }
  }

  return {
    text: url,
    description: '',
    image: '',
    url
  };
};
