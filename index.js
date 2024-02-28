const express = require("express");
const dbconnection = require("./db");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
      origin: "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );
dbconnection();

app.get("/",(req,res)=>{
    res.send({
        message:"Welcome to the API"
    });
})


//configuration for vercel or cyclic (serverless) to allow temp data storage
app.use(express.static(__dirname + '/tmp'));
app.use('/tmp', express.static('tmp'));

app.use("/chatapp/user/profileimg", require("./Routes/profileRoute"));

const PORT = process.env.PORT || 8080

app.listen(PORT, ()=>{
    console.log(`App is running as http://localhost:${PORT}`);
})