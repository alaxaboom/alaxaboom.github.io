const PROXY_ENDPOINTS = [
  {
    name: 'allorigins-get',
    url: (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      const data = await response.json();
      return data.contents;
    }
  },
  {
    name: 'allorigins-raw',
    url: (targetUrl) => `https://allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    }
  },
  {
    name: 'corsproxy',
    url: (targetUrl) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    }
  },
  {
    name: 'codetabs',
    url: (targetUrl) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    }
  },
  {
    name: 'thingproxy',
    url: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    }
  },
  {
    name: 'cors-anywhere-heroku',
    url: (targetUrl) => `https://cors-anywhere.herokuapp.com/${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    }
  },
  {
    name: 'yacdn',
    url: (targetUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    }
  },
  {
    name: 'proxycurl',
    url: (targetUrl) => `https://api.proxycurl.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`,
    parse: async (response) => {
      return await response.text();
    }
  }
];

export const fetchLinkPreview = async (url) => {
  const cachedData = localStorage.getItem(`preview-${url}`);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  for (const proxy of PROXY_ENDPOINTS) {
    try {
      const proxyUrl = proxy.url(url);
      
      let response;
      if (proxy.name === 'allorigins-get') {
        response = await fetch(proxyUrl);
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
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
      }

      if (!response.ok) {
        continue;
      }

      const html = await proxy.parse(response);
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

