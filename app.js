// app.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
// const morgan = require('morgan'); // REMOVED Morgan require
const dbConnect = require('./config/mongo');
const { handleHttpError } = require('./utils/handleError');

const app = express();

// Connect DB
dbConnect();

// Middlewares
app.use(cors());
// app.use(morgan('dev')); // REMOVED Morgan usage
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
// Mount the consolidated user routes
// All paths within routes/users.js will be prefixed with /api/user
app.use("/api/user", require("./routes/users"));

// Remove other route loaders if they are now redundant
// app.use("/api", require("./routes")); // Remove this if index.js is gone


// --- Error Handling ---
// Catch 404 - This should be AFTER your routes
app.use((req, res, next) => {
    handleHttpError(res, "ROUTE_NOT_FOUND", 404);
});

// Generic Error Handler - This should be the LAST middleware
app.use((err, req, res, next) => {
    console.error("UNHANDLED_ERROR:", err); // Keep console logging for errors
    const statusCode = err.status || 500;

    // Handle Mongoose Validation Errors specifically for 422 response
    if (err.name === 'ValidationError') {
        // You might want to format Mongoose errors better here
        return handleHttpError(res, err.message, 422); // Use 422
    }

     // Handle other errors passed with a specific status code
     if (statusCode !== 500) { // If a specific status was likely set
        return handleHttpError(res, err.message || "ERROR", statusCode);
     }

    // Default internal server error
    handleHttpError(res, "INTERNAL_SERVER_ERROR", statusCode); // Generic message for 500
});


// --- Start Server ---
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});