import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../../assets/css/SingleBlog.css'; // Assuming your extracted CSS is here.

const SingleBlog = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  useEffect(() => {
    const fetchBlog = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/blog/${id}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Blog not found or HTTP error! status: ${response.status}`);
        }
        
        // This relies on the backend returning JSON data (see Backend Changes section)
        const data = await response.json();
        
        setBlog(data); 

      } catch (err) {
        console.error('Error fetching single blog:', err);
        setError(err.message || 'Failed to fetch blog data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading blog post...</div>;
  }

  if (error || !blog) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error || 'Blog post not available.'}</div>;
  }
  
  // Utility to handle relative image paths
  const getImageUrl = (imagePath) => {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const API = import.meta.env.VITE_API_URL;
    return `${API}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  const isSingleImage = blog.images && blog.images.length === 1;
  const isGallery = blog.images && blog.images.length > 1;

  // The EJS logic explicitly checked for 'dietitian' and defaulted to 'User'
  const badgeText = blog.authorType === 'dietitian' ? 'Dietitian' : 'User';
  const isDietitian = blog.authorType === 'dietitian';

  return (
    <>
      <div className="single-blog-wrapper">
        <header>
        <h1 className="animate__animated animate__fadeInDown">{blog.title}</h1>
        {blog.theme && (
          <p className="theme animate__animated animate__fadeInUp">Theme: {blog.theme}</p>
        )}
      </header>

      <main>
        <div className="author-info">
          <p>
            Posted by <span className="author-name">{blog.authorName}</span> <span className="author-email">({blog.authorEmail})</span>
          </p>
          <span 
              className="badge" 
              data-dietitian={isDietitian ? 'true' : undefined}
          >
              {badgeText}
          </span>
        </div>
        
        {/* Image Rendering Logic */}
        {blog.images && blog.images.length > 0 && (
          <>
            {isSingleImage && (
              <div className="single-image animate__animated animate__zoomIn">
                <img src={getImageUrl(blog.images[0])} alt={blog.title} />
              </div>
            )}

            {isGallery && (
              <div className="gallery animate__animated animate__fadeIn">
                {blog.images.map((image, index) => (
                  <div className="gallery-item" key={index}>
                    <img src={getImageUrl(image)} alt={`${blog.title} - Image ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Blog Content: Use dangerouslySetInnerHTML for Quill editor content */}
        <article 
          className="ql-editor animate__animated animate__fadeInUp"
          dangerouslySetInnerHTML={{ __html: blog.content }} 
        />

        <Link to="/blog" className="back-button animate__animated animate__fadeInUp">
          <i className="fas fa-arrow-left"></i> Back to Blog
        </Link>
        </main>
      </div>
    </>
  );
};

export default SingleBlog;