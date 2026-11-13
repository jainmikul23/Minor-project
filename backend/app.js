const express = require("express")
const path = require('path')
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../public')));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const { logApiMiddleware } = require('./controllers/official.controllers/official.apiLogs.controller');
app.use(logApiMiddleware);

const allowedOrigins = [
    "https://minor-project-t1cf.onrender.com",
    "https://minor-project-1-uyvr.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// AI Agent Routes
const aiAgentRoutes = require('./routes/aiAgent.routes');
app.use('/ai', aiAgentRoutes);

// Static Pages Routes
app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(path.join(__dirname, '../public/sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, '../public/robots.txt'));
});

app.get('/', (req, res) => {
    res.render('landing/front');
});

app.get('/services', (req, res) => {
    res.render('landing/services');
});

app.get('/about', (req, res) => {
    res.render('landing/about');
});

app.get('/contact', (req, res) => {
    res.render('landing/contact');
});

// Health check endpoints for uptime monitoring & Render keep-alive
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

module.exports = app;