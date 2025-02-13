const mongoose = require('mongoose');
const { ValidationError } = require('../utils/errors');

const validateObjectId = (req, res, next, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            error: `Invalid ${req.params.path} format`
        });
    }
    next();
};

module.exports = {
    validateObjectId
}; 