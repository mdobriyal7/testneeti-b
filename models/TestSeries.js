const mongoose = require("mongoose");

const testSeriesSchema = new mongoose.Schema({
  course: { type: String, required: true },
  courseid: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  examCutOffs: {
    overAll: {
      cutOffs: [
        {
          category: { type: String, required: true },
          lowerBound: { type: Number, required: true },
          upperBound: { type: Number, required: true },
        },
      ],
    },
  },
  specificExams: [
    {
      id: { type: String, required: true },
      title: { type: String, required: true },
    },
  ],
  languages: [String],
  instructions: [
    {
      value: { type: String, required: true },
    },
  ],
  isFree: { type: Boolean, default: false },
  createdOn: { type: Date, default: Date.now },
  logo: { type: String },
  sections: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      order: { type: Number, default: 1 },
      shortName: { type: String },
      paidTestCount: { type: Number, default: 0 },
      freeTestCount: { type: Number, default: 0 },
      isPro: { type: Boolean, default: false },
      subsections: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          paidTestCount: { type: Number, default: 0 },
          freeTestCount: { type: Number, default: 0 },
          order: { type: Number, default: 1 },
        },
      ],
    },
  ],
  totalAttempts: { type: Number, default: 0 },
});

const TestSeries = mongoose.model("TestSeries", testSeriesSchema);

module.exports = TestSeries;

// Breakdown of the Data:
// curTime: The current time when this data was retrieved.
// data: Contains detailed information about the mock test.
// details: Includes specific details about the test.
// id: Unique identifier for the mock test.
// name: Name of the mock test series.
// branches: Likely refers to different categories or versions of the test available.
// canPurchaseThrough: Indicates the medium through which the test can be purchased (empty in this case).
// colourHex: A color code associated with the test, possibly for branding or UI themes.
// description: HTML content describing the mock test, its features, and benefits.
// faqs: A list of frequently asked questions related to the mock test.
// features: Key features of the mock test, such as All India Rank, etc.
// freeTestCount: The number of free tests available in this mock test series.
// icon: URL to the icon image for the test.
// id: Redundant or possibly repeated ID for the test.
// isFree: Indicates whether the test is free or paid.
// languages: The languages in which the mock test is available.
// menus: Likely related to UI components (top and side menus).
// name: Name of the mock test series (repeated).
// paidTestCount: The number of paid tests available in this mock test series.
// purchaseInfo: Information on the purchase options available for this test.
// sections: Details about different sections within the mock test.
// seo: SEO-related information for the mock test (e.g., meta titles, descriptions).
// servesFrom: Possibly the location or environment from where the test is served (null in this case).
// showAnalysis: Indicates if performance analysis is available (false in this case).
// showSyllabus: Indicates if the syllabus is shown (true in this case).
// slug: URL-friendly identifier for the test.
// superSections: High-level categories or sections under which this mock test falls.
// target: The specific target exam or exams for which this mock test is designed.
// targetGroup: The broader category of exams (e.g., RBI exams).
// targetSuperGroup: The top-level category of exams (e.g., Banking Exams).
// totalAttempts: The total number of attempts made by students on this mock test.
// updatedOn: The last updated timestamp for this mock test data.
// studentStats: Stats related to the student's interaction with the mock test (e.g., tests attempted).
// accessDetails: Information on whether the student can access the test and their enrollment status.
// selectedBranch: Likely the branch or category of the test selected by the user.
// selectedStage: The stage of the test (e.g., Prelims or Mains).
// stageWiseStats: Stats broken down by stages (null in this case).
// testsAttempted: Number of tests the user has attempted.
// success: Indicates the success of the data retrieval or operation (true in this case).
