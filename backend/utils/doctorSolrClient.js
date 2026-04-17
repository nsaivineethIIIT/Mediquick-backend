const http = require('http');
const https = require('https');
const url = require('url');

const SOLR_URL = process.env.SOLR_URL || 'http://localhost:8983';
const SOLR_CORE = 'medicines';

class DoctorSolrClient {
  constructor() {
    this.baseUrl = SOLR_URL;
    this.core = SOLR_CORE;
    this.ready = false;
    this.init();
  }

  async init() {
    try {
      const exists = await this.coreExists();
      if (!exists) {
        this.ready = false;
        console.warn('⚠️ Doctor Solr core is not ready yet');
        return;
      }
      this.ready = true;
      console.log('✅ Doctor Solr core is ready');
    } catch (err) {
      console.warn('⚠️ Doctor Solr initialization issue:', err.message);
      this.ready = false;
    }
  }

  async ensureReady() {
    if (this.ready) return true;
    await this.init();
    return this.ready;
  }

  async coreExists() {
    return new Promise((resolve) => {
      const reqUrl = `${this.baseUrl}/solr/admin/cores?action=STATUS&core=${this.core}&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const req = client.request({
        method: 'GET',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
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

  async clear() {
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify({ delete: { query: '*:*' } });
      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const req = client.request({
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
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

  async deleteByQuery(query) {
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify({ delete: { query } });
      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const req = client.request({
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
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

  async indexDocuments(docs) {
    if (!docs.length) return false;
    if (!(await this.ensureReady())) return false;

    return new Promise((resolve) => {
      const body = JSON.stringify(docs);
      const reqUrl = `${this.baseUrl}/solr/${this.core}/update?commit=true&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const req = client.request({
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 15000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const ok = response?.responseHeader?.status === 0;
            if (!ok) {
              console.warn('⚠️ Doctor Solr index failed:', response?.error?.msg || data);
            }
            resolve(ok);
          } catch (e) {
            console.warn('⚠️ Doctor Solr index parse failed:', e.message);
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

  async search(query, filters = {}, start = 0, rows = 10) {
    if (!(await this.ensureReady())) return { docs: [], numFound: 0 };

    return new Promise((resolve) => {
      const fq = ['entityType_s:doctor', 'isApproved_b:true'];
      if (filters.specialization) {
        fq.push(`specialization_s:"${filters.specialization}"`);
      }
      if (filters.onlineStatus) {
        fq.push(`onlineStatus_s:"${filters.onlineStatus}"`);
      }

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

      const qf = encodeURIComponent('search_text_t name_s^4 specialization_s^3 location_s^2 registrationNumber_s^2');
      const fqString = fq.map((item) => `&fq=${encodeURIComponent(item)}`).join('');
      const reqUrl = `${this.baseUrl}/solr/${this.core}/select?defType=edismax&q=${encodeURIComponent(searchQuery)}&qf=${qf}&start=${start}&rows=${rows}${fqString}&wt=json`;
      const parsedUrl = url.parse(reqUrl);
      const client = reqUrl.startsWith('https') ? https : http;

      const req = client.request({
        method: 'GET',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const rawDocs = response?.response?.docs || [];
            const docs = rawDocs.map((doc) => ({
              id: doc.id,
              name: doc.name_s,
              specialization: doc.specialization_s,
              location: doc.location_s,
              consultationFee: doc.consultationFee_f,
              profilePhoto: doc.profilePhoto_s,
              onlineStatus: doc.onlineStatus_s,
              registrationNumber: doc.registrationNumber_s,
              isApproved: doc.isApproved_b
            }));
            resolve({ docs, numFound: response?.response?.numFound || 0 });
          } catch (e) {
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

  isReady() {
    return this.ready;
  }
}

module.exports = new DoctorSolrClient();
