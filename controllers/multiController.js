const Exam = require("../models/ExamCategory");
const Phases = require("../models/ExamPhases");
const Test = require("../models/TestChoices");
const Section = require("../models/SectionSchema");
// const Parser = require("../middleware/uploadImage");
const mongoose = require("mongoose");

// const createMockDetails = async (req, res) => {
//   console.log(req.files);
//   try {
//     const { examType, testType, paperType, sections } = req.body;
// const examIconPath =
//   req.files && req.files["examIcon"] ? req.files["examIcon"][0].path : "";
//     const testIconPath =
//       req.files && req.files["testIcon"] ? req.files["testIcon"][0].path : "";

//     // Check if all required fields exist
//     if (!examType || !testType || !paperType || !sections) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Find or create ExamCategory
//     let exam = await Exam.findOne({ name: examType }).populate({
//       path: "tests",
//       populate: {
//         path: "phases",
//         populate: {
//           path: "uniqueSectionID",
//         },
//       },
//     });

//     if (!exam) {
//       // Create new ExamCategory if not found
//       exam = await Exam.create({ name: examType, icon: examIconPath });
//     }

//     let test = exam.tests.find((t) => t.name === testType);
//     if (!test) {
//       // Create new TestChoices if not found
//       test = await Test.create({ name: testType, icon: testIconPath });
//       exam.tests.push(test._id);
//     }

//     let phase = test.phases.find((p) => p.name === paperType);
//     if (!phase) {
//       // Create new ExamPhases if not found
//       phase = await Phases.create({ name: paperType });
//       test.phases.push(phase._id);
//     }

// const createdSections = [];

// for (const sectionData of sections) {
//   if (sectionData.name) {
//     let existingSection = null;

//     const sectionArray = await Section.findById(phase.uniqueSectionID);
//     console.log(sectionArray);
//     if (sectionArray) {
//       existingSection = sectionArray.sections.find(
//         (section) => section.name === sectionData.name
//       );
//     }

//     if (existingSection) {
//       existingSection.duration = sectionData.duration;
//       existingSection.negativeMarking = sectionData.negativeMarking;
//       existingSection.noOfQuestions = sectionData.noOfQuestions;
//       existingSection.noOfOptions = sectionData.noOfOptions;
//       await sectionArray.save();
//     } else if (!existingSection && phase.uniqueSectionID) {
//       sectionArray.sections.push(sectionData);
//       await sectionArray.save();
//     } else {
//       const newSection = await Section.create({ sections: [sectionData] });
//       phase.uniqueSectionID = newSection._id;
//       await newSection.save();
//       createdSections.push(newSection);
//     }
//   }
// }

//     // Save the phase
//     await phase.save();

//     // Save the test
//     await test.save();

//     // Save the exam
//     await exam.save();

//     res.status(201).json({ message: "Mock test created successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to create mock test" });
//   }
// };

const createMockDetails = async (req, res) => {
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    console.log(req.body);
    console.log(req.files);
    const {
      Exam: examData,
      Test: testData,
      Phase: phaseData,
      Sections: section,
    } = req.body;

    let exam, test, phase;
    // const examIconPath = examData.id = 'null'? null:req.files['Exam[icon]'][0].path;
    // const testIconPath = testData.id = 'null'? null:req.files['Test[icon]'][0].path;

    // Log the file paths to the console
    // console.log("Exam Icon Path:", examIconPath);
    // console.log("Test Icon Path:", testIconPath);

    // Create or update Exam
    if (examData.id !== "null") {
      console.log(examData.id);
      exam = await Exam.findById(examData.id);
      console.log(exam);
    } else {
      exam = new Exam({
        name: examData.name,
        icon: req.files["Exam[icon]"][0].path,
      });
    }

    // Create or update Test
    if (testData.id !== "null") {
      test = await Test.findById(testData.id);
    } else {
      // testIconUrl = await uploadImage(testData.icon);
      test = new Test({
        name: testData.name,
        icon: req.files["Test[icon]"][0].path,
        phases: [],
      });
      exam.tests.push(test._id);
    }

    console.log(test);

    // Create or update Phase
    if (phaseData.id !== "null") {
      phase = await Phases.findById(phaseData.id);
    } else {
      phase = new Phases({
        name: phaseData.name,
        icon: req.files["Test[icon]"][0].path,
      });
      test.phases.push(phase._id);
    }

    console.log(phase);

    const createdSections = [];

    for (const sectionData of section) {
      if (sectionData.name) {
        let existingSection = null;

        const sectionArray = await Section.findById(phase.uniqueSectionID);
        console.log(sectionArray);
        if (sectionArray) {
          existingSection = sectionArray.sections.find(
            (section) => section.name === sectionData.name
          );
        }

        if (existingSection) {
          existingSection.duration = sectionData.duration;
          existingSection.negativeMarking = sectionData.negativeMarking;
          existingSection.noOfQuestions = sectionData.noOfQuestions;
          existingSection.noOfOptions = sectionData.noOfOptions;
          await sectionArray.save();
        } else if (!existingSection && phase.uniqueSectionID) {
          sectionArray.sections.push(sectionData);
          await sectionArray.save();
        } else {
          const newSection = await Section.create({ sections: [sectionData] });
          phase.uniqueSectionID = newSection._id;
          await newSection.save();
          createdSections.push(newSection);
        }
      }
    }

    await phase.save();
    await test.save();
    await exam.save();

    await session.commitTransaction();

    res
      .status(201)
      .json({ message: "Mock test created or updated successfully" });
  } catch (error) {
    console.error(error);

    // If there is an error, abort the transaction
    await session.abortTransaction();

    // Handle the error, including any necessary cleanup
    // if (examIconUrl) {
    //   // Handle the cleanup of exam icon using your custom middleware
    //   // Example: await cleanupImage(examIconUrl);
    // }
    // if (testIconUrl) {
    //   // Handle the cleanup of test icon using your custom middleware
    //   // Example: await cleanupImage(testIconUrl);
    // }

    res.status(500).json({ error: "Failed to create or update mock test" });
  } finally {
    session.endSession(); // Always end the session.
  }
};

const getAllMockDetails = async (req, res) => {
  try {
    const exams = await Exam.find({}).populate({
      path: "tests",
      populate: {
        path: "phases",
        populate: {
          path: "uniqueSectionID",
        },
      },
    });

    res.status(200).json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve mock details" });
  }
};

module.exports = { createMockDetails, getAllMockDetails };
