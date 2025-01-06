const Exam = require("../models/ExamCategory");
const Phases = require("../models/ExamPhases");
const Test = require("../models/TestChoices");
const TestSeries = require("../models/TestSeries");

const addTestSeries = async (req, res) => {
  console.log("yes")
  try {
    // Extract data from the request body
    const {
      referenceExamId,
      referenceTestId,
      referencePhaseId,
      testSeriesName,
    } = req.body;

    // Check if a TestSeries with the same name already exists
    const existingTestSeries = await TestSeries.findOne({
      testSeriesName: testSeriesName,
    });

    // If a TestSeries with the same name exists, return an error response
    if (existingTestSeries) {
      return res.status(400).json({ message: "Test Series with the same name already exists" });
    }

    // Create a new TestSeries document
    const testSeries = new TestSeries({
      referenceExamId,
      referenceTestId,
      referencePhaseId,
      testSeriesName,
    });

    // Save the TestSeries document to the database
    const savedTestSeries = await testSeries.save();

    // Return the saved TestSeries document as the API response
    res.status(201).json(savedTestSeries);
  } catch (err) {
    console.error("Error creating TestSeries:", err);
    res.status(500).json({ message: "Failed to create TestSeries" });
  }
};

// Step 2: Controller to create or retrieve the test document
const addTestDoc = async (req, res) => {
  try {
    const { testSeriesId, referenceTest } = req.body;

    // Find the test series document first using the provided testSeriesId
    const existingTestSeries = await TestSeries.findById(testSeriesId).populate(
      {
        path: "referenceTest",
        model: "TestChoices",
      }
    );

    if (!existingTestSeries) {
      // If the test series does not exist, return an error
      return res.status(404).json({ error: "Test series not found" });
    }

    // Check if the test already exists in the test series
    const existingTest = existingTestSeries.referenceTest.find(
      (item) => item._id.toString() === referenceTest
    );

    if (!existingTest) {
      // If the test does not exist, add the new test data to the test series
      existingTestSeries.referenceTest.push(referenceTest);
      await existingTestSeries.save();
    }

    res.json(existingTestSeries);
  } catch (err) {
    console.error("Error creating or retrieving test:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Step 3: Controller to create a phase with the selected `testSeriesName` and `referencePhaseID`
const addPhaseDoc = async (req, res) => {
  try {
    const { testSeriesId, testSeriesName, referencePhaseID } = req.body;

    // Find the test series document first using the provided testSeriesId
    const existingTestSeries = await TestSeries.findById(testSeriesId).populate(
      "referencePhase"
    );

    if (!existingTestSeries) {
      // If the test series does not exist, return an error
      return res.status(404).json({ error: "Test series not found" });
    }

    // Check if the phase already exists in the test series
    const existingPhase = existingTestSeries.referencePhase.find(
      (item) => item.referencePhaseID.toString() === referencePhaseID
    );

    if (!existingPhase) {
      // If the phase does not exist, add the new phase data to the test series
      existingTestSeries.referencePhase.push({
        testSeriesName,
        referencePhaseID,
      });
      await existingTestSeries.save();
    }

    res.json(existingTestSeries);
  } catch (err) {
    console.error("Error creating phase:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getTestSeries = async (req, res) => {
  try {
    const testSeriesData = await TestSeries.find({}).lean();

    // Define an array of paths to populate
    const populatePaths = [
      { path: 'referenceExamId', select: 'name' },
      { path: 'referenceTestId', select: 'name' },
      { path: 'referencePhaseId', select: 'name' },
    ];

    // Populate multiple paths in one go
    await TestSeries.populate(testSeriesData, populatePaths);

    res.json(testSeriesData);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Server error' });
  }
};







const getRefrenceTest = async (req, res) => {
  const { testId } = req.params;

  try {
    // Find the ExamCategory document by the examId and populate the 'tests' field
    const test = await Test.findById(testId);

    if (!examWithTests) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // Send the examWithTests object as the response
    res.json(examWithTests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getTestSeriesById = async (req, res) => {
  console.log("yes")
  const { id } = req.params;

  try {
    const testSeries = await TestSeries.findById(id)
      .populate("referenceExamId")
      .populate("referenceTestId")
      .populate({
        path: "referencePhaseId",
        populate: {
          path: "uniqueSectionID",
          model: "SectionArray", // Replace with the actual model name for uniqueSectionID
        },
      })
      .exec();

    // If TestSeries not found, handle the error
    if (!testSeries) {
      return res.status(404).json({ message: "TestSeries not found." });
    }

    // Now, you have both the parent and child documents fully populated in the testSeries object
    res.json(testSeries);
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(500).json({ message: "Error retrieving TestSeries.", error: error.message });
  }
}

module.exports = {  addTestDoc, addPhaseDoc, getTestSeries,addTestSeries,getTestSeriesById};
