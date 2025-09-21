const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000", // your Next.js frontend
  credentials: true, // allow cookies/authorization headers if needed
}));

// Routes
app.use("/api/auth", require("./routes/userRoutes"));
app.use("/api/evidence", require("./routes/evidenceRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/blockchain", require("./routes/blockchainRoutes"));
app.use("/api/verification", require("./routes/verificationRoutes"));

// MongoDB connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
