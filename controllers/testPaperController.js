const TestPaper = require("../models/TestPaper");
const TestSeries = require("../models/TestSeries");

// Helper function to format error responses
const sendErrorResponse = (res, statusCode, errorMessage) => {
  console.error(errorMessage);
  res.status(statusCode).json({ success: false, error: errorMessage });
};

// const createTestPaper = async (req, res) => {
//   console.log("no is yes");
//   try {
//     const { title, testSeries } = req.body;
//     // Perform data validation here if required

//     const testSeriesData = await TestSeries.findById(testSeries)
//       .populate({
//         path: "referencePhaseId",
//         populate: {
//           path: "uniqueSectionID", // Assuming 'sections' is the array of sections in the 'SectionArray' model
//           model: "SectionArray",
//         },
//       })
//       .populate("referenceExamId") // Populate the 'referenceExamId' field with data from the 'ExamCategory' model
//       .populate("referenceTestId") // Populate the 'referenceTestId' field with data from the 'TestChoices' model
//       .exec();
//     console.log(testSeriesData);

//     if (
//       !testSeriesData ||
//       !testSeriesData.referenceExamId ||
//       !testSeriesData.referenceTestId ||
//       !testSeriesData.referencePhaseId
//     ) {
//       // Check if any of the required fields are missing or undefined
//       sendErrorResponse(res, 404, "Test series data not found or incomplete.");
//       return;
//     }

//     // Extract section details from the populated result
//     const sections = testSeriesData.referencePhaseId.uniqueSectionID.sections;

//     // Create a new test paper template with the extracted section details
//     const newTestPaper = await TestPaper.create({
//       title,
//       testInfo: {
//         exam: testSeriesData?.referenceExamId?.name || "",
//         test: testSeriesData?.referenceTestId?.name || "",
//         phase: testSeriesData?.referencePhaseId?.name || "",
//       },
//       sections: {},
//     });

//     console.log("newTestPaper.sections before loop", newTestPaper.sections);

//     // Iterate through the sectionsData and populate the 'sections' field correctly
//     sections.forEach((section) => {
//       const sectionName = section.name;
//       newTestPaper.sections.set(sectionName, {
//         sectionName: section.name,
//         questionLimit: section.noOfQuestions,
//         negativeMarking: section.negativeMarking,
//         duration: section.duration,
//         noOfOptions: section.noOfOptions,
//         questions: {}, // Initialize the questions as an empty object
//       });
//     });

//     console.log("newTestPaper.sections after loop", newTestPaper.sections);

//     await newTestPaper.save();

//     // Save the ID of the new test paper in the testPapers array of the corresponding test series
//     testSeriesData.testPapers.push(newTestPaper._id);
//     await testSeriesData.save();

//     res.status(201).json(newTestPaper);
//   } catch (error) {
//     sendErrorResponse(res, 500, "Failed to create the test paper template.");
//   }
// };

const createTestPaper = async (req, res) => {
  console.log("no is yes");
  try {
    const { title, testSeries } = req.body;
    // Perform data validation here if required

    const testSeriesData = await TestSeries.findById(testSeries)
      .populate({
        path: "referencePhaseId",
        populate: {
          path: "uniqueSectionID", // Assuming 'sections' is the array of sections in the 'SectionArray' model
          model: "SectionArray",
        },
      })
      .populate("referenceExamId") // Populate the 'referenceExamId' field with data from the 'ExamCategory' model
      .populate("referenceTestId") // Populate the 'referenceTestId' field with data from the 'TestChoices' model
      .exec();
    console.log(testSeriesData);

    if (
      !testSeriesData ||
      !testSeriesData.referenceExamId ||
      !testSeriesData.referenceTestId ||
      !testSeriesData.referencePhaseId
    ) {
      // Check if any of the required fields are missing or undefined
      sendErrorResponse(res, 404, "Test series data not found or incomplete.");
      return;
    }

    // Extract section details from the populated result
    const sections = testSeriesData.referencePhaseId.uniqueSectionID.sections;
    console.log(testSeriesData?.referenceExamId?.name);

    // Create a new test paper template with the extracted section details
    const newTestPaper = await TestPaper.create({
      title,
      testInfo: {
        exam: testSeriesData?.referenceExamId?.name || "",
        test: testSeriesData?.referenceTestId?.name || "",
        phase: testSeriesData?.referencePhaseId?.name || "",
      },
      sections: sections.map((section) => ({
        sectionName: section.name,
        questionLimit: section.noOfQuestions,
        negativeMarking: section.negativeMarking,
        duration: section.duration,
        noOfOptions: section.noOfOptions,
        questions: [], // Empty questions array for the template
      })),
    });

    // Save the ID of the new test paper in the testPapers array of the corresponding test series
    testSeriesData.testPapers.push(newTestPaper._id);
    await testSeriesData.save();

    res.status(201).json(newTestPaper);
  } catch (error) {
    sendErrorResponse(res, 500, "Failed to create the test paper template.");
  }
};

// const getAllTestPapers = async (req, res) => {
//   try {
//     const testPapers = await TestPaper.find().populate("testSeries", "name");
//     res.status(200).json(testPapers);
//   } catch (error) {
//     sendErrorResponse(res, 500, "Failed to fetch question papers.");
//   }
// };

const getAllTestPapers = async (req, res) => {
  const { testSeriesId } = req.params;

  try {
    const testSeriesData = await TestSeries.findById(testSeriesId)
      .populate([
        {
          path: "testPapers",
          select: "title _id createdAt", // Select the fields you want to include
        },
        {
          path: "referenceTestId",
          select: "name", // Select the fields you want to include for referenceTestId
        },
        {
          path: "referencePhaseId",
          select: "name", // Select the fields you want to include for referencePhaseId
        },
      ])
      .select("testSeriesName testPapers referenceTestId referencePhaseId");

    if (!testSeriesData) {
      return sendErrorResponse(res, 404, "Test series not found.");
    }

    res.status(200).json(testSeriesData);
  } catch (error) {
    sendErrorResponse(res, 500, "Failed to fetch test series.");
  }
};

const getTestPaperById = async (req, res) => {
  try {
    const testPaper = await TestPaper.findById(req.params.id).exec();

    if (!testPaper) {
      return res
        .status(404)
        .json({ success: false, error: "Question paper not found." });
    }
    res.status(200).json({ success: true, data: testPaper });
  } catch (error) {
    sendErrorResponse(res, 500, "Failed to fetch the question paper.");
  }
};

const updateTestPaper = async (req, res) => {
  try {
    const { title, testSeries, questions, referenceQuestionPaper } = req.body;
    // Perform data validation here if required
    const updatedTestPaper = await TestPaper.findByIdAndUpdate(
      req.params.id,
      { title, testSeries, questions, referenceQuestionPaper },
      { new: true }
    ).populate("testSeries", "name");
    if (!updatedTestPaper) {
      return res
        .status(404)
        .json({ success: false, error: "Question paper not found." });
    }
    res.status(200).json({ success: true, data: updatedTestPaper });
  } catch (error) {
    sendErrorResponse(res, 500, "Failed to update the question paper.");
  }
};

const updateTitle = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  try {
    // Find the TestPaper by ID
    const testPaper = await TestPaper.findById(id);

    if (!testPaper) {
      return res.status(404).json({ message: "TestPaper not found" });
    }

    // Update the title
    testPaper.title = title;

    // Save the updated TestPaper
    await testPaper.save();

    return res
      .status(200)
      .json({ message: "Title updated successfully", testPaper });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteTestPaper = async (req, res) => {
  try {
    const testPaperId = req.params.id;
    const { testSeriesId } = req.body;

    // Find the testPaper by its ID to get details
    const deletedTestPaper = await TestPaper.findById(testPaperId);
    console.log("yes", deletedTestPaper);
    if (!deletedTestPaper) {
      return res
        .status(404)
        .json({ success: false, error: "Test paper not found." });
    }

    // Check if a testSeriesId was provided in the request body
    if (testSeriesId) {
      // Remove the testPaper ID from the specified testSeries
      await TestSeries.findByIdAndUpdate(testSeriesId, {
        $pull: { testPapers: testPaperId },
      });
    }

    // Delete the testPaper
    await TestPaper.findByIdAndDelete(testPaperId);

    res.status(200).json({ success: true, data: deletedTestPaper });
  } catch (error) {
    sendErrorResponse(res, 500, "Failed to delete the test paper.");
  }
};

const uploadQuestion = async (req, res) => {
  try {
    const { sectionName, questionNo, question, options, correctOption, marks } =
      req.body;
    const testPaperId = req.params.testPaperId;

    // Find the test paper for the given testPaperId
    const testPaper = await TestPaper.findById(testPaperId).exec();

    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found." });
    }

    // Find the section based on the sectionName provided in the request body
    let section = testPaper.sections.find(
      (section) =>
        section.sectionName.toLowerCase() === sectionName.toLowerCase()
    );

    if (!section) {
      return res
        .status(400)
        .json({ error: `Section with name ${sectionName} not found.` });
    }

    // Check if a question with the same questionNo already exists in the section
    const existingQuestionIndex = section.questions.findIndex(
      (q) => q.questionNo === questionNo
    );

    if (existingQuestionIndex === -1) {
      // If the question with the same questionNo does not exist,
      // create a new question object and push it into the appropriate section
      const newQuestion = {
        questionNo,
        question,
        options,
        correctOption,
        marks,
      };
      section.questions.push(newQuestion);
    } else {
      // If the question with the same questionNo exists
      const existingQuestion = section.questions[existingQuestionIndex];

      // Update translations of the existing question with new translations
      for (const [lang, text] of Object.entries(question)) {
        existingQuestion.question.set(lang, text);
      }

      // Update translations of the existing options with new translations
      for (const [lang, optionsArray] of Object.entries(options)) {
        existingQuestion.options.set(lang, optionsArray);
      }

      for (const [lang, text] of Object.entries(correctOption)) {
        existingQuestion.correctOption.set(lang, text);
      }
      // Update other fields of the existing question
      existingQuestion.marks = marks;
    }

    await testPaper.save();
    res.status(201).json(section);
  } catch (error) {
    console.error("Error uploading question:", error);
    res.status(500).json({ error: "Failed to upload the question." });
  }
};

module.exports = {
  createTestPaper,
  getAllTestPapers,
  getTestPaperById,
  updateTestPaper,
  deleteTestPaper,
  uploadQuestion,
  updateTitle,
};
