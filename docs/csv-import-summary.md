# CSV Import API for Question Papers - Summary

## Overview

The CSV Import API allows users to import questions from CSV files into question papers in the TestNeeti platform. This feature supports organizing questions into multiple sections, making it easy to create structured question papers from external data sources.

## Key Features

1. **Multi-Section Support**
   - Import questions into multiple sections in a single API call
   - Organize questions by section title or section index
   - Specify custom duration for each section
   - Add questions to existing sections or create new ones

2. **Enhanced Validation**
   - Comprehensive validation of required fields
   - Validation of correct option indices
   - Validation of section indices and titles
   - Detailed error messages for invalid data

3. **Intelligent Section Handling**
   - Questions with the same section title are grouped together
   - Questions can be added to specific sections by index
   - Default section handling for questions without section information
   - Automatic creation of new sections when needed

4. **Bilingual Support**
   - Support for both English and Hindi content
   - Import questions, options, and explanations in multiple languages
   - Automatic language detection and configuration

5. **Error Handling**
   - Comprehensive error handling with detailed error messages
   - Transaction-based operations to ensure data consistency
   - Rollback on error to prevent partial imports

## Implementation Details

The CSV import functionality is implemented using a MongoDB transaction to ensure data consistency. The process follows these steps:

1. Validate the incoming data
2. Find or create the question paper
3. Group questions by section
4. Process each section group
5. Update section metadata
6. Save the question paper
7. Return a detailed response with section information

## API Documentation

For detailed API documentation, see [CSV Import API Documentation](./csv-import-api.md).

## Client Integration

The frontend application provides a user-friendly interface for importing CSV files, with features like:

- CSV template download
- Drag and drop file upload
- Preview of imported questions
- Validation feedback
- Section organization options

This makes it easy for users to import questions from external sources and organize them into structured question papers. 