import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../../assets/css/BlogPage.css'; // Assuming your extracted CSS is here.

const BlogContainer = ({ blog }) => {
  // Function to strip HTML tags from content (Quill content is HTML)
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };
  
  // Utility to handle image paths
  const getImageUrl = (imagePath) => {
    const API = import.meta.env.VITE_API_URL;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return `${API}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`; 
  };
  
  const imageUrl = blog.images && blog.images.length > 0 
    ? getImageUrl(blog.images[0])
    : '/path/to/default-image.jpg'; 

  // Determine badge style
  const badgeClass = blog.authorType === 'doctor' ? 'bg-success' : 'bg-primary';
  const badgeText = blog.authorType === 'doctor' ? 'Doctor' : 'User';

  return (
    <div className="blog-container" data-theme={blog.theme}>
      <div className="header">{blog.title}</div>
      <div className="theme">Theme: {blog.theme}</div>
      <div className="author">
        <small>By {blog.authorName}</small>
        <span className={`badge ${badgeClass}`}>{badgeText}</span>
      </div>
      <div className="image-container">
        <img src={imageUrl} alt="Blog Image" />
      </div>
      <div className="content">
        {/* Strip HTML, truncate to 100 characters, and add ellipsis */}
        <p>{stripHtml(blog.content).substring(0, 100)}...</p>
      </div>
      <Link to={`/blog/${blog._id}`} className="read-more">Read More</Link>
    </div>
  );
};

const BlogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [blogs, setBlogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    currentFilter: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentFilter = searchParams.get('filter') || 'all';
  const currentPage = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const API = import.meta.env.VITE_API_URL;
        const url = `${API}/blog?filter=${currentFilter}&page=${currentPage}`;
        
        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // This relies on the backend returning JSON data (see Backend Changes section)
        const data = await response.json(); 
        
        setBlogs(data.blogs || []);
        setPagination({
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          hasPreviousPage: data.hasPreviousPage,
          hasNextPage: data.hasNextPage,
          currentFilter: data.currentFilter,
        });

      } catch (err) {
        console.error('Error fetching blogs:', err);
        setError('Failed to fetch blog data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [currentFilter, currentPage]); 

  /* cross positioning not applied here (restoring original behavior) */

  // Position the cross button below the visible site header so it never overlaps.
  // Mirrors the fix used in PostBlog.jsx — computes header bottom and sets inline top
  useEffect(() => {
    const getCross = () => document.getElementById('cross');
    const getHeader = () => document.querySelector('header');

    function updateCross() {
      const c = getCross();
      const h = getHeader();
      if (!c || !h) return;
      const headerBottom = Math.ceil(h.getBoundingClientRect().bottom);
      const gap = 10; // pixels of spacing under header
      c.style.top = `${headerBottom + gap}px`;
    }

    // call on load
    updateCross();
    // keep in sync on resize and scroll (header may change position/height)
    window.addEventListener('resize', updateCross);
    window.addEventListener('scroll', updateCross, { passive: true });
    return () => {
      window.removeEventListener('resize', updateCross);
      window.removeEventListener('scroll', updateCross);
    };
  }, []);

  const createLink = (filter, page) => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (page !== 1) params.set('page', page);
    return `/blog?${params.toString()}`;
  };

  const themeLinks = [
    { label: 'All', filter: 'all' },
    { label: 'GENERAL HYGIENE TIPS', filter: 'GENERAL HYGIENE TIPS' },
    { label: 'PREVENTIVE MEASURES', filter: 'PREVENTIVE MEASURES' },
    { label: 'DISEASES AND CONDITIONS', filter: 'DISEASES AND CONDITIONS' },
    { label: 'CHRONIC DISEASES', filter: 'CHRONIC DISEASES' },
    { label: 'INFECTIOUS DISEASES', filter: 'INFECTIOUS DISEASES' },
  ];

  if (loading) return <p className="loading-message">Loading blogs...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="blog-page-container">
      <main className="main">
        <div className="blog-heading">
          <div className="logo-content">
            <div className="our-blog">
              <div 
                id="cross" 
                className="blog-cross-btn" 
                onClick={() => window.history.back()}
              >
                <i className="fa-solid fa-xmark"></i>
              </div>
              <h2 className="heading-logo-content">Our Blogs</h2>
              <p>
                Welcome to MediQuick Blog, your trusted guide for straightforward, expert advice on nutrition, fitness, and wellness.
                Discover practical tips and engaging content designed to empower your health journey.
                Make informed choices with our science-backed insights.
                Live healthier, one step at a time.
                Join our community for a vibrant, balanced lifestyle.
              </p>
            </div>
          </div>
          <div className="blog-nav">
            <ul id="blog-nav-items">
              {themeLinks.map((item) => (
                <li className="blog-nav-item" key={item.filter}>
                  <Link 
                    className={`blog-nav-link ${currentFilter === item.filter ? 'active' : ''}`}
                    to={createLink(item.filter, 1)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Link to="/blog/post" className="post-button">
            Post Blog
          </Link>
        </div>

        <div className="blog-section">
          {blogs.length > 0 ? (
            blogs.map(blog => <BlogContainer key={blog._id} blog={blog} />)
          ) : (
            <p className="no-blogs">No blogs found for this filter.</p>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination-wrapper">
            <div className="pagination-container">
              <nav aria-label="Blog pagination">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${!pagination.hasPreviousPage ? 'disabled' : ''}`}>
                    <Link 
                      className="page-link"
                      to={createLink(currentFilter, currentPage - 1)}
                      tabIndex={!pagination.hasPreviousPage ? -1 : 0}
                      aria-disabled={!pagination.hasPreviousPage}
                    >
                      Previous
                    </Link>
                  </li>

                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <li key={i + 1} className={`page-item ${i + 1 === currentPage ? 'active' : ''}`}>
                      <Link
                        className="page-link"
                        to={createLink(currentFilter, i + 1)}
                      >
                        {i + 1}
                      </Link>
                    </li>
                  ))}

                  <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                    <Link 
                      className="page-link"
                      to={createLink(currentFilter, currentPage + 1)}
                      tabIndex={!pagination.hasNextPage ? -1 : 0}
                      aria-disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogPage;