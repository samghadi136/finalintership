import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ====== MAIL SETUP ======
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ===== SEND OTP =====
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html: <h2>Your OTP: ${otp}</h2>,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      otp: otp,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ===== SERVE FRONTEND =====
const __filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

app.use(express.static(path.join(__dirname, "../client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});