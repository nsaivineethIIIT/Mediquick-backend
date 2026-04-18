const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '..', 'views');

const renderOrFallback = (res, viewName, fallbackPayload) => {
    const viewPath = path.join(viewsDir, `${viewName}.ejs`);

    if (fs.existsSync(viewPath)) {
        return res.render(viewName);
    }

    return res.status(200).json({
        success: true,
        ...fallbackPayload
    });
};

exports.getHome = (req, res) => {
    return renderOrFallback(res, 'home_page', {
        message: 'MediQuick backend is running',
        path: '/'
    });
};

exports.getAbout = (req, res) => {
    return renderOrFallback(res, 'about_us', {
        message: 'About page view is not configured yet',
        path: '/about'
    });
};

exports.getContact = (req, res) => {
    return renderOrFallback(res, 'contactus', {
        message: 'Contact page view is not configured yet',
        path: '/contact'
    });
};

exports.getFaqs = (req, res) => {
    return renderOrFallback(res, 'FAQS', {
        message: 'FAQs page view is not configured yet',
        path: '/faqs'
    });
};

exports.getTerms = (req, res) => {
    return renderOrFallback(res, 'terms_conditions', {
        message: 'Terms page view is not configured yet',
        path: '/terms'
    });
};

exports.getPrivacy = (req, res) => {
    return renderOrFallback(res, 'privacy_policy', {
        message: 'Privacy page view is not configured yet',
        path: '/privacy'
    });
};

exports.getLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err.message);
        }
        res.redirect('/');
    });
};

exports.getTestError = (req, res) => {
    const errorViewPath = path.join(viewsDir, 'error.ejs');

    if (fs.existsSync(errorViewPath)) {
        return res.render('error', {
            message: 'Test error message',
            redirect: '/'
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Test error message'
    });
};