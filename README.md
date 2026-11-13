# Minor-project: Civic Grievance Redressal & Smart City Platform

An intelligent, full-stack municipal operations and civic grievance redressal system powered by **Node.js**, **Express**, **MySQL**, and **Google Gemini AI**.

---

## 🏛️ System Overview

The platform provides end-to-end municipal grievance handling across four dedicated portals:

1. **Citizen Portal (`/user/login`)**:
   - AI-powered grievance reporting with natural language understanding and automatic department dispatch.
   - Live multi-stage tracking modal with real-time status updates and search by Complaint ID.
   - On-site resolution verification with **Resident Secret OTP** and worker ratings.
   - Built-in Voice Command Assistant and AI text polish.

2. **Municipal Officer Portal (`/official/login`)**:
   - Department-level ticket queue management, worker assignment, and triage.
   - Department appointments management and citizen interaction audit logs.
   - Real-time SLA monitoring.

3. **Field Worker Portal (`/worker/login`)**:
   - Mobile-first task execution dashboard.
   - GPS-verified fix submission with photo proof upload.
   - Mandatory on-site resident OTP entry to conclude tickets.

4. **Central Administrative Dashboard (`/admin/login`)**:
   - Citywide KPI analytics (Resolution rate, Average turnaround time, Ward distributions).
   - Official account provisioning and department configuration.
   - System-wide grievance auditing.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js (v5), Cookie-Parser, CORS, JWT, Bcrypt
- **Frontend**: EJS (Embedded JavaScript Templates), Responsive Modern CSS, FontAwesome
- **Database**: MySQL (Compatible with AWS RDS, Aiven, PlanetScale, Railway)
- **AI Integration**: Google Gemini API (`@google/generative-ai`)
- **File Uploads**: Multer, Cloudinary-ready

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MySQL Server](https://dev.mysql.com/downloads/) (or cloud MySQL database)

### 2. Clone and Setup
```bash
git clone https://github.com/jainmikul23/Minor-project.git
cd Minor-project
```

### 3. Environment Variables
Create a `.env` file in the `backend/` folder (refer to `backend/.env.example`):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=MinorDBFake
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install
cd ..
```

### 5. Run the Server
```bash
npm start
# Server starts at http://localhost:3000
```

---

## 📁 Repository Structure

```
Minor-project/
├── backend/
│   ├── config/              # AI and environment configuration
│   ├── controllers/         # Modular business logic across user types
│   ├── database/            # MySQL connection pool
│   ├── middlewares/         # JWT authentication & request logging
│   ├── routes/              # Express API and page routes
│   ├── script.js            # Main server entry point
│   ├── app.js               # Express application initialization
│   └── package.json         # Backend dependencies
├── frontend/
│   ├── admin/               # Admin portal views & styling
│   ├── official/            # Official portal views & styling
│   ├── user/                # Citizen portal views & styling
│   └── worker/              # Field worker portal views & styling
├── public/                  # Public assets, sitemaps, robots.txt
├── .gitignore               # Excludes secrets, node_modules, and logs
├── .env.example             # Safe environment variable template
└── package.json             # Root runner
```

---

## 🔒 Security Best Practices
- Environment credentials, private keys, and API tokens are never checked into source control.
- Passwords are salt-hashed using **Bcrypt**.
- Authentication is enforced via signed **JSON Web Tokens (JWT)** with HTTP-only cookies and Bearer headers.

