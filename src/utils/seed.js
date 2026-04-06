/**
 * Seed script — populate the DB with realistic sample data for local dev.
 * Run with: node src/utils/seed.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import FinanceRecord from "../models/FinanceRecord.js";

const users = [
  { name: "Alice Admin", email: "admin@demo.com", password: "password123", role: "admin" },
  { name: "Ana Analyst", email: "analyst@demo.com", password: "password123", role: "analyst" },
  { name: "Victor Viewer", email: "viewer@demo.com", password: "password123", role: "viewer" },
];

const categories = ["salary", "freelance", "food", "rent", "utilities", "transport", "entertainment"];
const types = ["income", "expense"];

const randomBetween = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateRecords = (adminId) => {
  const records = [];
  const now = new Date();

  for (let i = 0; i < 60; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 5); // spread across last ~300 days

    const type = randomItem(types);
    records.push({
      amount: type === "income" ? randomBetween(500, 5000) : randomBetween(10, 1200),
      type,
      category: type === "income"
        ? randomItem(["salary", "freelance"])
        : randomItem(["food", "rent", "utilities", "transport", "entertainment"]),
      date,
      notes: `Seeded record #${i + 1}`,
      createdBy: adminId,
    });
  }

  return records;
};

const seed = async () => {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([User.deleteMany(), FinanceRecord.deleteMany()]);

  console.log("Creating users...");
  const createdUsers = await User.insertMany(users);
  const admin = createdUsers.find((u) => u.role === "admin");

  console.log("Creating finance records...");
  await FinanceRecord.insertMany(generateRecords(admin._id));

  console.log("✓ Seed complete");
  console.log("  admin@demo.com    / password123  (admin)");
  console.log("  analyst@demo.com  / password123  (analyst)");
  console.log("  viewer@demo.com   / password123  (viewer)");

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
