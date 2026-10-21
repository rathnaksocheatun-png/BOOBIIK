const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

// Paths
const DATA_DIR = path.join(__dirname, 'server');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');

// Default settings
const DEFAULT_SETTINGS = {
  logo: { type: 'image', url: 'image.png', text: 'Boo Biik' },
  khqr: { url: '' },
  banners: [
    { id: 'b1', url: '', title: 'Boo Biik SMM Marketing' },
    { id: 'b2', url: '', title: 'Fast & High Quality Followers' },
    { id: 'b3', url: '', title: '24/7 Support Service' }
  ],
  contacts: {
    telegram: 'https://t.me/zicksiik',
    messenger: 'https://www.facebook.com/share/1JGKSdBJtm/?mibextid=wwXIfr'
  },
  services: [
    {
      id: 's1',
      platform: 'facebook',
      category: 'Follower',
      name: 'Facebook Follower High Quality',
      ratePer1000: 2.50,
      min: 100,
      max: 50000,
      description: 'អ្នក Follow លឿនរហ័ស ធានាគុណភាពខ្ពស់ មិនធ្លាក់'
    },
    {
      id: 's2',
      platform: 'tiktok',
      category: 'Like KH',
      name: 'TikTok Likes Real KH Accounts',
      ratePer1000: 1.20,
      min: 100,
      max: 100000,
      description: 'Like គណនីខ្មែរពិតៗ បង្កើន Engagement លឿន'
    },
    {
      id: 's3',
      platform: 'tiktok',
      category: 'View KH',
      name: 'TikTok Video Views KH',
      ratePer1000: 0.10,
      min: 1000,
      max: 1000000,
      description: 'ចំនួនមើលវីដេអូ លឿនទាន់ចិត្ត'
    },
    {
      id: 's4',
      platform: 'tiktok',
      category: 'Follower KH',
      name: 'TikTok Followers KH Real',
      ratePer1000: 3.50,
      min: 100,
      max: 20000,
      description: 'អ្នកតាមដានខ្មែរ គុណភាពខ្ពស់'
    },
    {
      id: 's5',
      platform: 'telegram',
      category: 'Member Real Acc Channel/Group',
      name: 'Telegram Real Members Channel/Group',
      ratePer1000: 3.00,
      min: 100,
      max: 30000,
      description: 'សមាជិកតេឡេក្រាម គណនីពិត'
    },
    {
      id: 's6',
      platform: 'telegram',
      category: 'Post View',
      name: 'Telegram Post Views',
      ratePer1000: 0.15,
      min: 500,
      max: 500000,
      description: 'ចំនួនមើល Post តេឡេក្រាម លឿនរហ័ស'
    },
    {
      id: 's7',
      platform: 'telegram',
      category: 'Poll Vote',
      name: 'Telegram Poll Votes',
      ratePer1000: 1.80,
      min: 50,
      max: 10000,
      description: 'ការបោះឆ្នោត Poll Telegram'
    }
  ]
};

// Safe JSON helpers
function readJSON(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return JSON.parse(JSON.stringify(defaultValue));
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return JSON.parse(JSON.stringify(defaultValue));
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// Initialize data
function initData() {
  readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
  readJSON(ORDERS_FILE, []);
  if (!fs.existsSync(ADMINS_FILE)) {
    const hash = crypto.createHash('sha256').update('Socheat992008@').digest('hex');
    writeJSON(ADMINS_FILE, { admin: { passwordHash: hash } });
  }
}
initData();

// Simple hash compare
function verifyPassword(password) {
  const admins = readJSON(ADMINS_FILE, {});
  if (!admins.admin || !admins.admin.passwordHash) return false;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return hash === admins.admin.passwordHash;
}

// Parse multipart form data for file uploads
function parseMultipart(req, callback) {
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return callback(new Error('Not multipart'));
  }
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return callback(new Error('No boundary'));

  let rawData = Buffer.alloc(0);
  req.on('data', chunk => { rawData = Buffer.concat([rawData, chunk]); });
  req.on('end', () => {
    const parts = [];
    const delimiter = Buffer.from('--' + boundary);
    let start = rawData.indexOf(delimiter);
    while (start !== -1) {
      let end = rawData.indexOf(delimiter, start + delimiter.length);
      if (end === -1) break;
      const part = rawData.slice(start + delimiter.length, end);
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = part.slice(0, headerEnd).toString();
        const body = part.slice(headerEnd + 4, part.length - 2); // remove trailing \r\n
        const nameMatch = header.match(/name="([^"]+)"/);
        const filenameMatch = header.match(/filename="([^"]+)"/);
        parts.push({
          name: nameMatch ? nameMatch[1] : '',
          filename: filenameMatch ? filenameMatch[1] : null,
          header,
          body
        });
      }
      start = end;
    }
    callback(null, parts);
  });
}

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// CORS headers
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
}

// Auth middleware
function requireAdmin(req, res) {
  const pass = req.headers['x-admin-password'];
  if (!pass || !verifyPassword(pass)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Invalid or missing admin password' }));
    return false;
  }
  return true;
}

// Parse JSON body
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      callback(null, JSON.parse(body));
    } catch (e) {
      callback(e);
    }
  });
}

// Parse query string
function parseQuery(urlStr) {
  const qIdx = urlStr.indexOf('?');
  if (qIdx === -1) return {};
  const params = {};
  urlStr.slice(qIdx + 1).split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return params;
}

// Router
const server = http.createServer((req, res) => {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // API: Get public settings
  if (urlPath === '/api/settings' && req.method === 'GET') {
    const settings = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: settings }));
    return;
  }

  // API: Admin login
  if (urlPath === '/api/admin/login' && req.method === 'POST') {
    parseBody(req, (err, body) => {
      if (err || !body.password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Password required' }));
        return;
      }
      if (verifyPassword(body.password)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Login successful' }));
      } else {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid password' }));
      }
    });
    return;
  }

  // API: Get admin settings
  if (urlPath === '/api/admin/settings' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    const settings = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: settings }));
    return;
  }

  // API: Update full settings
  if (urlPath === '/api/admin/settings' && req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    parseBody(req, (err, body) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        return;
      }
      const current = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
      if (body.logo) current.logo = body.logo;
      if (body.khqr) current.khqr = body.khqr;
      if (body.banners) current.banners = body.banners;
      if (body.contacts) current.contacts = body.contacts;
      if (body.services) current.services = body.services;
      if (writeJSON(SETTINGS_FILE, current)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: current }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Failed to save settings' }));
      }
    });
    return;
  }

  // API: Get admin orders
  if (urlPath === '/api/admin/orders' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    const orders = readJSON(ORDERS_FILE, []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: orders }));
    return;
  }

  // API: Create order (public)
  if (urlPath === '/api/orders' && req.method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        return;
      }
      const { customer_name, customer_link, platform, category_name, service_name, quantity, total_price } = body;
      if (!customer_name || !customer_link || !platform || !service_name || !quantity || total_price == null) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
        return;
      }
      const orders = readJSON(ORDERS_FILE, []);
      const newOrder = {
        order_id: body.order_id || ('BB-' + Math.floor(100000 + Math.random() * 900000)),
        customer_name: String(customer_name).trim(),
        customer_link: String(customer_link).trim(),
        platform: String(platform),
        category_name: String(category_name || ''),
        service_name: String(service_name),
        quantity: parseInt(quantity) || 0,
        total_price: parseFloat(total_price) || 0,
        created_at: new Date().toISOString(),
        payment_status: 'Awaiting Payment Verification',
        order_status: 'Pending'
      };
      orders.unshift(newOrder);
      if (writeJSON(ORDERS_FILE, orders)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: newOrder }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Failed to save order' }));
      }
    });
    return;
  }

  // API: Update order status
  if (urlPath.startsWith('/api/admin/orders/') && urlPath.endsWith('/status') && req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    const orderId = urlPath.split('/')[4];
    parseBody(req, (err, body) => {
      const orders = readJSON(ORDERS_FILE, []);
      const order = orders.find(o => o.order_id === orderId);
      if (!order) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Order not found' }));
        return;
      }
      if (body.payment_status) order.payment_status = body.payment_status;
      if (body.order_status) order.order_status = body.order_status;
      writeJSON(ORDERS_FILE, orders);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: order }));
    });
    return;
  }

  // API: Delete order
  if (urlPath.startsWith('/api/admin/orders/') && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const orderId = urlPath.split('/')[4];
    let orders = readJSON(ORDERS_FILE, []);
    const originalLength = orders.length;
    orders = orders.filter(o => o.order_id !== orderId);
    if (orders.length === originalLength) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Order not found' }));
      return;
    }
    writeJSON(ORDERS_FILE, orders);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Order deleted' }));
    return;
  }

  // API: Upload image
  if (urlPath === '/api/admin/upload' && req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    parseMultipart(req, (err, parts) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Upload parse error' }));
        return;
      }
      const filePart = parts.find(p => p.filename);
      if (!filePart) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No file uploaded' }));
        return;
      }
      const ext = path.extname(filePart.filename) || '.png';
      const filename = 'img-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, filePart.body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { url: '/uploads/' + filename } }));
    });
    return;
  }

  // Static files: uploads
  if (urlPath.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, urlPath.replace('/uploads/', ''));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  // Static files: public
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!path.extname(filePath)) filePath += '.html';

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Boo Biik server running at http://localhost:${PORT}`);
});
