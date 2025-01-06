const express = require("express");
const router = express.Router();
const testController = require("../controllers/testSeriesController");

router.post("/addTestSeries", testController.addTestSeries);
router.post("/testDoc", testController.addTestDoc);
router.post("/phaseDoc", testController.addPhaseDoc);
router.get("/getTestSeries", testController.getTestSeries);
router.get("/:id", testController.getTestSeriesById);
// router.get ('/getReferenceTest',testController.getRefrenceTest)

module.exports = router;
