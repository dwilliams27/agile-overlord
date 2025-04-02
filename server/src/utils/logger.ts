import fs from 'fs';
import path from 'path';

class Logger {
  private logFilePath: string;
  
  constructor() {
    const logDir = path.join(__dirname, '../../logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    this.logFilePath = path.join(logDir, 'app.log');
  }
  
  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
    }
    
    return formattedMessage;
  }
  
  private writeToFile(message: string): void {
    fs.appendFileSync(this.logFilePath, message + '\n');
  }
  
  info(message: string, data?: any): void {
    const formattedMessage = this.formatMessage('INFO', message, data);
    console.log(formattedMessage);
    this.writeToFile(formattedMessage);
  }
  
  debug(message: string, data?: any): void {
    const formattedMessage = this.formatMessage('DEBUG', message, data);
    console.debug(formattedMessage);
    this.writeToFile(formattedMessage);
  }
  
  warn(message: string, data?: any): void {
    const formattedMessage = this.formatMessage('WARN', message, data);
    console.warn(formattedMessage);
    this.writeToFile(formattedMessage);
  }
  
  error(message: string, error?: any): void {
    let formattedMessage = this.formatMessage('ERROR', message);
    
    if (error) {
      formattedMessage += `\nError: ${error.message}\nStack: ${error.stack}`;
    }
    
    console.error(formattedMessage);
    this.writeToFile(formattedMessage);
  }
}

export default new Logger();