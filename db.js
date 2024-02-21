const mongoose = require("mongoose");
require("dotenv").config();

const URI = process.env.MONGODB_URL;

const dbconnection = () => {
  mongoose
    .connect(URI)
    .then(() => {
      console.log("Database Connected Successfully");
    })
    .catch((err) => {
      console.error("db connection error" , err);
    });
};

module.exports = dbconnection;
