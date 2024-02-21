const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    profile_img: String,
    userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Modal = mongoose.model("profile", profileSchema)

module.exports = Modal;