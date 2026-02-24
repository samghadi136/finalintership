import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ================== HEALTH CHECK ==================
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ================== MONGODB CONNECTION ==================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ================== USER SCHEMA ==================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: String,
  state: String,
  otp: String,
  plan: { type: String, default: "Free" },
  downloadsToday: { type: Number, default: 0 },
  lastDownloadDate: { type: String }
});

const User = mongoose.model("User", userSchema);

// ================== MAIL CONFIG ==================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ================== SEND OTP ==================
app.post("/send-otp", async (req, res) => {
  try {
    const { email, phone, state } = req.body;

    if (!email || !phone || !state) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const southStates = [
      "Tamil Nadu",
      "Kerala",
      "Karnataka",
      "Andhra Pradesh",
      "Telangana"
    ];

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, phone, state });
    }

    user.otp = otp;
    await user.save();

    if (southStates.includes(state)) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otp}`
      });
    } else {
      await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.FAST2SMS_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: phone
        })
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ OTP Error:", err);
    res.status(500).json({ success: false });
  }
});

// ================== VERIFY OTP ==================
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (user && user.otp === otp) {
      user.otp = "";
      await user.save();
      return res.json({ success: true });
    }

    res.json({ success: false });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ================== PLAN UPGRADE ==================
app.post("/upgrade-plan", async (req, res) => {
  try {
    const { email, plan } = req.body;
    await User.updateOne({ email }, { plan });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// ================== SEND INVOICE ==================
app.post("/send-invoice", async (req, res) => {
  try {
    const { email, plan } = req.body;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Plan Upgrade Successful",
      text: `
Hello,

Your payment was successful.
Your ${plan} plan is now active.

Thank you for upgrading.
`
    });

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Invoice Error:", err);
    res.status(500).json({ success: false });
  }
});

// ================== DOWNLOAD LIMIT ==================
app.post("/download-video", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false });

    const today = new Date().toDateString();

    // Reset counter daily
    if (user.lastDownloadDate !== today) {
      user.downloadsToday = 0;
      user.lastDownloadDate = today;
    }

    if (user.plan === "Free" && user.downloadsToday >= 1) {
      return res.json({
        success: false,
        message: "Upgrade to Premium for unlimited downloads"
      });
    }

    user.downloadsToday += 1;
    await user.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});