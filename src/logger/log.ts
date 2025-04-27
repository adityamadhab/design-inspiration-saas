const Logger = require('simple-logmate');

const logger = new Logger({
  level: 'debug',
  format: '[{timestamp}] [{level}] {message}',
  filePath: './logs/app.log',
  maxFileSize: 1024 * 1024, // 1MB
  transports: ['console', 'file'],
  httpRequest: true, // Enable HTTP request logging
});

export default logger;