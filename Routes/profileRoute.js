const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const getUser = require("../Middleware/getUser");
const Profile = require("../Models/Profile");

const router = express.Router();
require("dotenv").config();

const AWS = require("aws-sdk");

// Set the region and credentials
const s3 = new AWS.S3({
  region: "us-east-1",
  accessKeyId: "AKIAXB6F253CJ3NH7M57",
  secretAccessKey: "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",
});

// ommiting this feature because of vercel don't allow read/write event in serverless
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./temp");
  },
  filename: (req, file, cb) => {
    const filename = file.originalname.split(".")[0];
    const timestamp = Date.now();
    const extension = file.originalname.split(".").slice(-1)[0];
    const newFilename = `${filename}_${timestamp}.${extension}`;
    cb(null, newFilename);
  },
});

const upload = multer({ storage: storage }).single("picture");

router.post("/profile", getUser, upload, async (req, res) => {
  try {
    const userId = req.user.id;

    // Upload the image to AWS S3
    const uploadParams = {
      Bucket: "chatappprofileimg",
      Key: `profile_images/${userId}_${Date.now()}_${req.file.originalname}`,
      Body: fs.createReadStream(req.file.path),
      ACL: "public-read"
    };

    const data = await s3.upload(uploadParams).promise();

    // Delete the local file after uploading to S3
    fs.unlinkSync(req.file.path);

    const user = await Profile.findOne({ userid: userId }).select(
      "-password -name -email"
    );

    if (!user) {
      const newUser = new Profile({
        profile_img: data.Location, // Store the S3 URL instead of the local path
        userid: userId,
      });
      await newUser.save();
    } else {
      user.profile_img = data.Location;
      await user.save();
    }

    return res.status(200).json({
      error: false,
      message: "Profile image uploaded successfully",
      imageUrl: data.Location, // Return the image URL to the client
    });
  } catch (error) {
    console.log("production error", error);
    return res
      .status(500)
      .json({ error: true, message: `Internal server errors ${error}` });
  }
});

module.exports = router;
