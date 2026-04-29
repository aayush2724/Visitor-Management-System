// reset.js — Clears all visitor records from MongoDB
// Usage: node reset.js
require('dotenv').config();
const mongoose = require('mongoose');
const Visitor = require('./models/Visitor');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor-management';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    const result = await Visitor.deleteMany({});
    console.log(`Deleted ${result.deletedCount} visitor records.`);
    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });