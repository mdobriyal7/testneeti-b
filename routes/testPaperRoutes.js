const express = require("express");
const router = express.Router();
const testPaperController = require("../controllers/testPaperController");

router.post("/", testPaperController.createTestPaper);
router.post("/:testPaperId", testPaperController.uploadQuestion);
router.put("/:id", testPaperController.updateTitle);
router.get("/:id", testPaperController.getTestPaperById);
router.get(
  "/allTestPapers/:testSeriesId",
  testPaperController.getAllTestPapers
);
router.patch("/", testPaperController.updateTestPaper);
router.delete("/:id", testPaperController.deleteTestPaper);

module.exports = router;
// https://www.figma.com/file/Db6kKvK4zgS2L9umWK5DJe/ACE-Absolute?type=design&node-id=62-580&mode=design&t=gdttuta6UZpfoWqY-0
