# RSB Visitor Management System

**Live Demo:** [rsb-visitor-management-system.netlify.app](https://rsb-visitor-management-system.netlify.app/)

A comprehensive Visitor Management System built with Node.js, Express, and MongoDB.

## Features

- **Visitor Registration & Scheduling**: Easily register new visitors and schedule their visits.
- **QR Code Generation**: Automatically generates QR codes for easy visitor check-ins.
- **Notifications**: Sends automated SMS and Email notifications (via Twilio and Nodemailer) to visitors.
- **Dashboard & Reporting**: View upcoming and past visits, and export visitor logs to Excel formats.
- **Secure Data Storage**: Utilizes MongoDB for robust data storage.

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Utilities**: 
  - `qrcode` for generating check-in QR codes.
  - `nodemailer` for email alerts and notifications.
  - `twilio` for SMS notifications.
  - `exceljs` for exporting data to excel sheets.
  - `multer` for handling file uploads.
- **Containerization**: Docker & Docker Compose support.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)
- **Optional**: [Docker](https://www.docker.com/) for containerized deployment

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/aayush2724/RSB-Visitor-Management-System.git
   cd RSB-Visitor-Management-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example` or set the following variables:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   EMAIL_USER=your_email_address
   EMAIL_PASS=your_email_password
   ```

4. **Run the Application**:
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`.

### Using Docker

To run the application using Docker:

```bash
docker-compose up -d
```
This will spin up both the application container and the necessary database services.

## License

This project is open-source and available under the MIT License.
