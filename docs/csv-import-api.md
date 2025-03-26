# CSV Import API for Question Papers

This API allows importing questions from CSV files into question papers, with support for organizing questions into multiple sections.

## Endpoint

```
POST /api/test-series/:testSeriesId/sections/:sectionId/question-papers/import-csv
```

## Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| testSeriesId | String | ID of the test series |
| sectionId | String | ID of the section within the test series |

## Request Body

```json
{
  "paperId": "60a1b2c3d4e5f6g7h8i9j0k1",
  "questions": [
    {
      "type": "mcq",
      "useDefaultMarks": false,
      "negMarks": 0.25,
      "posMarks": 1,
      "skipMarks": 0,
      "content": {
        "en": {
          "value": "What is the capital of France?",
          "solution": "Paris is the capital of France",
          "options": [
            { "prompt": "", "value": "Paris" },
            { "prompt": "", "value": "London" },
            { "prompt": "", "value": "Berlin" },
            { "prompt": "", "value": "Madrid" }
          ]
        },
        "hi": {
          "value": "फ्रांस की राजधानी क्या है?",
          "solution": "पेरिस फ्रांस की राजधानी है",
          "options": [
            { "prompt": "", "value": "पेरिस" },
            { "prompt": "", "value": "लंदन" },
            { "prompt": "", "value": "बर्लिन" },
            { "prompt": "", "value": "मैड्रिड" }
          ]
        }
      },
      "isComprehension": false,
      "correctAnswer": 0,
      "SSNo": 1,
      "SSSNo": 1,
      "QSNo": 1,
      "isComplete": true,
      "sectionTitle": "General Knowledge",
      "sectionDuration": 60
    },
    {
      "type": "mcq",
      "useDefaultMarks": false,
      "negMarks": 0.5,
      "posMarks": 2,
      "skipMarks": 0,
      "content": {
        "en": {
          "value": "Based on the passage, what is the main theme?",
          "comp": "<p>Science is the systematic study of the natural world through observation and experiment. Scientists use the scientific method to gather data, formulate hypotheses, and draw conclusions. The scientific method involves making observations, asking questions, forming hypotheses, conducting experiments, analyzing data, and drawing conclusions. This methodical approach has led to countless discoveries and advancements in our understanding of the universe.</p>",
          "solution": "The passage clearly discusses scientific concepts",
          "options": [
            { "prompt": "", "value": "Nature" },
            { "prompt": "", "value": "Technology" },
            { "prompt": "", "value": "History" },
            { "prompt": "", "value": "Science" }
          ]
        }
      },
      "isComprehension": true,
      "correctAnswer": 3,
      "SSNo": 1,
      "SSSNo": 5,
      "QSNo": 1,
      "isComplete": true,
      "sectionTitle": "Reading Comprehension",
      "sectionDuration": 45
    },
    {
      "type": "mcq",
      "useDefaultMarks": false,
      "negMarks": 0.5,
      "posMarks": 2,
      "skipMarks": 0,
      "content": {
        "en": {
          "value": "According to the passage, what is the scientific method used for?",
          "comp": "<p>Science is the systematic study of the natural world through observation and experiment. Scientists use the scientific method to gather data, formulate hypotheses, and draw conclusions. The scientific method involves making observations, asking questions, forming hypotheses, conducting experiments, analyzing data, and drawing conclusions. This methodical approach has led to countless discoveries and advancements in our understanding of the universe.</p>",
          "solution": "The passage states that scientists use the scientific method to gather data, formulate hypotheses, and draw conclusions",
          "options": [
            { "prompt": "", "value": "Creating theories only" },
            { "prompt": "", "value": "Gathering data only" },
            { "prompt": "", "value": "Formulating hypotheses only" },
            { "prompt": "", "value": "Gathering data and drawing conclusions" }
          ]
        }
      },
      "isComprehension": true,
      "correctAnswer": 3,
      "SSNo": 1,
      "SSSNo": 5,
      "QSNo": 2,
      "isComplete": true,
      "sectionTitle": "Reading Comprehension",
      "sectionDuration": 45
    }
  ]
}
```

### Notes on Request Body

- `paperId`: ID of an existing question paper to add questions to (optional)
  - If provided, questions will be added to this paper
  - If not provided, a new question paper will be created
- `questions`: Array of question objects to import
  - `type`: Question type, typically "mcq" for multiple choice (required)
  - `useDefaultMarks`: Whether to use default marks (optional, default: true)
  - `negMarks`: Negative marks for incorrect answers (optional, default: 0.25)
  - `posMarks`: Positive marks for correct answers (optional, default: 1)
  - `skipMarks`: Marks for skipped questions (optional, default: 0)
  - `content`: Object containing language-specific content (required)
    - `en`: English content (required)
      - `value`: The question text (required)
      - `options`: Array of option objects (required for MCQs)
        - `prompt`: Optional prefix/prompt for the option (usually empty)
        - `value`: The option text (required)
      - `solution`: Explanation for the correct answer (optional)
      - `comp`: Comprehension passage for comprehension questions (required for comprehension questions)
    - `hi`: Hindi content (optional)
      - Same structure as `en`
  - `isComprehension`: Boolean indicating if this is a comprehension question (required)
  - `correctAnswer`: Index of the correct option (0-based) (required)
  - `SSNo`: Section number (required)
  - `SSSNo`: Sub-section number (required)
  - `QSNo`: Question sequence number (required)
  - `isComplete`: Whether the question is complete (required)
  - `sectionTitle`: Title of the section this question belongs to (optional)
  - `sectionDuration`: Duration of the section in minutes (optional)

## Section Handling

The API supports organizing questions into multiple sections in several ways:

1. **By Section ID**: If a question includes a `sectionId`, it will be added directly to the section with that ID.
   - This is the most precise way to target an existing section in the question paper.
   - Useful when you want to ensure questions are added to specific sections without relying on titles or indices.
   - Providing a `sectionId` takes precedence over all other section identification methods.
   - An error will be returned if the section ID doesn't exist in the question paper.

2. **By Section Title**: If a question includes a `sectionTitle`, it will be grouped with other questions that have the same title.
   - If a section with that title already exists in the question paper, questions will be added to it.
   - If no section with that title exists, a new section will be created with the specified title.
   - You can specify a custom duration for the section using `sectionDuration`.

3. **By Section Index**: If a question includes a `sectionIndex`, it will be added to the section at that index in the question paper.
   - If the index is out of range, a new section will be created at that index.
   - This is useful when you want to add questions to sections by their position in the paper.

4. **Default Behavior**: If neither `sectionId`, `sectionTitle`, nor `sectionIndex` is provided:
   - When creating a new paper, questions will be added to a default section called "Imported Section".
   - When updating an existing paper, questions will be added to the first section (index 0).
   
5. **Multiple Sections in One Import**: You can import questions into multiple sections in a single API call by specifying different section identifiers for different questions.
   - This allows you to organize your CSV data by section and import everything at once.
   - Each unique section title or ID will create or update a separate section in the question paper.

## Comprehension Questions

The API supports importing comprehension-type questions:

1. **Comprehension Structure**: A comprehension question consists of a passage and one or more questions related to that passage.
   - Set `isComprehension: true` to indicate a comprehension question
   - Include the passage content in the `content.en.comp` field (HTML formatting is supported)
   - For Hindi support, include the Hindi translation in `content.hi.comp`

2. **Multiple Questions per Passage**: You can have multiple questions referring to the same passage.
   - Include the same passage text in the `comp` field of each question that refers to it
   - The backend will optimize storage by grouping questions with identical passages

3. **HTML Support**: Both passages support HTML formatting.
   - You can include formatting, lists, tables, images, etc.
   - The content will be rendered as HTML in the question paper

4. **Important Note**: Comprehension questions are a question type, not a section type.
   - Questions with `isComprehension: true` can be placed in any section alongside regular MCQs
   - You can use `sectionTitle` to specify which section the comprehension question belongs to
   - A section (like "Reading Comprehension") can contain multiple comprehension questions with different passages

## Response

### Success Response

```json
{
  "success": true,
  "message": "Successfully imported 10 questions across 3 sections",
  "questionPaper": {
    "_id": "60a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Imported Paper - 2023-04-15",
    "questionCount": 10,
    "sectionCount": 3,
    "sections": [
      {
        "title": "General Knowledge",
        "questionCount": 4,
        "maxMarks": 4
      },
      {
        "title": "Mathematics",
        "questionCount": 3,
        "maxMarks": 6
      },
      {
        "title": "Reasoning",
        "questionCount": 3,
        "maxMarks": 3
      }
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Failed to import questions from CSV",
  "error": "Error message details"
}
```

## Behavior

1. If `paperId` is provided:
   - The API will find the existing question paper
   - Validate that it belongs to the specified section
   - Group questions by section title or index
   - Add questions to existing sections or create new sections as needed
   - Update question counts and max marks for each affected section

2. If `paperId` is not provided:
   - The API will create a new question paper
   - Create sections based on the section titles in the imported questions
   - Add the paper to the test series section

## Example Usage

### Using cURL

```bash
curl -X POST \
  http://localhost:5000/api/test-series/60a1b2c3d4e5f6g7h8i9j0k1/sections/60a1b2c3d4e5f6g7h8i9j0k2/question-papers/import-csv \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d '{
    "questions": [
      {
        "text": "What is the capital of France?",
        "options": [
          { "text": "Paris" },
          { "text": "London" },
          { "text": "Berlin" },
          { "text": "Madrid" }
        ],
        "correctOption": 0,
        "explanation": "Paris is the capital of France",
        "marks": 1,
        "negativeMarks": 0.25,
        "sectionTitle": "General Knowledge",
        "sectionDuration": 45
      },
      {
        "text": "What is 2+2?",
        "options": [
          { "text": "3" },
          { "text": "4" },
          { "text": "5" },
          { "text": "6" }
        ],
        "correctOption": 1,
        "explanation": "2+2=4",
        "marks": 2,
        "negativeMarks": 0.5,
        "sectionTitle": "Mathematics",
        "sectionDuration": 60
      }
    ]
  }'
```

### Using JavaScript Fetch API

```javascript
const response = await fetch('/api/test-series/60a1b2c3d4e5f6g7h8i9j0k1/sections/60a1b2c3d4e5f6g7h8i9j0k2/question-papers/import-csv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({
    paperId: "60a1b2c3d4e5f6g7h8i9j0k1", // Optional - if provided, questions will be added to this paper
    questions: [
      {
        text: "What is the capital of France?",
        options: [
          { text: "Paris" },
          { text: "London" },
          { text: "Berlin" },
          { text: "Madrid" }
        ],
        correctOption: 0,
        explanation: "Paris is the capital of France",
        marks: 1,
        negativeMarks: 0.25,
        sectionTitle: "General Knowledge"
      },
      {
        text: "What is 2+2?",
        options: [
          { text: "3" },
          { text: "4" },
          { text: "5" },
          { text: "6" }
        ],
        correctOption: 1,
        explanation: "2+2=4",
        marks: 2,
        negativeMarks: 0.5,
        sectionTitle: "Mathematics"
      },
      {
        text: "Based on the passage, what is the main theme?",
        options: [
          { text: "Nature" },
          { text: "Technology" },
          { text: "History" },
          { text: "Science" }
        ],
        correctOption: 3,
        explanation: "The passage clearly discusses scientific concepts",
        marks: 2,
        negativeMarks: 0.5,
        isComprehension: true,
        passage: "<p>Science is the systematic study of the natural world through observation and experiment. Scientists use the scientific method to gather data, formulate hypotheses, and draw conclusions.</p>",
        sectionTitle: "Reading Comprehension"
      },
      {
        text: "According to the passage, what is the scientific method used for?",
        options: [
          { text: "Creating theories only" },
          { text: "Gathering data only" },
          { text: "Formulating hypotheses only" },
          { text: "Gathering data and drawing conclusions" }
        ],
        correctOption: 3,
        explanation: "The passage states that scientists use the scientific method to gather data, formulate hypotheses, and draw conclusions",
        marks: 2,
        negativeMarks: 0.5,
        isComprehension: true,
        passage: "<p>Science is the systematic study of the natural world through observation and experiment. Scientists use the scientific method to gather data, formulate hypotheses, and draw conclusions.</p>",
        sectionTitle: "Reading Comprehension"
      }
    ]
  })
});

const data = await response.json();
console.log(data);
``` 