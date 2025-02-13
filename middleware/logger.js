const logger = require("../config/logger");

const logEvents = async (message, logFileName) => {
  logger.info({
    message,
    logFileName,
  });
};

const logMiddleware = (req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
};

module.exports = {
  logger: logMiddleware,
  logEvents,
};
