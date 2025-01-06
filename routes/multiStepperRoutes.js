const express = require("express");
const router = express.Router();
const mockController = require("../controllers/multiController");
const verifyJWT = require("../middleware/verifyJWT");
const { uploadPhoto } = require("../middleware/uploadImage");

router.post(
  "/",
  uploadPhoto.fields([
    { name: "Exam[icon]", maxCount: 1 },
    { name: "Test[icon]", maxCount: 1 },
  ]),
  mockController.createMockDetails
);

router.get("/", mockController.getAllMockDetails);

module.exports = router;
