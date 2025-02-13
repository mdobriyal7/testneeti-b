const express = require('express');
const router = express.Router();
const {
    importTestSettings,
    getTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate
} = require('../controllers/TestTemplateController');

// Remove testSeriesId from routes since we can get it through sectionId
// Old: /test-series/:testSeriesId/sections/:sectionId/templates
// New: /sections/:sectionId/templates

// Import test settings to create template
router.post('/sections/:sectionId/templates/import', importTestSettings);

// Get all templates for a section
router.get('/sections/:sectionId/templates', getTemplates);

// Get, update, delete specific template
router.get('/templates/:templateId', getTemplate);
router.patch('/templates/:templateId', updateTemplate);
router.delete('/templates/:templateId', deleteTemplate);

module.exports = router; 