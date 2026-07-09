const mongoose = require("mongoose");
const dns = require("dns");

// Override DNS only in local dev — on Vercel/production, DNS resolves fine natively.
// This fixes querySrv ECONNREFUSED on home/office routers that block Atlas SRV lookups.
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    // Don't call process.exit(1) on serverless — it kills the container.
    // Throw so the caller can handle it.
    throw err;
  }
};

module.exports = connectDB;
