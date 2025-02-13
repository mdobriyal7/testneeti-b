class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthenticationError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
    this.status = 401;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
    this.status = 403;
    Error.captureStackTrace(this, this.constructor);
  }
}

class DatabaseError extends Error {
  constructor(message = "Database operation failed") {
    super(message);
    this.name = "DatabaseError";
    this.status = 500;
    Error.captureStackTrace(this, this.constructor);
  }
}

class CacheError extends Error {
  constructor(message = "Cache operation failed") {
    super(message);
    this.name = "CacheError";
    this.status = 500;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BusinessLogicError extends Error {
  constructor(message) {
    super(message);
    this.name = "BusinessLogicError";
    this.status = 422;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper function to handle async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error response formatter
const formatError = (error) => {
  return {
    error: error.message,
    type: error.name,
    status: error.status || 500,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  };
};

module.exports = {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  CacheError,
  BusinessLogicError,
  catchAsync,
  formatError,
};
