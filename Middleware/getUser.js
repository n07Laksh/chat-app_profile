const jwt = require("jsonwebtoken");

const secretKey = process.env.SECRET_KEY;

const getUser = (req, res, next) => {

  console.log(req);
  const token = req.cookies?.sessionToken;

  console.log("token",token);
  if (!token) {
    return res.status(400).json({
      error: true,
      message: "Your session is expire, please login again",
    });
  }

  try {
    const data = jwt.verify(token, secretKey);

    req.user = data.user;

    next();
  } catch (error) {
    console.log("error", error)
    return res
      .status(400)
      .json({ error: true, message: "Your session is expire, please login again" });
  }
};

module.exports = getUser;
