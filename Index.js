const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');  // Core Node.js module for path manipulation
const fs = require('fs'); // Core Node.js module for file system operations

// Function to ensure the logs directory exists
function ensureLogsDirectoryExists(logDirectory) {
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true }); // Create directory recursively
    }
}

const logDirectory = path.join(__dirname, 'logs'); // Use path.join for cross-platform compatibility
ensureLogsDirectoryExists(logDirectory); // Ensure the directory exists

const transportOptions = {
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
};

const { combine, timestamp, printf, colorize, align, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => { // Include stack trace for errors
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`; // Display stack or message
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        colorize({ all: true }), // Colorize logs in the console
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS A' }), // Consistent timestamp format
        align(), // Align log output
        errors({ stack: true }), // Capture stack traces
        logFormat // Custom log format
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
            filename: path.join(logDirectory, 'application-%DATE%.log'), // Use path.join
            ...transportOptions
        }),
        new winston.transports.File({
            filename: path.join(logDirectory, 'error.log'), // Use path.join
            level: 'error',
            format: combine(
                timestamp(),
                errors({ stack: true }), // Include stack trace in error log file
                json() // Log errors as JSON for easier parsing
            )
        })
    ],
    exitOnError: false
});

module.exports = logger;
