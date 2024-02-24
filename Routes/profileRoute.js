const express = require("express");
const multer = require("multer");
const fs = require("fs");
const getUser = require("../Middleware/getUser");
const Profile = require("../Models/Profile");

const router = express.Router();
require("dotenv").config();

const { Upload } = require("@aws-sdk/lib-storage"); // sdk s3 version 3
const { S3 } = require("@aws-sdk/client-s3");  // sdk s3 version 3

const reg = process.env.REGION;
const accKey = process.env.ACCESS_KEY;
const secAccKey = process.env.SECRET_ACCESS_KEY;

// Set the region and credentials for IAM User
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


// endpoint for upload profile picture or update using POST method route /chatapp/user/profileimg/profile
router.post("/profile", getUser, upload, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await Profile.findOne({ userid: userId }).select(
      "profile_img"
    );

    // Delete existing profile image from aws bucket if it's exist
    if (user && user.profile_img) {
      await deleteProfileImage(user.profile_img);
    }

    // Upload the image to AWS S3
    const encodedFileName = encodeURIComponent(req.file.originalname); // encode for handle filename space
    const uploadParams = {
      Bucket: "userprofileimgbucket", // aws s3 bucket name
      Key: `profile_images/${userId}_${encodedFileName}`,  // image will be saved with this key in the Bucketname/profile_images/filename.extention
      Body: fs.createReadStream(req.file.path), // incoming file from user FormData
    };

    const data = await new Upload({
      client: s3,
      params: uploadParams,
    }).done();

    if (!user) { // create new user with required fields
      const newUser = new Profile({
        profile_img: data.Location,
        userid: userId,
      });
      await newUser.save();
    } else { // update the profile image of existing user
      user.profile_img = data.Location;
      await user.save();
    }

    return res.status(200).json({
      error: false,
      message: "Profile image uploaded successfully",
      imageUrl: data.Location, // Return the image URL to the client
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: `Internal server errors ${error}` });
  }
});

// endpoint for get profile picture using GET method route /chatapp/user/profileimg/fetchprofileimg
router.get("/fetchprofileimg", getUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await Profile.findOne({ userid: userId }).select(
      "profile_img"
    );
    if (!user)
      return res.status(400).json({
        error: true,
        message: "Please use the correct Credehehentials",
      });

    if (user && !user.profile_img) {
      return res
        .status(200)
        .json({ error: false, message: "Profile image not available" });
    }

    return res.status(200).json({
      img: user.profile_img,
      message: "Image fetch successfully",
    });
  } catch (error) {
    return res.status(400).json({ error: true, message: error.message });
  }
});

//endpoint for delete profile picture using DELETE method route /chatapp/user/profileimg/removeimage
router.delete("/removeimage", getUser, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await Profile.findOne({ userid: userId }).select(
      "profile_img" // only select the profile_img field
    );

    // Check if the user exists
    if (!user) {
      return res.status(400).json({ error: true, message: "User not found" });
    }

    // Delete existing profile image if it exists
    if (user.profile_img) {
      await deleteProfileImage(user.profile_img);
      user.profile_img = ""; // Clear profile_img field in user document
      await user.save(); // and then save it
    }

    return res
      .status(200)
      .json({ error: false, message: "Profile image removed successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal sever error" });
  }
});


// reusable function for delete the bucket item from aws s3 bucket
async function deleteProfileImage(imageUrl) {
  try {
    const decodedFileName = decodeURIComponent(imageUrl.split("/").pop()); // decode the encode name for handle filename space
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
