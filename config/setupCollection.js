require('dotenv').config();
const connectDB = require('./db');
const mongoose = require('mongoose');
const models = require('../models');  // import all models

async function setupCollections() {
  try {
    await connectDB();
    console.log('MONGODB_URI:', process.env.MONGODB_URI);

    for (const modelName in models) {
      const model = models[modelName];
      if (model && model.createCollection) {
        await model.createCollection();
        console.log(`${model.modelName} collection created or already exists.`);
      }
    }
  } catch (error) {
    console.error('Error creating collections:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupCollections();