# SocietyConnect - Housing Society Management System

A comprehensive housing society / residential apartment management system built with React, Node.js, and PostgreSQL. Manages residents, flats, notices, complaints, maintenance, security, and more.

## Features

- 🏢 **Resident Management** - Full resident directory with contact details
- 🏠 **Flat Management** - Track flat units, ownership, and allocation
- 👥 **Tenant Management** - Manage tenant records and lease tracking
- 📋 **Notice Board** - Society announcements and notifications system
- 📝 **Complaints System** - Resident complaint logging and status tracking
- 🔧 **Maintenance Tracker** - Maintenance requests, scheduling, and status
- 🔒 **Security Module** - Security gate management and visitor tracking
- 📄 **Ownership Transfers** - Flat ownership transfer records
- 📧 **Email Notifications** - Automated email alerts via Nodemailer
- 💬 **WhatsApp Integration** - WhatsApp notifications via whatsapp-web.js
- 📊 **Analytics Dashboard** - Visual reports and society statistics
- ⚙️ **Settings** - Application configuration panel
- 🤖 **Automated Scheduled Tasks** - Node-cron automation:
  - ⏰ **8:00 AM** - Daily compliance notice generation
  - 💰 **6:00 AM** - Auto late fee calculation
  - 💾 **2:00 AM** - Daily database backup

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT, bcrypt
- **UI Components**: Lucide React, Framer Motion, Recharts
- **Integrations**: Nodemailer, WhatsApp Web.js, QRCode

## Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/society-connect.git

# Navigate to project
cd society-connect

# Install backend dependencies
cd client && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the development server
npm run dev
```

## Environment Variables

Create a `.env` file:

```
DB_HOST=localhost
DB_USER=society_user
DB_PASSWORD=society123
DB_NAME=society_connect
JWT_SECRET=your_secret_key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=3000
```

## Project Structure

```
SocietyConnectSystem/
├── client/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API service layer
│   │   ├── App.tsx         # Main application
│   │   └── main.jsx        # Entry point
│   ├── backend/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   ├── migrations/     # Database migrations
│   │   └── scripts/        # Utility scripts
│   ├── public/             # Static assets
│   └── server.js           # Express server
├── uploads/                # File uploads
└── .env                    # Environment variables
```

## Project Status

This is an actively developed Housing Society Management System. All major pages are built with a modern UI, and the backend API is set up with authentication, email, and WhatsApp integrations working.
