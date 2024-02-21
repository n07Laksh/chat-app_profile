const jwt = require("jsonwebtoken");

const secretKey = process.env.SECRET_KEY;

const getUser = (req, res, next) => {
  const token = req.header("token");

  if (!token) {
    return res.status(400).json({
      error: true,
      message: "Your session is end please logout and login again",
    });
  }

  try {
    const data = jwt.verify(token, secretKey);

    req.user = data.user;

    next();
  } catch (error) {
    return res
      .status(400)
      .json({ error: true, message: "Your session is end please logout and login again" });
  }
};

module.exports = getUser;
