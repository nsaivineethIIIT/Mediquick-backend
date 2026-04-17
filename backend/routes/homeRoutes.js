const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.getHome);
router.get('/about', homeController.getAbout);
router.get('/faqs', homeController.getFaqs);
router.get('/contact', homeController.getContact);
router.get('/terms', homeController.getTerms);
router.get('/privacy', homeController.getPrivacy);
router.get('/logout', homeController.getLogout);
router.get('/test-error', homeController.getTestError);

module.exports = router;