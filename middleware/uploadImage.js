// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("cloudinary").v2;

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key:process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true);
//   } else {
//     cb({ message: "Unsupported file format" }, false);
//   }
// };

// // Set up multer and cloudinary for image uploading
// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//   folder: "mock/products",
//   allowedFormats: ["jpg", "png","svg"],
//   transformation: [{ width: 500, height: 500, crop: "limit" }],
// });

// const parser = multer({ storage: storage, fileFilter: multerFilter, });

// module.exports = parser;

const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const sharp = require("sharp");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "ecommerce/products",
  allowedFormats: ["jpg", "png", "svg"],
  transformation: [{ width: 500, height: 500, crop: "limit" }],
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb({ message: "Unsupported file format" }, false);
  }
};

const uploadPhoto = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: { fileSize: 1000000 }, // 1MB file size limit
});

const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "uploads", resource_type: "auto" }, // Set Cloudinary folder and resource type
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url); // Return the Cloudinary URL
          }
        }
      )
      .end(file.buffer);
  });
};

const productImgResize = async (req, res, next) => {
  if (!req.files) return next();

  await Promise.all(
    req.files.map(async (file) => {
      try {
        // Resize the image using sharp
        const resizedImageBuffer = await sharp(file.buffer)
          .resize(300, 300)
          .toBuffer();

        // Upload the resized image to Cloudinary
        const imageUrl = await uploadToCloudinary({
          buffer: resizedImageBuffer,
          originalname: file.originalname,
        });
        // Now imageUrl contains the Cloudinary URL where the resized image is stored.
      } catch (error) {
        // Handle any errors that occurred during image processing or Cloudinary upload.
        console.error("Error processing and uploading to Cloudinary:", error);
      }
    })
  );

  next();
};

module.exports = { uploadPhoto, productImgResize };
