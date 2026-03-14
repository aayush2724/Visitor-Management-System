require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express()
const mongoose = require('mongoose');
const Visitor = require('./models/Visitor');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendWhatsApp(to, message) {
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:${to}`,
    body: message
  });
}


const dashboardClients = new Set();

// SSE endpoint for dashboard updates
app.get('/api/visitors/updates', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const clientId = Date.now();
  dashboardClients.add(res);
  
  req.on('close', () => {
    dashboardClients.delete(res);
  });
});

function notifyDashboardUpdate() {
  dashboardClients.forEach(client => {
    client.write(`data: update\n\n`);
  });
}


// Database setup
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor-management';
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB at:', mongoUri))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Email transporter setup with better error handling
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // For self-signed certificates
  }
});

// Verify email connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('Email server connection failed:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Generate QR Code
async function generateQRCode(visitorId) {
  const url = `${process.env.BASE_URL || 'http://localhost:3000'}/api/visitors/${visitorId}/approve`;
  const qrPath = `uploads/qr-${visitorId}.png`;
  
  try {
    await QRCode.toFile(qrPath, url);
    return qrPath;
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return null;
  }
}

// Visitor registration endpoint
app.post('/api/visitors', upload.single('photo'), async (req, res) => {
  try {
    const { full_name, contact_number, department_visiting, person_to_visit } = req.body;
    
    if (!full_name || !contact_number || !department_visiting || !person_to_visit) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const photoPath = req.file ? req.file.path : null;

    const newVisitor = new Visitor({
      full_name,
      contact_number,
      department_visiting,
      person_to_visit,
      photo_path: photoPath,
      in_time: new Date()
    });

    await newVisitor.save();
    const visitorId = newVisitor._id.toString();
    const qrPath = await generateQRCode(visitorId);
    
    if (qrPath) {
      newVisitor.qr_code_path = qrPath;
      await newVisitor.save();
    }

    await sendEmails({
      visitorId,
      full_name,
      person_to_visit,
      department_visiting,
      contact_number,
      photoUrl: photoPath ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(photoPath)}` : null,
      qrUrl: qrPath ? `${req.protocol}://${req.get('host')}/${qrPath}` : null
    });

    res.json({
      id: visitorId,
      message: 'Visitor registered successfully',
      qrUrl: qrPath ? `${req.protocol}://${req.get('host')}/${qrPath}` : null
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email sending function with improved error handling
async function sendEmails({ visitorId, full_name, person_to_visit, department_visiting, contact_number, photoUrl, qrUrl }) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const approvalUrl = `http://localhost:3000/api/visitors/${visitorId}/approve`;

  const mailOptions = {
    from: `"Visitor System" <${process.env.EMAIL_FROM || 'visitor-system@example.com'}>`,
    subject: `APPROVAL REQUIRED: ${full_name} visiting ${person_to_visit}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Visitor Approval Required</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <p><strong>Visitor:</strong> ${full_name}</p>
          <p><strong>Contact:</strong> ${contact_number}</p>
          <p><strong>Visiting:</strong> ${department_visiting} (${person_to_visit})</p>
          ${photoUrl ? `<img src="${photoUrl}" alt="Visitor photo" style="max-width: 200px; margin: 10px 0;">` : ''}
        </div>
        
        <div style="margin: 25px 0; text-align: center;">
          <a href="${approvalUrl}" 
             style="background-color: #2ecc71; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            APPROVE VISITOR
          </a>
        </div>
        
        <p style="font-size: 12px; color: #7f8c8d;">
          This approval expires in 24 hours. Visitor will auto-checkout if not approved.
        </p>
      </div>
    `
  };

  try {
    // Send to HR
    mailOptions.to = process.env.HR_EMAIL;
    const hrResult = await transporter.sendMail(mailOptions);
    console.log('Email sent to HR:', hrResult.messageId);

    // Send to host
    mailOptions.to = `${person_to_visit.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    const hostResult = await transporter.sendMail(mailOptions);
    console.log('Email sent to host:', hostResult.messageId);

    await Visitor.findByIdAndUpdate(visitorId, { email_sent: true });
  } catch (error) {
    console.error('Email sending failed:', error);
    // Retry logic could be added here
  }
}

// Test email endpoint
app.get('/test-email', async (req, res) => {
  try {
    const testEmail = {
      from: `"Visitor System Test" <${process.env.EMAIL_FROM || 'visitor-system@example.com'}>`,
      to: process.env.HR_EMAIL || 'test@example.com',
      subject: 'Visitor System Email Test',
      text: 'This is a test email from your visitor management system',
      html: '<b>Success!</b> Your email system is working correctly.'
    };

    const info = await transporter.sendMail(testEmail);
    res.send(`
      <h1>Email Test Successful</h1>
      <p>Message sent to: ${testEmail.to}</p>
      <p>Message ID: ${info.messageId}</p>
    `);
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).send(`
      <h1>Email Test Failed</h1>
      <pre>${error.message}</pre>
      <p>Check your email configuration in .env file</p>
    `);
  }
});

// Approval endpoint
app.get('/api/visitors/:id/approve', async (req, res) => {
  const visitorId = req.params.id;
  
  try {
    const visitor = await Visitor.findByIdAndUpdate(visitorId, { approved: true }, { new: true });
    
    if (!visitor) {
      return res.status(404).send('Visitor not found');
    }

    res.send(`
        <!DOCTYPE html>
  <html>
  <head>
    <title>Visitor Approved</title>
    <style>
      body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
      .btn { 
        padding: 10px 20px; 
        margin: 10px; 
        border: none; 
        color: white; 
        cursor: pointer;
        border-radius: 4px;
      }
      .release-btn { background: #e74c3c; }
    </style>
  </head>
  <body>
    <h1 style="color: #2ecc71;">✓ Visitor Approved</h1>
    <p>${visitor.full_name} is now checked in.</p>
    
    <button class="btn release-btn" 
            onclick="releaseVisitor(${visitorId})">
      Release Visitor
    </button>

    <script>
      function releaseVisitor(id) {
        fetch('/api/visitors/'+id+'/release', {
          method: 'POST'
        })
        .then(response => {
          if (response.ok) {
            alert('Visitor released successfully');
            window.close();
          } else {
            alert('Release failed');
          }
        });
      }
    </script>
  </body>
  </html>
      `);
  } catch (err) {
    console.error('Approval error:', err);
    return res.status(500).send('Failed to approve visitor');
  }
});



app.post('/api/visitors/:id/release', async (req, res) => {
  const visitorId = req.params.id;
  const releaseTime = new Date();
  
  try {
    await Visitor.findByIdAndUpdate(visitorId, { out_time: releaseTime });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) {
    console.error('Release error:', err);
    return res.status(500).send('Release failed');
  }
});

app.post('/api/visitors/:id/security-checkout', async (req, res) => {
  const visitorId = req.params.id;
  const checkoutTime = new Date();
  
  try {
    await Visitor.findByIdAndUpdate(visitorId, {
      security_confirmed: true,
      security_out_time: checkoutTime
    });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) {
    console.error('Security checkout error:', err);
    return res.status(500).send('Checkout failed');
  }
});

// Excel export endpoint
app.get('/api/visitors/export', async (req, res) => {
  try {
    const { period } = req.query;
    let query = {};
    
    // Apply time filters if specified
    if (period === 'day') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      query.in_time = { $gte: startOfDay };
    } else if (period === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      query.in_time = { $gte: startOfWeek };
    } else if (period === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      query.in_time = { $gte: startOfMonth };
    }
    
    const visitors = await Visitor.find(query).sort({ in_time: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Visitors');
    
    // Define columns
    worksheet.columns = [
      { header: 'ID', key: '_id', width: 25 },
      { header: 'Full Name', key: 'full_name', width: 25 },
      { header: 'Contact', key: 'contact_number', width: 15 },
      { header: 'Department', key: 'department_visiting', width: 20 },
      { header: 'Host', key: 'person_to_visit', width: 20 },
      { header: 'Check-in', key: 'in_time', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
      { header: 'Check-out', key: 'out_time', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Add data rows
    visitors.forEach(visitor => {
      worksheet.addRow({
        ...visitor,
        status: visitor.out_time 
          ? (visitor.security_confirmed ? 'Completed' : 'Pending Checkout')
          : 'Active'
      });
    });

    // Set response headers
    const filename = `visitors_${period || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send the Excel file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      details: error.message
    });
  }
});

// Visitor statistics endpoint
app.get('/api/visitors/stats', async (req, res) => {
  try {
    const stats = await Visitor.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: [{ $type: "$out_time" }, "missing"] }, 1, { $cond: [{ $eq: ["$out_time", null] }, 1, 0] }] } },
          secured: { $sum: { $cond: [{ $and: [{ $ne: ["$out_time", null] }, { $eq: ["$security_confirmed", true] }] }, 1, 0] } },
          security_pending: { $sum: { $cond: [{ $and: [{ $ne: ["$out_time", null] }, { $eq: ["$security_confirmed", false] }] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ["$scheduled", true] }, 1, 0] } }
        }
      }
    ]);

    const row = stats[0] || {};
    res.json({
      total: row.total || 0,
      active: row.active || 0,
      secured: row.secured || 0,
      security_pending: row.security_pending || 0
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Visitor listing endpoint with status filtering
app.get('/api/visitors', async (req, res) => {
  const { status } = req.query;
  let query = {};

  if (status === 'active') {
    query.out_time = { $exists: false };
  } else if (status === 'released') {
    query.out_time = { $ne: null };
    query.security_confirmed = true;
  } else if (status === 'security-pending') {
    query.out_time = { $ne: null };
    query.security_confirmed = false;
  }
  else if (status === 'scheduled') {
    query.scheduled = true;
  }

  try {
    const visitors = await Visitor.find(query).sort({ in_time: -1 }).lean();
    // Map _id to id for frontend compatibility
    const visitorsWithId = visitors.map(v => ({ ...v, id: v._id.toString() }));
    res.json(visitorsWithId);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});



// Scheduled visitor endpoint
app.post('/api/schedule', async (req, res) => {
  const { full_name, contact_number, department_visiting, person_to_visit } = req.body;

  try {
    const newVisitor = new Visitor({
      full_name,
      contact_number,
      department_visiting,
      person_to_visit,
      in_time: new Date(),
      scheduled: true
    });
    await newVisitor.save();
    
    const visitorId = newVisitor._id.toString();
    const qrPath = await generateQRCode(visitorId);
    newVisitor.qr_code_path = qrPath;
    await newVisitor.save();

    console.log('📤 Sending WhatsApp to:', contact_number);

    try {
      await sendWhatsApp(contact_number, 
        `Your visit has been scheduled. Show this QR at the gate:\n${req.protocol}://${req.get('host')}/${qrPath}`
      );
      console.log('✅ WhatsApp sent');
    } catch (err) {
      console.error('❌ WhatsApp failed:', err.message);
    }
        
    notifyDashboardUpdate();
    res.json({
      message: 'Visit scheduled successfully. QR will be sent via WhatsApp.',
      visitorId
    });
  } catch (error) {
    console.error('Failed to schedule visit:', error);
    res.status(500).json({ error: 'Failed to schedule visit' });
  }
});


app.post('/api/visitors/:id/allow-entry', async (req, res) => {
  const visitorId = req.params.id;
  const now = new Date();

  try {
    const visitor = await Visitor.findByIdAndUpdate(
      visitorId,
      {
        scheduled: false,
        in_time: now,
        approved: true
      },
      { new: true }
    ).lean();

    if (!visitor) return res.status(404).json({ error: 'Visitor data not found' });
    
    notifyDashboardUpdate();
    // Send back full visitor data with mapped id
    res.json({ ...visitor, id: visitor._id.toString() });
  } catch (err) {
    console.error('Failed to allow entry:', err);
    res.status(500).json({ error: 'Failed to allow entry' });
  }
});




// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Handle root route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`ExcelJS Version: ${require('exceljs').version}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});