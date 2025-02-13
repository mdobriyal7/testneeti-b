const templateRoutes = require('./routes/templateRoutes');

// ... other middleware ...

// Update route registration
// Old: app.use('/api/test-series', templateRoutes);
// New: app.use('/api', templateRoutes); 