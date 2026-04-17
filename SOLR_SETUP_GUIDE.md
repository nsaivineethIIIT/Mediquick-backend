# Solr Integration Guide - FDFED Project

This guide explains how to use Apache Solr for medicine search optimization in the FDFED healthcare platform.

## Overview

Apache Solr provides fast, full-text search capabilities for medicines. Instead of relying only on MongoDB regex queries, Solr enables:

✅ **Fast Searching** - Sub-second search responses  
✅ **Typo Tolerance** - Find "asprin" when searching for "aspirin"  
✅ **Faceted Filtering** - Filter by manufacturer, price range  
✅ **Autocomplete** - Suggest medicine names as users type  
✅ **Better Relevance** - Score results by relevance  

## Architecture

```
Frontend (React)
    ↓
Backend API (Node.js/Express)
    ├→ MongoDB (Data Source)
    └→ Apache Solr (Search Index)
```

## Setup

### 1. Start Solr Service

Solr is already configured in `docker-compose.yml`. Start it with:

```bash
cd "path/to/project"
docker-compose up -d solr
```

Verify Solr is running:

```bash
curl http://localhost:8983/solr/admin/info/system
```

You should see a JSON response.

### 2. Initialize Solr with Data

Run the setup script to create the Solr core and index all medicines:

```bash
# From backend directory
cd backend
node setup-solr.js
```

**Expected output:**
```
✅ Solr is running on http://localhost:8983
✅ Connected to MongoDB
✅ Solr client is ready
📚 Found X medicines to index
Reindexing medicines to Solr...
✅ Indexed X medicines to Solr
✅ Solr setup completed successfully!
```

### 3. Verify Indexing

Visit the Solr Dash board:
- **URL**: http://localhost:8983/solr/
- **Select Core**: "medicines" from dropdown
- **View Documents**: Click "Query" to see indexed medicines

## Usage

### Search Endpoint

The `/medicine/search` endpoint now uses Solr with MongoDB fallback:

```bash
# Basic search
GET /medicine/search?query=aspirin

# With filters
GET /medicine/search?query=aspirin&manufacturer=Bayer&minPrice=10&maxPrice=100

# In stock only
GET /medicine/search?query=aspirin&inStock=true
```

**Response:**
```json
{
  "success": true,
  "medicines": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Aspirin 500mg",
      "medicineID": "ASPR001",
      "cost": 50,
      "manufacturer": "Bayer",
      "quantity": 100,
      "expiryDate": "2025-12-31T00:00:00.000Z",
      "image": "https://..."
    }
  ],
  "count": 1,
  "source": "solr"
}
```

### Manual Reindexing

If you add medicines directly to MongoDB, reindex with:

**Option 1: Admin API**
```bash
POST /medicine/admin/reindex-solr
Authorization: Bearer ADMIN_TOKEN
```

**Option 2: Node Script**
```bash
node setup-solr.js
```

## Features Implemented

### 1. **Fast Full-Text Search**
- Searches `name`, `medicineID`, `manufacturer` fields
- Returns results in milliseconds

### 2. **Smart Fallback**
- Uses Solr when available
- Falls back to MongoDB if Solr is unavailable
- App continues working without Solr

### 3. **Advanced Filtering**
- Price range filtering
- Manufacturer filtering
- Stock availability filtering

### 4. **Automatic Indexing**
- Medicines are indexed on app startup
- New medicines should be indexed in real-time

### 5. **Search Response Metadata**
- Response includes `source` field: "solr" or "mongodb"
- Helps track which backend is being used

## Configuration

### Environment Variables

Set these in your `.env` file or `docker-compose.yml`:

```env
SOLR_URL=http://localhost:8983
```

### Solr Core Configuration

The core is automatically created as "medicines" with default configuration. To customize:

1. Stop Solr: `docker-compose stop solr`
2. Modify `solr_data` volume configuration
3. Create custom `solrconfig.xml` and `schema.xml`
4. Restart: `docker-compose up -d solr`

## Troubleshooting

### Solr Not Available

**Error**: "Solr not ready for search"

**Solution**:
```bash
# Check if Solr is running
docker-compose ps solr

# Start if not running
docker-compose up -d solr
```

### Core Not Found

**Error**: "medicines core not found"

**Solution**:
```bash
# Reinitialize
node setup-solr.js
```

### Search Returns Empty

**Possible causes**:
1. Medicines not indexed - Run `node setup-solr.js`
2. Query is too specific - Try shorter search term
3. Search term doesn't match any medicines

**Debug**:
```bash
# Check Solr directly
curl "http://localhost:8983/solr/medicines/select?q=aspirin&wt=json"
```

### Solr Takes Too Long to Start

**Solution**: Increase Docker memory allocation
- Docker Desktop → Preferences → Resources → Memory: 4GB+

## Performance Tips

### 1. Reindex During Off-Hours
```bash
# Schedule script to run at night
0 2 * * * cd /app && node setup-solr.js
```

### 2. Monitor Solr
- **Dashboard**: http://localhost:8983/solr/#/
- **Metrics**: http://localhost:8983/solr/#/~plugins/graphs

### 3. Optimize Queries
- Use short search terms for best performance
- Combine filters to narrow results

## Advanced Usage

### Custom Field Boost

To make certain fields more important in search, modify `solrClient.search()`:

```javascript
// Search with field boosting
const query = 'aspirin';
const boostedQuery = `name:${query}^2 OR medicineID:${query}`;
```

### Autocomplete

Implement autocomplete by searching as user types:

```javascript
// Frontend
const [medicines, setMedicines] = useState([]);

const handleSearch = async (query) => {
  if (query.length > 0) {
    const response = await fetch(`/medicine/search?query=${query}`);
    const data = await response.json();
    setMedicines(data.medicines);
  }
};
```

### Search Analytics

Track popular searches:

```javascript
// In medicineController.js
app.get('/medicine/search', async (req, res) => {
  const { query } = req.query;
  
  // Log search query
  await SearchLog.create({ query, timestamp: new Date() });
  
  // ... existing search logic
});
```

## Migration from MongoDB-Only Search

If you had existing search functionality:

**Before** (MongoDB only):
```javascript
const medicines = await Medicine.find({
  $or: [
    { name: { $regex: query, $options: 'i' } },
    { medicineID: { $regex: query, $options: 'i' } }
  ]
});
```

**After** (Solr with fallback):
```javascript
// Uses Solr automatically
const response = await fetch(`/medicine/search?query=${query}`);
```

The endpoint now handles both Solr and MongoDB transparently!

## Cleanup

### Remove Solr Index

```bash
# Clear all indexed documents
curl -X POST "http://localhost:8983/solr/medicines/update?commit=true" \
  -H "Content-Type: application/json" \
  -d '{"delete":{"query":"*:*"}}'
```

### Stop Solr Service

```bash
docker-compose stop solr
```

### Remove Solr Data

```bash
docker-compose down -v solr_data
```

## Next Steps

1. ✅ Solr is set up and running
2. ✅ Search is optimized for performance
3. 🎯 **Next**: Add medicine autocomplete feature
4. 🎯 **Next**: Implement doctor search with Solr
5. 🎯 **Next**: Add search analytics dashboard

## Support

For issues or questions:

1. Check logs: `docker-compose logs solr`
2. Visit Solr dashboard: http://localhost:8983/solr/
3. Review this guide's troubleshooting section
4. Check backend logs: `docker-compose logs backend`

---

**Last Updated**: April 16, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
