exports.getHome = (req, res) => {
    res.render('home_page');
};

exports.getAbout = (req, res) => {
    res.render('about_us');
};

exports.getContact = (req, res) => {
    res.render('contactus');
};

exports.getFaqs = (req, res) => {
    res.render('FAQS');
};

exports.getTerms = (req, res) => {
    res.render('terms_conditions');
};

exports.getPrivacy = (req, res) => {
    res.render('privacy_policy');
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
    res.render('error', {
        message: 'Test error message',
        redirect: '/'
    });
};