const express = require('express');
const cors = require('cors');
require('dotenv').config();
const apiRoutes = require('./routes/api');
const { startCronJob } = require('./utils/cronJobs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root / health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SubScribe API is running', time: new Date() });
});

// Start background cron jobs
startCronJob();

// Start server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`SubScribe server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});
