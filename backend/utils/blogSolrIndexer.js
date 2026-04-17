const blogSolrClient = require('./blogSolrClient');

const stripHtml = (text = '') => String(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const mapBlogToSolrDoc = (blog) => {
  const plainContent = stripHtml(blog.content || '');
  const primaryImage = Array.isArray(blog.images) && blog.images.length > 0 ? blog.images[0] : '';

  return {
    id: blog._id.toString(),
    entityType_s: 'blog',
    title_s: blog.title || '',
    theme_s: blog.theme || 'Default',
    content_t: plainContent,
    authorName_s: blog.authorName || '',
    authorType_s: blog.authorType || 'user',
    image_s: primaryImage,
    createdAt_dt: blog.createdAt ? new Date(blog.createdAt).toISOString() : new Date().toISOString(),
    search_text_t: [
      blog.title || '',
      blog.theme || '',
      plainContent,
      blog.authorName || ''
    ].join(' ')
  };
};

const reindexAllBlogs = async (BlogModel) => {
  if (!blogSolrClient.isReady()) {
    console.warn('⚠️ Blog Solr not ready, skipping reindex');
    return false;
  }

  const cleared = await blogSolrClient.deleteByQuery('entityType_s:blog');
  if (!cleared) {
    console.warn('⚠️ Could not clear existing blog docs in Solr');
  }

  const blogs = await BlogModel.find({}).sort({ createdAt: -1 }).lean();
  if (!blogs.length) {
    console.log('📝 No blogs found to index');
    return true;
  }

  const docs = blogs.map(mapBlogToSolrDoc);
  const ok = await blogSolrClient.indexDocuments(docs);
  if (ok) {
    console.log(`✅ Reindexed ${docs.length} blogs to Solr`);
  } else {
    console.warn('⚠️ Failed to index blogs to Solr');
  }
  return ok;
};

module.exports = {
  mapBlogToSolrDoc,
  reindexAllBlogs
};
