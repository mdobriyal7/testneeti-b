pm.collectionVariables.set("base_url", "http://localhost:4000");

// Create Test Series Collection
pm.collections.create({
  info: {
    name: "Test Series API",
    description: "Collection for Test Series and Sections Management",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    // Test Series Routes
    {
      name: "Test Series",
      item: [
        {
          name: "Create Test Series",
          request: {
            method: "POST",
            url: "{{base_url}}/api/test-series",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                // Add your test series creation payload here
              }),
            },
          },
        },
        {
          name: "Get Test Series by ID",
          request: {
            method: "GET",
            url: "{{base_url}}/api/test-series/:id",
          },
        },
        {
          name: "Get Test Series by Course and Exam",
          request: {
            method: "GET",
            url: "{{base_url}}/api/test-series",
          },
        },
        {
          name: "Update Test Series",
          request: {
            method: "PUT",
            url: "{{base_url}}/api/test-series/:id",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
            ],
          },
        },
        {
          name: "Update Student Stats",
          request: {
            method: "PATCH",
            url: "{{base_url}}/api/test-series/:testSeriesId/student/:studentId",
          },
        },
        {
          name: "Bulk Update Test Series",
          request: {
            method: "POST",
            url: "{{base_url}}/api/test-series/bulk-update",
          },
        },
        {
          name: "Delete Test Series",
          request: {
            method: "DELETE",
            url: "{{base_url}}/api/test-series/:id",
          },
        },
        {
          name: "Get Analytics",
          request: {
            method: "GET",
            url: "{{base_url}}/api/test-series/analytics",
          },
        },
      ],
    },
    // Test Series Sections Routes
    {
      name: "Test Series Sections",
      item: [
        {
          name: "Create Section",
          request: {
            method: "POST",
            url: "{{base_url}}/api/test-series/sections",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
              {
                key: "Authorization",
                value: "Bearer {{authToken}}",
              },
            ],
          },
        },
        {
          name: "Add Question Paper to Section",
          request: {
            method: "POST",
            url: "{{base_url}}/api/test-series/sections/:sectionId/question-papers",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
              {
                key: "Authorization",
                value: "Bearer {{authToken}}",
              },
            ],
          },
        },
        {
          name: "Get Section",
          request: {
            method: "GET",
            url: "{{base_url}}/api/test-series/sections/:sectionId",
            header: [
              {
                key: "Authorization",
                value: "Bearer {{authToken}}",
              },
            ],
          },
        },
        {
          name: "Update Section",
          request: {
            method: "PUT",
            url: "{{base_url}}/api/test-series/sections/:sectionId",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
              {
                key: "Authorization",
                value: "Bearer {{authToken}}",
              },
            ],
          },
        },
        {
          name: "Delete Section",
          request: {
            method: "DELETE",
            url: "{{base_url}}/api/test-series/sections/:sectionId",
            header: [
              {
                key: "Authorization",
                value: "Bearer {{authToken}}",
              },
            ],
          },
        },
      ],
    },
  ],
});
