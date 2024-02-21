const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const getUser = require("../Middleware/getUser");
const Profile = require("../Models/Profile");

const router = express.Router();
require("dotenv").config();

// Create the upload directory if it doesn't exist
// const uploadDirectory = "./upload";
// if (!fs.existsSync(uploadDirectory)) {
//   fs.mkdirSync(uploadDirectory);
// }

// multer middleware for handling files upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname + Date.now() + ".jpg");
  },
});

const upload = multer({ storage: storage }).single("picture");

router.post("/profile", getUser, upload, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await Profile.findOne({userid:userId}).select(
      "-password -name -email"
    );

    if (!user) {
      const newUser = new Profile({
        profile_img: req.file.path,
        userid: userId,
      });
      await newUser.save();

      return res.status(200).json({
        error: false,
        message: "Profile image uploaded successfully",
      });
    }

    // for deleting the old profile image
    if (user.profile_img && fs.existsSync(user.profile_img)) {
      fs.unlink(user.profile_img, (err) => {
        if (err) {
          return res
            .status(400)
            .json({ error: true, message: "Error Deleting file" });
        }
      });
    }

    // Update user's profile image path in the database
    user.profile_img = req.file.path;
    await user.save();

    return res.status(200).json({
      error: false,
      message: "Profile image uploaded successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" + error  });
  }
});


module.exports = router;