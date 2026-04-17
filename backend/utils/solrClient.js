const http = require('http');
const https = require('https');
const url = require('url');

// Solr instance configuration
const SOLR_URL = process.env.SOLR_URL || 'http://localhost:8983';
const SOLR_CORE = 'medicines';

class SolrClient {
  constructor() {
    this.baseUrl = SOLR_URL;
    this.core = SOLR_CORE;
    this.ready = false;
    this.init();
  }

  // Initialize Solr and create core if needed
  async init() {
    try {
      // Check if Solr is available
      const existing = await this.coreExists();
      if (existing) {
        this.ready = true;
        console.log('✅ Solr initialized with existing core');
      } else {
        // Create new core
        await this.createCore();
        this.ready = true;
        console.log('✅ Solr initialized with new core');
      }
    } catch (err) {
      console.warn('⚠️  Solr initialization issue:', err.message);
      // Continue without Solr - graceful degradation
    }
  }

  async ensureReady() {
    if (this.ready) return true;
    await this.init();
    return this.ready;
  }

  // Check if core exists
  async coreExists() {
    return new Promise((resolve, reject) => {
      const reqUrl = `${this.baseUrl}/solr/admin/cores?action=STATUS&core=${this.core}`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'GET',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const coreStatus = response?.status ? response.status[this.core] : null;
            const hasCore = Boolean(coreStatus && Object.keys(coreStatus).length > 0);
            resolve(response?.responseHeader?.status === 0 && hasCore);
          } catch (e) {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  // Create core
  async createCore() {
    return new Promise((resolve, reject) => {
      const reqUrl = `${this.baseUrl}/solr/admin/cores?action=CREATE&name=${this.core}&configSet=_default&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'GET',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.responseHeader.status === 0) {
              resolve(true);
            } else {
              reject(new Error(response?.error?.msg || 'Failed to create core'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Solr timeout'));
      });
      req.end();
    });
  }

  // Index a document
  async indexDocument(doc) {
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify([doc]);
      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const ok = response?.responseHeader?.status === 0;
            if (!ok) {
              console.warn('⚠️ Solr indexDocument failed:', response?.error?.msg || data);
            }
            resolve(ok);
          } catch (e) {
            console.warn('⚠️ Solr indexDocument parse failed:', e.message);
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(body);
      req.end();
    });
  }

  // Batch index documents
  async indexDocuments(docs) {
    if (!docs.length) return false;
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify(docs);
      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 15000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const ok = response?.responseHeader?.status === 0;
            if (!ok) {
              console.warn('⚠️ Solr indexDocuments failed:', response?.error?.msg || data);
            }
            resolve(ok);
          } catch (e) {
            console.warn('⚠️ Solr indexDocuments parse failed:', e.message);
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(body);
      req.end();
    });
  }

  // Search documents with fuzzy matching for typo tolerance
  async search(query, filters = {}, start = 0, rows = 20) {
    if (!(await this.ensureReady())) return { docs: [], numFound: 0 };

    return new Promise((resolve) => {
      let fq = [];
      
      // Add filters
      fq.push('entityType_s:medicine');
      if (filters.manufacturer) {
        fq.push(`manufacturer_s:"${filters.manufacturer}"`);
      }
      if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
        fq.push(`cost_f:[${filters.minPrice} TO ${filters.maxPrice}]`);
      }
      if (filters.inStock) {
        fq.push('quantity_i:[1 TO *]');
      }

      const fqString = fq.length > 0 ? '&fq=' + fq.join('&fq=') : '';

      // Build typo-tolerant query with higher fuzziness for longer words.
      const normalized = (query || '').trim();
      const tokens = normalized
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => {
          if (word.length <= 3) return word;
          if (word.length >= 7) return `${word}~2`;
          return `${word}~1`;
        });

      const searchQuery = tokens.length > 0 ? tokens.join(' ') : '*:*';
      const qf = encodeURIComponent('search_text_t name_s^4 medicineID_s^3 manufacturer_s^2');
      const reqUrl = `${this.baseUrl}/solr/${this.core}/select?defType=edismax&q=${encodeURIComponent(searchQuery)}&qf=${qf}&start=${start}&rows=${rows}${fqString}&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'GET',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const rawDocs = response?.response?.docs || [];
            const docs = rawDocs.map((doc) => ({
              id: doc.id,
              name: doc.name_s,
              medicineID: doc.medicineID_s,
              manufacturer: doc.manufacturer_s,
              quantity: doc.quantity_i,
              cost: doc.cost_f,
              expiryDate: doc.expiryDate_dt,
              supplierId: doc.supplierId_s,
              image: doc.image_s
            }));
            const numFound = response.response.numFound || 0;
            resolve({ docs, numFound });
          } catch (e) {
            console.warn('⚠️ Solr search parse failed:', e.message);
            resolve({ docs: [], numFound: 0 });
          }
        });
      });

      req.on('error', () => resolve({ docs: [], numFound: 0 }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ docs: [], numFound: 0 });
      });
      req.end();
    });
  }

  // Delete document
  async deleteDocument(id) {
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify({
        delete: id,
        commitWithin: 1000
      });

      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.responseHeader.status === 0);
          } catch (e) {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(body);
      req.end();
    });
  }

  // Clear all documents
  async clear() {
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify({
        delete: { query: '*:*' },
        commitWithin: 1000
      });

      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.responseHeader.status === 0);
          } catch (e) {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(body);
      req.end();
    });
  }

  async deleteByQuery(query) {
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify({
        delete: { query },
        commitWithin: 1000
      });

      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response?.responseHeader?.status === 0);
          } catch (e) {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(body);
      req.end();
    });
  }

  isReady() {
    return this.ready;
  }
}

// Singleton instance
const solrClient = new SolrClient();

module.exports = solrClient;
