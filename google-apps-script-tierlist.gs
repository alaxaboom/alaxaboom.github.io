const FILE_NAME_LINKS = 'links.json';
const FILE_NAME_CATEGORIES = 'categories.json';
const FILE_NAME_TIER_LIST_ITEMS = 'tierListItems.json';

const API_KEY = 'zxc';

const getFolder = () => {
  const folders = DriveApp.getFoldersByName('zalupa');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('zalupa');
};

const ensureFile = (fileName) => {
  const folder = getFolder();
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) return files.next();
  return folder.createFile(Utilities.newBlob('[]', 'application/json', fileName));
};

const readFile = (fileName) => {
  try {
    const file = ensureFile(fileName);
    const content = file.getBlob().getDataAsString('utf-8').trim();
    if (!content || content === '') {
      return [];
    }
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading file ' + fileName + ':', error);
    return [];
  }
};

const writeFile = (fileName, data) => {
  try {
    if (!Array.isArray(data)) {
      console.error('Attempted to write non-array data to ' + fileName);
      return;
    }
    // Защита от случайной очистки файла tierListItems
    // Блокируем только если пытаются записать пустой массив, когда файл НЕ пустой
    if (fileName === FILE_NAME_TIER_LIST_ITEMS && data.length === 0) {
      const existingData = readFile(fileName);
      if (existingData && existingData.length > 0) {
        console.error('Attempted to clear tierListItems file with ' + existingData.length + ' items. Blocked.');
        return;
      }
    }
    const file = ensureFile(fileName);
    file.setContent(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing file ' + fileName + ':', error);
  }
};

const errorResponse = (status, message) => {
  const output = ContentService.createTextOutput(JSON.stringify({ status, error: message }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
};

const successResponse = (status, data) => {
  const output = ContentService.createTextOutput(JSON.stringify({ status, data }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
};

const checkAuth = (key) => key === API_KEY;

function doOptions() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  const key = e.parameter.key;
  if (!checkAuth(key)) {
    return errorResponse(401, 'Unauthorized');
  }

  const type = (e.parameter.type || 'links').toLowerCase();
  const method = (e.parameter.method || 'read').toLowerCase();

  let result;
  if (type === 'links') {
    result = handleLinksRequest(e, method);
  } else if (type === 'categories') {
    result = handleCategoriesRequest(e, method);
  } else if (type === 'tierlistitems') {
    result = handleTierListItemsRequest(e, method);
  } else {
    result = errorResponse(400, 'Unsupported type: ' + type);
  }
  
  return result;
}

function doPost(e) {
  let body;
  try {
    body = e.postData?.contents ? JSON.parse(e.postData.contents) : {};
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  if (!checkAuth(body.key)) {
    return errorResponse(401, 'Unauthorized');
  }

  const type = (body.type || 'links').toLowerCase();
  const method = (body.method || 'create').toLowerCase();

  let result;
  if (type === 'links') {
    result = handleLinksRequestPost(body, method);
  } else if (type === 'categories') {
    result = handleCategoriesRequestPost(body, method);
  } else if (type === 'tierlistitems') {
    result = handleTierListItemsRequestPost(body, method);
  } else {
    result = errorResponse(400, 'Unsupported type: ' + type);
  }

  return result;
}

function handleLinksRequest(e, method) {
  const links = readFile(FILE_NAME_LINKS);

  if (method === 'read' || !method) {
    return successResponse(200, links);
  }

  if (method === 'create') {
    if (!e.parameter.url) return errorResponse(400, 'Missing url');

    const now = new Date().toISOString();
    const newLink = {
      id: e.parameter.id || Utilities.getUuid(),
      url: e.parameter.url,
      text: e.parameter.text || e.parameter.url,
      category: e.parameter.category || 'passed',
      createdAt: e.parameter.createdAt || now,
    };

    links.unshift(newLink);
    writeFile(FILE_NAME_LINKS, links);
    return successResponse(201, newLink);
  }

  if (method === 'update') {
    if (!e.parameter.id) return errorResponse(400, 'Missing id');
    if (!e.parameter.patch) return errorResponse(400, 'Missing patch');

    const idx = links.findIndex(link => String(link.id) === String(e.parameter.id));
    if (idx === -1) {
      return errorResponse(404, 'Not found: Link with id ' + e.parameter.id + ' not found. Total links: ' + links.length);
    }

    let patch;
    try {
      patch = JSON.parse(e.parameter.patch);
    } catch (error) {
      return errorResponse(400, 'Invalid patch JSON: ' + error.toString());
    }

    links[idx] = { ...links[idx], ...patch };
    writeFile(FILE_NAME_LINKS, links);
    return successResponse(200, links[idx]);
  }

  if (method === 'delete') {
    if (!e.parameter.id) return errorResponse(400, 'Missing id');
    const filtered = links.filter(link => String(link.id) !== String(e.parameter.id));
    if (filtered.length === links.length) {
      return errorResponse(404, 'Not found: Link with id ' + e.parameter.id + ' not found');
    }
    writeFile(FILE_NAME_LINKS, filtered);
    return successResponse(204, null);
  }

  return errorResponse(400, 'Unsupported method: ' + method);
}

function handleLinksRequestPost(body, method) {
  const links = readFile(FILE_NAME_LINKS);

  if (method === 'create') {
    if (!body.url) return errorResponse(400, 'Missing url');

    const now = new Date().toISOString();
    const newLink = {
      id: body.id || Utilities.getUuid(),
      url: body.url,
      text: body.text || body.url,
      category: body.category || 'passed',
      createdAt: body.createdAt || now,
    };

    links.unshift(newLink);
    writeFile(FILE_NAME_LINKS, links);
    return successResponse(201, newLink);
  }

  if (method === 'update') {
    if (!body.id || !body.patch) return errorResponse(400, 'Missing id or patch');
    const idx = links.findIndex(link => String(link.id) === String(body.id));
    if (idx === -1) return errorResponse(404, 'Not found');
    links[idx] = { ...links[idx], ...body.patch };
    writeFile(FILE_NAME_LINKS, links);
    return successResponse(200, links[idx]);
  }

  if (method === 'delete') {
    if (!body.id) return errorResponse(400, 'Missing id');
    const filtered = links.filter(link => String(link.id) !== String(body.id));
    if (filtered.length === links.length) return errorResponse(404, 'Not found');
    writeFile(FILE_NAME_LINKS, filtered);
    return successResponse(204, null);
  }

  return errorResponse(400, 'Unsupported method');
}

function handleCategoriesRequest(e, method) {
  const categories = readFile(FILE_NAME_CATEGORIES);

  if (method === 'read' || !method) {
    const sorted = categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    return successResponse(200, sorted);
  }

  if (method === 'create') {
    if (!e.parameter.name) return errorResponse(400, 'Missing name');

    const existingCategories = readFile(FILE_NAME_CATEGORIES);
    const newOrder = existingCategories.length;

    const newCategory = {
      id: e.parameter.id || Utilities.getUuid(),
      name: e.parameter.name,
      color: e.parameter.color || '#FFFFFF',
      order: e.parameter.order !== undefined ? Number(e.parameter.order) : newOrder,
    };

    categories.push(newCategory);
    writeFile(FILE_NAME_CATEGORIES, categories);
    return successResponse(201, newCategory);
  }

  if (method === 'update') {
    if (!e.parameter.id) return errorResponse(400, 'Missing id');
    if (!e.parameter.patch) return errorResponse(400, 'Missing patch');

    const idx = categories.findIndex(cat => String(cat.id) === String(e.parameter.id));
    if (idx === -1) {
      return errorResponse(404, 'Not found: Category with id ' + e.parameter.id + ' not found');
    }

    let patch;
    try {
      patch = JSON.parse(e.parameter.patch);
    } catch (error) {
      return errorResponse(400, 'Invalid patch JSON: ' + error.toString());
    }

    // Убеждаемся, что order всегда число
    if (patch.order !== undefined) {
      patch.order = Number(patch.order);
    }

    categories[idx] = { ...categories[idx], ...patch };
    writeFile(FILE_NAME_CATEGORIES, categories);
    return successResponse(200, categories[idx]);
  }

  if (method === 'delete') {
    if (!e.parameter.id) return errorResponse(400, 'Missing id');

    const tierListItems = readFile(FILE_NAME_TIER_LIST_ITEMS);
    const itemsToUpdate = tierListItems.filter(item => String(item.category_id) === String(e.parameter.id));

    const filtered = categories.filter(cat => String(cat.id) !== String(e.parameter.id));
    if (filtered.length === categories.length) {
      return errorResponse(404, 'Not found: Category with id ' + e.parameter.id + ' not found');
    }

    itemsToUpdate.forEach(item => {
      item.category_id = null;
      item.order = 0;
    });

    writeFile(FILE_NAME_CATEGORIES, filtered);
    writeFile(FILE_NAME_TIER_LIST_ITEMS, tierListItems);
    return successResponse(204, null);
  }

  return errorResponse(400, 'Unsupported method: ' + method);
}

function handleCategoriesRequestPost(body, method) {
  const categories = readFile(FILE_NAME_CATEGORIES);

  if (method === 'create') {
    if (!body.name) return errorResponse(400, 'Missing name');

    const existingCategories = readFile(FILE_NAME_CATEGORIES);
    const newOrder = existingCategories.length;

    const newCategory = {
      id: body.id || Utilities.getUuid(),
      name: body.name,
      color: body.color || '#FFFFFF',
      order: body.order !== undefined ? Number(body.order) : newOrder,
    };

    categories.push(newCategory);
    writeFile(FILE_NAME_CATEGORIES, categories);
    return successResponse(201, newCategory);
  }

  if (method === 'update') {
    if (!body.id || !body.patch) return errorResponse(400, 'Missing id or patch');
    const idx = categories.findIndex(cat => String(cat.id) === String(body.id));
    if (idx === -1) return errorResponse(404, 'Not found');
    categories[idx] = { ...categories[idx], ...body.patch };
    writeFile(FILE_NAME_CATEGORIES, categories);
    return successResponse(200, categories[idx]);
  }

  if (method === 'delete') {
    if (!body.id) return errorResponse(400, 'Missing id');

    const tierListItems = readFile(FILE_NAME_TIER_LIST_ITEMS);
    const itemsToUpdate = tierListItems.filter(item => String(item.category_id) === String(body.id));

    const filtered = categories.filter(cat => String(cat.id) !== String(body.id));
    if (filtered.length === categories.length) return errorResponse(404, 'Not found');

    itemsToUpdate.forEach(item => {
      item.category_id = null;
      item.order = 0;
    });

    writeFile(FILE_NAME_CATEGORIES, filtered);
    writeFile(FILE_NAME_TIER_LIST_ITEMS, tierListItems);
    return successResponse(204, null);
  }

  return errorResponse(400, 'Unsupported method');
}

function handleTierListItemsRequest(e, method) {
  const items = readFile(FILE_NAME_TIER_LIST_ITEMS);

  if (method === 'read' || !method) {
    // Создаем копию массива перед сортировкой, чтобы не изменять оригинал
    const sorted = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
    return successResponse(200, sorted);
  }

  if (method === 'create') {
    if (!e.parameter.link_id) return errorResponse(400, 'Missing link_id');

    const linkId = String(e.parameter.link_id);
    const existingItem = items.find(item => String(item.link_id) === linkId);
    if (existingItem) {
      return successResponse(200, existingItem);
    }

    const categoryId = e.parameter.category_id || null;
    const itemsInCategory = items.filter(item => 
      item.category_id === categoryId || (categoryId === null && item.category_id === null)
    );
    const newOrder = itemsInCategory.length;

    const newItem = {
      id: e.parameter.id || Utilities.getUuid(),
      link_id: linkId,
      category_id: categoryId,
      order: e.parameter.order !== undefined ? Number(e.parameter.order) : newOrder,
    };

    items.push(newItem);
    writeFile(FILE_NAME_TIER_LIST_ITEMS, items);
    return successResponse(201, newItem);
  }

  if (method === 'update') {
    if (!e.parameter.id) return errorResponse(400, 'Missing id');
    if (!e.parameter.patch) return errorResponse(400, 'Missing patch');

    const idx = items.findIndex(item => String(item.id) === String(e.parameter.id));
    if (idx === -1) {
      return errorResponse(404, 'Not found: TierListItem with id ' + e.parameter.id + ' not found');
    }

    let patch;
    try {
      patch = JSON.parse(e.parameter.patch);
    } catch (error) {
      return errorResponse(400, 'Invalid patch JSON: ' + error.toString());
    }

    // Обработка category_id: если передана пустая строка, устанавливаем null
    if (patch.category_id === '' || patch.category_id === 'null') {
      patch.category_id = null;
    } else if (patch.category_id !== undefined && patch.category_id !== null) {
      patch.category_id = String(patch.category_id);
    }

    items[idx] = { ...items[idx], ...patch };
    writeFile(FILE_NAME_TIER_LIST_ITEMS, items);
    return successResponse(200, items[idx]);
  }

  if (method === 'delete') {
    if (!e.parameter.id) return errorResponse(400, 'Missing id');
    const filtered = items.filter(item => String(item.id) !== String(e.parameter.id));
    if (filtered.length === items.length) {
      return errorResponse(404, 'Not found: TierListItem with id ' + e.parameter.id + ' not found');
    }
    writeFile(FILE_NAME_TIER_LIST_ITEMS, filtered);
    return successResponse(204, null);
  }

  if (method === 'updateorder') {
    if (!e.parameter.category_id && e.parameter.category_id !== '') return errorResponse(400, 'Missing category_id');
    if (!e.parameter.orders) return errorResponse(400, 'Missing orders');
    
    let orders;
    try {
      orders = JSON.parse(e.parameter.orders);
    } catch (error) {
      return errorResponse(400, 'Invalid orders JSON: ' + error.toString());
    }
    
    const categoryId = e.parameter.category_id === '' ? null : String(e.parameter.category_id);
    let updatedCount = 0;
    
    // Обновляем order для всех элементов в категории
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemCategoryId = item.category_id === null ? null : String(item.category_id);
      
      // Проверяем, относится ли элемент к нужной категории
      if (itemCategoryId === categoryId) {
        const itemId = String(item.id);
        if (orders.hasOwnProperty(itemId)) {
          items[i].order = Number(orders[itemId]);
          updatedCount++;
        }
      }
    }
    
    if (updatedCount === 0) {
      return errorResponse(404, 'No items found in category to update');
    }
    
    writeFile(FILE_NAME_TIER_LIST_ITEMS, items);
    return successResponse(200, { updated: updatedCount });
  }

  return errorResponse(400, 'Unsupported method: ' + method);
}

function handleTierListItemsRequestPost(body, method) {
  const items = readFile(FILE_NAME_TIER_LIST_ITEMS);

  if (method === 'create') {
    if (!body.link_id) return errorResponse(400, 'Missing link_id');

    const linkId = String(body.link_id);
    const existingItem = items.find(item => String(item.link_id) === linkId);
    if (existingItem) {
      return successResponse(200, existingItem);
    }

    const categoryId = body.category_id || null;
    const itemsInCategory = items.filter(item => 
      item.category_id === categoryId || (categoryId === null && item.category_id === null)
    );
    const newOrder = itemsInCategory.length;

    const newItem = {
      id: body.id || Utilities.getUuid(),
      link_id: linkId,
      category_id: categoryId,
      order: body.order !== undefined ? Number(body.order) : newOrder,
    };

    items.push(newItem);
    writeFile(FILE_NAME_TIER_LIST_ITEMS, items);
    return successResponse(201, newItem);
  }

  if (method === 'update') {
    if (!body.id || !body.patch) return errorResponse(400, 'Missing id or patch');
    const idx = items.findIndex(item => String(item.id) === String(body.id));
    if (idx === -1) return errorResponse(404, 'Not found');
    
    const patch = { ...body.patch };
    // Обработка category_id: если передана пустая строка, устанавливаем null
    if (patch.category_id === '' || patch.category_id === 'null') {
      patch.category_id = null;
    } else if (patch.category_id !== undefined && patch.category_id !== null) {
      patch.category_id = String(patch.category_id);
    }
    
    items[idx] = { ...items[idx], ...patch };
    writeFile(FILE_NAME_TIER_LIST_ITEMS, items);
    return successResponse(200, items[idx]);
  }

  if (method === 'delete') {
    if (!body.id) return errorResponse(400, 'Missing id');
    const filtered = items.filter(item => String(item.id) !== String(body.id));
    if (filtered.length === items.length) return errorResponse(404, 'Not found');
    writeFile(FILE_NAME_TIER_LIST_ITEMS, filtered);
    return successResponse(204, null);
  }

  return errorResponse(400, 'Unsupported method');
}

