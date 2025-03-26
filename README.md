# TestNeeti Backend

Backend API for the TestNeeti application.

## Features

- User authentication and authorization
- Course and exam management
- Test series management
- Question paper creation and management
- CSV import for question papers with multi-section support

## CSV Import for Question Papers

The backend now supports importing questions from CSV files into question papers. This feature allows users to:

- Import questions in bulk from a CSV file
- Add questions to an existing question paper or create a new one
- Organize questions into multiple sections with custom durations
- Support for both English and Hindi content
- Validation of CSV data before import
- Transaction-based operations to ensure data consistency

For detailed API documentation, see [CSV Import API Documentation](./docs/csv-import-api.md) and [CSV Import Summary](./docs/csv-import-summary.md).

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start the server: `npm start`

## API Documentation

API documentation is available in the `docs` directory.