const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // store hashed password
  role: { type: String, enum: ["Admin", "Owner", "Verifier"], required: true }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
