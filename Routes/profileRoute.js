const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const getUser = require("../Middleware/getUser");
const Profile = require("../Models/Profile");

const router = express.Router();
require("dotenv").config();


// ommiting this feature because of vercel don't allow read/write event in serverless 
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, '../upload/'));
//   },
//   filename: (req, file, cb) => {
//     const filename = file.originalname.split('.')[0];
//     const timestamp = Date.now();
//     const extension = file.originalname.split('.').slice(-1)[0]; 
//     const newFilename = `${filename}_${timestamp}.${extension}`;
//     cb(null, newFilename); 
//   },
// });

const upload = multer();

router.post("/profile", getUser, upload.single("picture"), async (req, res) => {
  try {
    const userId = req.user.id;
    const profile_img = req.file.buffer;

    const user = await Profile.findOne({userid:userId}).select(
      "-password -name -email"
    );

    if (!user) {
      const newUser = new Profile({
        profile_img: profile_img,
        userid: userId,
      });
      await newUser.save();

      return res.status(200).json({
        error: false,
        message: "Profile image uploaded successfully",
      });
    }

    // for deleting the old profile image
    // if (user.profile_img && fs.existsSync(user.profile_img)) {
    //   fs.unlink(user.profile_img, (err) => {
    //     if (err) {
    //       return res
    //         .status(400)
    //         .json({ error: true, message: "Error Deleting file" });
    //     }
    //   });
    // }

    console.log(profile_img);
    // Update user's profile image path in the database
    user.profile_img = profile_img || undefined;
    await user.save();

    return res.status(200).json({
      error: false,
      message: "Profile image uploaded successfully",
    });
  } catch (error) {
    console.log("production error", error)
    return res
      .status(500)
      .json({ error: true, message: `Internal server errors ${error}`});
  }
});


module.exports = router;