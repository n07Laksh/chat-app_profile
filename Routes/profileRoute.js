const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const getUser = require("../Middleware/getUser");
const Profile = require("../Models/Profile");
const url = require("url");

const router = express.Router();
require("dotenv").config();

const { Upload } = require("@aws-sdk/lib-storage");
const { S3 } = require("@aws-sdk/client-s3");

const reg = process.env.REGION;
const accKey = process.env.ACCESS_KEY;
const secAccKey = process.env.SECRET_ACCESS_KEY;

// Set the region and credentials
const s3 = new S3({
  region: reg,

  credentials: {
    accessKeyId: accKey,
    secretAccessKey: secAccKey,
  },
});

// usign tmp folder for serverless (vercel || cyclic)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/tmp");
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

    const user = await Profile.findOne({ userid: userId }).select(
      "-password -name -email"
    );

    // Delete existing profile image if it exists
    if (user && user.profile_img) {
      await deleteProfileImage(user.profile_img);
    }

    // Upload the image to AWS S3
    const encodedFileName = encodeURIComponent(req.file.originalname);
    const uploadParams = {
      Bucket: "userprofileimgbucket",
      Key: `profile_images/${userId}_${encodedFileName}`,
      Body: fs.createReadStream(req.file.path),
    };

    const data = await new Upload({
      client: s3,
      params: uploadParams,
    }).done();

    if (!user) {
      const newUser = new Profile({
        profile_img: data.Location,
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

async function deleteProfileImage(imageUrl) {
  try {
    const decodedFileName = decodeURIComponent(imageUrl.split("/").pop());
    const deleteKey = "profile_images/" + decodedFileName;
    const params = {
      Bucket: "userprofileimgbucket",
      Key: deleteKey,
    };

    await s3.deleteObject(params);
  } catch (error) {
    throw new Error("Failed to delete profile image");
  }
}

module.exports = router;
