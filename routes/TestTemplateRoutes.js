const express = require("express");
const router = express.Router();
const {
  importTestSettings,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} = require("../controllers/TestTemplateController");

// Base path is /api/v1/test-series

// Templates for a section
router.route('/sections/:sectionId/templates')
  .get(getTemplates)                // GET /api/v1/test-series/sections/:sectionId/templates
  .post(importTestSettings);        // POST /api/v1/test-series/sections/:sectionId/templates

// Individual template operations
router.route('/templates/:templateId')
  .get(getTemplate)                 // GET /api/v1/test-series/templates/:templateId
  .put(updateTemplate)              // PUT /api/v1/test-series/templates/:templateId
  .delete(deleteTemplate);          // DELETE /api/v1/test-series/templates/:templateId

module.exports = router;
