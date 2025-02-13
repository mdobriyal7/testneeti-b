const TestSeries = require('../models/TestSeries');
const { NotFoundError, ValidationError } = require('../utils/errors');

const checkTestSeriesAccess = async (req, res, next) => {
    try {
        const { testSeriesId } = req.params;
        
        // Check if test series exists
        const testSeries = await TestSeries.findById(testSeriesId);
        if (!testSeries) {
            throw new NotFoundError('Test series not found');
        }

        // Check if test series is active
        if (!testSeries.isActive) {
            throw new ValidationError('Test series is not active');
        }

        // Add test series to request for later use
        req.testSeries = testSeries;
        next();
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    checkTestSeriesAccess
}; 