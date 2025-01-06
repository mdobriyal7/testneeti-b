require("dotenv").config();
require("express-async-errors");
const express = require("express");
const app = express();
const path = require("path");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const connectDB = require("./config/dbConn");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3500;

// console.log(process.env.NODE_ENV)

connectDB();

app.use(logger);

app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use("/", express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/root"));
app.use(`${process.env.API_ROOT_URL}/auth`, require("./routes/authRoutes"));
app.use(`${process.env.API_ROOT_URL}/users`, require("./routes/userRoutes"));
app.use(`${process.env.API_ROOT_URL}/exams`, require("./routes/ExamRoutes"));
app.use(
  `${process.env.API_ROOT_URL}/courses`,
  upload.none(),
  require("./routes/CourseRoutes")
);
app.use(`${process.env.API_ROOT_URL}/tests`, require("./routes/TestRoutes"));

app.use(
  `${process.env.API_ROOT_URL}/mock`,
  require("./routes/multiStepperRoutes")
);
app.use(
  `${process.env.API_ROOT_URL}/testSeries`,
  require("./routes/testSeriesRoute")
);
app.use(
  `${process.env.API_ROOT_URL}/test-papers`,
  require("./routes/testPaperRoutes")
);

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorHandler);

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
