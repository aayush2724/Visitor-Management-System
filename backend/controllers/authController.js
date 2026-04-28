const login = (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD || "1234";

  if (password === correctPassword) {
    res.json({ success: true, token: process.env.ADMIN_SECRET_TOKEN });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
};

module.exports = { login };
