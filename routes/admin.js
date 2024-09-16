const express = require('express');
const passport = require('passport');
const Admin = require('../models/admin');
const { isAdminLoggedIn } = require('../middleware');
const router = express.Router();
const multer = require('multer');
const { URLSearchParams } = require('url');
let upload = multer({ dest: 'uploads/' }); // 'uploads/' is the directory where files will be stored temporarily
const Batch = require('../models/batch');
const Student=require('../models/student');
const puppeteer = require('puppeteer');
const path = require("path");
const nodemailer = require('nodemailer');
const Faculty=require('../models/faculty');
const Section=require("../models/section");
const Timetable = require('../models/timetable');
const Period=require("../models/period");
const Branch = require('../models/branch');
const bodyParser = require('body-parser');
const Semester = require('../models/semester');
const AcademicYear = require('../models/academicYear');
const Subject = require('../models/subject');
const Attendance = require('../models/attendance');
const mongoose = require('mongoose');
const  {ObjectId}  = mongoose.Types;
const xlsx = require('xlsx');
const fs = require('fs');
const moment=require('moment');
const {google}=require('googleapis');
const OAuth2 = google.auth.OAuth2;

router.use(express.json()); // For parsing application/json
router.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded


// Route to handle the Excel file upload
router.post('/upload-students', upload.single('file'), async (req, res) => {
  try {
      const file = req.file;
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const studentsData = xlsx.utils.sheet_to_json(worksheet);

      const errors = []; // To store error messages for each row

      // Process each row in the Excel sheet
      for (const [index, row] of studentsData.entries()) {
          const { email, name,Rollno,password, branchName, yearName, gender, sectionName } = row;

          // Find the corresponding branch, year, and section from the database
          const branch = await Branch.findOne({ name: branchName });
          const year = await AcademicYear.findOne({ name: yearName });
          const section = await Section.findOne({ name: sectionName });

          // Check for missing references
          if (!branch) {
              errors.push(`Row ${index + 1}: Branch "${branchName}" not found.`);
              continue; // Skip this row
          }
          if (!year) {
              errors.push(`Row ${index + 1}: Academic Year "${yearName}" not found.`);
              continue; // Skip this row
          }
          if (!section) {
              errors.push(`Row ${index + 1}: Section "${sectionName}" not found.`);
              continue; // Skip this row
          }

          // Create a new student if all references are valid
          const newStudent = new Student({
              email,
              name,
              branch: branch._id,
              year: year._id,
              username:Rollno,
              gender,
              section: section._id
          });

          try {
            let registeredStudent = await Student.register(newStudent, password);
          } catch (saveError) {
              errors.push(`Row ${index + 1}: Failed to save student "${name}". Error: ${saveError.message}`);
          }
      }

      // Remove the file after processing
      fs.unlinkSync(file.path);

      if (errors.length > 0) {
          res.status(400).json({ message: 'Some errors occurred during the upload.', errors });
      } else {
          res.status(200).send('Students uploaded and saved successfully.');
      }
  } catch (error) {
      console.error('Error uploading students:', error);
      res.status(500).send('An error occurred while uploading students.');
  }
});
router.get('/download-template', async (req, res) => {
  try {
      // Fetch all branches with their academic year and sections
      const branches = await Branch.find().populate('academicYear').lean();
      const sections = await Section.find().populate('branch').lean();

      // Create a new workbook
      const workbook = xlsx.utils.book_new();

      // Prepare the data for the student information sheet
      const studentData = [
          ['email', 'name', 'Roll no.', 'password', 'branchName', 'yearName', 'gender', 'sectionName'], // Header row
          ['student1@mail.com', 'Student One', '23r11a67j2', '23R11A67J2', 'CSE', '2024', 'M', 'A'],  // Example row
          ['student2@mail.com', 'Student Two', '23r11a05x4', '23R11A05X4', 'ECE', '2023', 'F', 'B'],  // Example row
      ];

      // Convert the student data to a sheet and append it to the workbook
      const studentSheet = xlsx.utils.aoa_to_sheet(studentData);
      xlsx.utils.book_append_sheet(workbook, studentSheet, 'Student Data');

      // Prepare the data for the branch, academic year, and section sheet
      const branchData = [
          ['Branch Name', 'Academic Year', 'Section Name']
      ];

      branches.forEach(branch => {
          const branchSections = sections.filter(section => section.branch._id.toString() === branch._id.toString());
          branchSections.forEach(section => {
              branchData.push([branch.name, branch.academicYear.name, section.name]);
          });
      });

      // Convert the branch data to a sheet and append it to the workbook
      const branchSheet = xlsx.utils.aoa_to_sheet(branchData);
      xlsx.utils.book_append_sheet(workbook, branchSheet, 'all data');

      // Generate the Excel file buffer
      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Send the file to the client
      res.setHeader('Content-Disposition', 'attachment; filename="StudentTemplate.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excelBuffer);
  } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).send('An error occurred while generating the template.');
  }
});
router.get('/download-timetable', async (req, res) => {
  let { id } = req.query;
  try {
    const timetable = await Timetable.findById(id)
      .populate('section semester year branch periods')
      .populate({
        path: 'periods',
        populate: {
          path: 'subject faculty',
          select: 'name code'
        }
      })
      .exec();
      let section=await Section.findById(timetable.section._id)
      .populate('class_teacher');
      console.log(section);
    if (!timetable) {
      return res.status(404).send('Timetable not found');
    }

    const wb = xlsx.utils.book_new();

    // Sort periods by hour
    timetable.periods.sort((a, b) => a.hour - b.hour);

    // Header Data
    const ws_data = [
      [{ v: "Geethanjali College of Engineering & Technology", s: { font: { bold: true, color: { rgb: "0000FF" }, sz: 14 }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "CCCCCC" } } } }],
      [{ v: `Department of ${timetable.branch.name}`, s: { font: { bold: true, color: { rgb: "008000" }, sz: 12 }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "EEEEEE" } } } }],
      [{ v: "ODD Semester", s: { font: { bold: true, color: { rgb: "000000" }, sz: 12 }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "DDDDDD" } } } }],
      [
        { v: `Year/Sem/Sec: B.Tech ${timetable.year.name} - Semester ${timetable.semester.name} - Section ${timetable.section.name}`, s: { alignment: { horizontal: "center" } } },
        { v: `A.Y: ${new Date().getFullYear()}`, s: { alignment: { horizontal: "center" } } },
        { v: `Class Teacher: ${section.class_teacher.name || ''}`, s: { alignment: { horizontal: "center" } } }
      ],
      [
        { v: `Room No: ${timetable.section.room_no || ''}`, s: { font: { sz: 10 }, alignment: { horizontal: "center" } } }
      ],
      [
        { v: "Time", s: { font: { bold: true }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "BBBBBB" } } } },
        ...Array.from({ length: timetable.numPeriods }).map((_, i) => ({
          v: `${timetable.periods.find(p => p.hour === i + 1)?.startTime || ''} - ${timetable.periods.find(p => p.hour === i + 1)?.endTime || ''}`,
          s: { alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "BBBBBB" } } }
        }))
      ],
      [
        { v: "Period", s: { font: { bold: true }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "BBBBBB" } } } },
        ...Array.from({ length: timetable.numPeriods }).map((_, i) => ({
          v: `Period ${i + 1}`,
          s: { alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "BBBBBB" } } }
        }))
      ],
    ];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Timetable Rows
    days.forEach(day => {
      const periodsForDay = timetable.periods.filter(period => period.day === day);
      if (periodsForDay.length > 0) {
        const dayRow = [{ v: day, s: { font: { bold: true }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "EEEEEE" } } } }];
        
        for (let i = 1; i <= timetable.numPeriods; i++) {
          const matchingPeriods = periodsForDay.filter(p => p.hour === i);

          if (matchingPeriods.length > 0) {
            const cellValue = matchingPeriods.map(period => {
              return `${period.subject.name || 'N/A'}${period.room ? ` (${period.room})` : ''}`;
            }).join(' / ');

            dayRow.push({ 
              v: cellValue,
              s: { alignment: { horizontal: "center", vertical: "center" }, fill: { fgColor: { rgb: "FFFFFF" } } } 
            });
          } else {
            dayRow.push({ v: '', s: { fill: { fgColor: { rgb: "FFFFFF" } } } });
          }
        }
        ws_data.push(dayRow);
      }
    });

    // Faculty Details Section
    ws_data.push([]);
    ws_data.push([
      { v: "S.No", s: { font: { bold: true }, alignment: { horizontal: "center" }, border: { bottom: { style: "thin" } }, fill: { fgColor: { rgb: "CCCCCC" } } } },
      { v: "Subject(T/P)", s: { font: { bold: true }, alignment: { horizontal: "center" }, border: { bottom: { style: "thin" } }, fill: { fgColor: { rgb: "CCCCCC" } } } },
      { v: "Course code", s: { font: { bold: true }, alignment: { horizontal: "center" }, border: { bottom: { style: "thin" } }, fill: { fgColor: { rgb: "CCCCCC" } } } },
      { v: "Faculty Name", s: { font: { bold: true }, alignment: { horizontal: "center" }, border: { bottom: { style: "thin" } }, fill: { fgColor: { rgb: "CCCCCC" } } } },
      { v: "No. of Periods", s: { font: { bold: true }, alignment: { horizontal: "center" }, border: { bottom: { style: "thin" } }, fill: { fgColor: { rgb: "CCCCCC" } } } }
    ]);

    const facultyDetails = {};

    timetable.periods.forEach(period => {
      if (!facultyDetails[period.subject.name]) {
        facultyDetails[period.subject.name] = {
          subject: period.subject.name,
          course_code: period.subject.code,
          faculty_name: period.faculty ? period.faculty.name : '',
          num_periods: 1
        };
      } else {
        facultyDetails[period.subject.name].num_periods += 1;
      }
    });

    Object.values(facultyDetails).forEach((detail, index) => {
      ws_data.push([
        { v: index + 1, s: { alignment: { horizontal: "center" } } },
        { v: detail.subject, s: { alignment: { horizontal: "center" } } },
        { v: detail.course_code, s: { alignment: { horizontal: "center" } } },
        { v: detail.faculty_name, s: { alignment: { horizontal: "center" } } },
        { v: detail.num_periods, s: { alignment: { horizontal: "center" } } }
      ]);
    });

    // Signatures section
    ws_data.push([]);
    ws_data.push([
      { v: "TT. Coord:_____________", s: { alignment: { horizontal: "center" }, border: { top: { style: "thin" } }, fill: { fgColor: { rgb: "EEEEEE" } } } },
      { v: "HOD:__________________", s: { alignment: { horizontal: "center" }, border: { top: { style: "thin" } }, fill: { fgColor: { rgb: "EEEEEE" } } } },
      { v: "Dean Academics:__________________", s: { alignment: { horizontal: "center" }, border: { top: { style: "thin" } }, fill: { fgColor: { rgb: "EEEEEE" } } } },
      { v: "Principal:___________________", s: { alignment: { horizontal: "center" }, border: { top: { style: "thin" } }, fill: { fgColor: { rgb: "EEEEEE" } } } }
    ]);

    // Convert the ws_data to a worksheet
    const ws = xlsx.utils.aoa_to_sheet(ws_data);

    // Adjust column widths and row heights
    ws['!cols'] = Array.from({ length: timetable.numPeriods + 1 }, () => ({ wch: 20 }));
    ws['!rows'] = ws_data.map(() => ({ hpt: 20 }));

    // Apply borders and styles to all cells
    Object.keys(ws).forEach(cellRef => {
      if (cellRef.startsWith('!')) return;
      ws[cellRef].s = ws[cellRef].s || {};
      ws[cellRef].s.border = {
        top: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } }
      };
    });

    // Append worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, `Timetable_${timetable.section.name}`);

    // Send the Excel file as response
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', `attachment; filename="Timetable_${timetable.section.name}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating timetable');
  }
});

router.get('/login', (req, res) => {
  res.render('admin/login');
});

router.post('/login', passport.authenticate('local-admin', {
  failureFlash: true,
  failureRedirect: '/admin/login'
}), (req, res) => {
  req.flash('success', 'Welcome back!');
  res.redirect('/admin/dashboard');
});

router.get('/logout', (req, res, next) => {
  req.logOut((err) => {
      if (err) return next(err);
      req.flash("success", "Logged out successfully!");
      res.redirect('/');
  });
});
router.get('/email', isAdminLoggedIn, async (req, res) => {
  let academicYears = await AcademicYear.find({});
  let client = process.env.CLIENT_ID;
  let state = JSON.stringify({ year: req.query.year, branch: req.query.branch }); // Generate a state with some meaningful data
  res.render('admin/sendEmail', { academicYears, client });
});

const axios = require('axios');
// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'http://localhost:2000/admin/oauth2/callback' // Your redirect URL
);

// Function to send the email
async function sendEmail({ accessToken, refreshToken, to, from, subject, text, attachments }) {
  try {
    console.log(accessToken, refreshToken, to, subject, text, attachments);
    // Set credentials for OAuth2
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    // Create Nodemailer transport with OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: from,  // Use OAuth user's email dynamically
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: refreshToken,
        accessToken: accessToken,
      },
    });

    // Email options
    const mailOptions = {
      from,                    // Use the dynamically fetched user email
      to,                      // Recipient(s)
      subject,                 // Email subject
      text,                    // Email body (text)
      attachments              // Attachments
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

upload = multer({ storage: multer.memoryStorage() });

// Handle file upload
router.post('/upload-file', upload.single('attachment'), (req, res) => {
  try {
    if (!req.file) {
      console.error('File upload failed: No file received');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Store the file in the session for later use
    req.session.file = {
      originalname: req.file.originalname,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    };

    // Respond with success
    res.json({ success: true });
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).json({ success: false, message: 'Internal server error during file upload' });
  }
});
router.get('/oauth2/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Invalid request');
  }

  try {
    // Fetch tokens with the authorization code
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'http://localhost:2000/admin/oauth2/callback' // Correct redirect URI
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token } = tokenResponse.data;
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;

    // Fetch user profile to get the email
    const userInfoResponse = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userEmail = userInfoResponse.data.email;

    // Decode the state parameters
    const formDetails = new URLSearchParams(state);
    const year = formDetails.get('year');
    const branch = formDetails.get('branch');
    const section = formDetails.get('section');
    const emailSubject = formDetails.get('emailSubject');
    const emailBody = formDetails.get('emailBody');

    // Fetch recipient emails from the database based on the parameters
    const students = await Student.find({ year, branch, section });
    const recipientEmails = students.map(student => student.email);

    if (recipientEmails.length === 0) {
      return res.status(400).send('No recipient emails found');
    }

    // Prepare email options
    const emailOptions = {
      to: recipientEmails.join(','), // Recipient list
      subject: emailSubject,
      text: emailBody,
      attachments: [],
      from: userEmail // Use authenticated user's email for the "from" field
    };

    // Attach the file from the session
    if (req.session.file) {
      emailOptions.attachments.push({
        filename: req.session.file.originalname,
        content: Buffer.from(req.session.file.buffer), // Ensure this is a Buffer
        contentType: req.session.file.mimetype
      });
    }

    // Send the email
    await sendEmail({
      accessToken: req.session.accessToken,
      refreshToken: req.session.refreshToken,
      ...emailOptions
    });

    req.flash('success', 'Email sent successfully');
    res.redirect('/admin/email');
  } catch (error) {
    console.error('Error handling OAuth2 callback:', error);
    res.status(500).send('Error processing authorization code');
  }
});

router.post('/send-email', upload.single('emailAttachment'), async (req, res) => {
  const { year, branch, section, emailSubject, emailBody } = req.body;
  const file = req.file;  // This will be undefined if no file was attached

  try {
    // Fetch recipient emails based on year, branch, and section
    const students = await Student.find({ year, branch, section });
    const recipientEmails = students.map(student => student.email);

    // If no recipient emails found, return an error
    if (recipientEmails.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipient emails found' });
    }

    // Prepare state for OAuth2 redirect (without file, stored in session)
    const state = new URLSearchParams({
      year,
      branch,
      section,
      emailSubject,
      emailBody
    }).toString();

    // Store file in session (if exists)
    if (file) {
      req.session.file = {
        originalname: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype
      };
    } else {
      req.session.file = null;
    }
    // Redirect to Google OAuth
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?scope=openid%20profile%20email%20https://www.googleapis.com/auth/gmail.send&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=http://localhost:2000/admin/oauth2/callback&client_id=${process.env.CLIENT_ID}&state=${encodeURIComponent(state)}&prompt=consent`;

    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in send-email route:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});





// Branch Management
router.get('/branches', isAdminLoggedIn, async (req, res) => {
  const branches = await Branch.find({}).populate('academicYear');
  res.render('admin/branches/index', { branches });
});

router.get('/branches/new', isAdminLoggedIn, async (req, res) => {
  const academicYears = await AcademicYear.find({});
  res.render('admin/branches/new', { academicYears });
});

router.post('/branches', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear } = req.body;
  const branch = new Branch({ name, academicYear });
  await branch.save();
  req.flash('success', 'Branch created successfully');
  res.redirect('/admin/branches');
});

router.get('/branches/:id/edit', isAdminLoggedIn, async (req, res) => {
  const branch = await Branch.findById(req.params.id).populate('academicYear');
  const academicYears = await AcademicYear.find({});
  res.render('admin/branches/edit', { branch, academicYears });
});

router.put('/branches/:id', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear } = req.body;
  await Branch.findByIdAndUpdate(req.params.id, { name, academicYear });
  req.flash('success', 'Branch updated successfully');
  res.redirect('/admin/branches');
});

router.delete('/branches/:id', isAdminLoggedIn, async (req, res) => {
  await Branch.findByIdAndDelete(req.params.id);
  req.flash('success', 'Branch deleted successfully');
  res.redirect('/admin/branches');
});
router.get("/semester",async(req,res)=>{
  let semesters=await Semester.find({});
  res.json(semesters);
});
// Semester Management
router.get('/semesters', isAdminLoggedIn, async (req, res) => {
  const semesters = await Semester.find({});
  res.render('admin/semesters/index', { semesters });
});

router.get('/semesters/new', isAdminLoggedIn, (req, res) => {
  res.render('admin/semesters/new');
});

router.post('/semesters', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  const semester = new Semester({ name });
  await semester.save();
  req.flash('success', 'Semester created successfully');
  res.redirect('/admin/semesters');
});

router.get('/semesters/:id/edit', isAdminLoggedIn, async (req, res) => {
  const semester = await Semester.findById(req.params.id);
  res.render('admin/semesters/edit', { semester });
});

router.put('/semesters/:id', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  await Semester.findByIdAndUpdate(req.params.id, { name });
  req.flash('success', 'Semester updated successfully');
  res.redirect('/admin/semesters');
});

router.delete('/semesters/:id', isAdminLoggedIn, async (req, res) => {
  await Semester.findByIdAndDelete(req.params.id);
  req.flash('success', 'Semester deleted successfully');
  res.redirect('/admin/semesters');
});

// Academic Year Management
router.get('/academic-years', isAdminLoggedIn, async (req, res) => {
  const academicYears = await AcademicYear.find({});
  res.render('admin/academicYears/index', { academicYears });
});

router.get('/academic-years/new', isAdminLoggedIn, (req, res) => {
  res.render('admin/academicYears/new');
});

router.post('/academic-years', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  const academicYear = new AcademicYear({ name });
  await academicYear.save();
  req.flash('success', 'Academic Year created successfully');
  res.redirect('/admin/academic-years');
});

router.get('/academic-years/:id/edit', isAdminLoggedIn, async (req, res) => {
  const academicYear = await AcademicYear.findById(req.params.id);
  res.render('admin/academicYears/edit', { academicYear });
});

router.put('/academic-years/:id', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  await AcademicYear.findByIdAndUpdate(req.params.id, { name });
  req.flash('success', 'Academic Year updated successfully');
  res.redirect('/admin/academic-years');
});

router.delete('/academic-years/:id', isAdminLoggedIn, async (req, res) => {
  await AcademicYear.findByIdAndDelete(req.params.id);
  req.flash('success', 'Academic Year deleted successfully');
  res.redirect('/admin/academic-years');
});

const ITEMS_PER_PAGE = 10;

router.get('/subjects', isAdminLoggedIn, async (req, res) => {
  const searchTerm = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const ITEMS_PER_PAGE = 10;

  const searchQuery = {
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { full_name: new RegExp(searchTerm, 'i') },
      { code: new RegExp(searchTerm, 'i') }
    ]
  };

  // Calculate total number of subjects matching the search query
  const totalSubjects = await Subject.countDocuments(searchQuery);

  let query = Subject.find(searchQuery)
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE);

  // Conditionally populate academicYear and semester fields if they exist
  if (Subject.schema.paths.academicYear) {
    query = query.populate('academicYear');
  }
  if (Subject.schema.paths.semester) {
    query = query.populate('semester');
  }

  const subjects = await query.exec();

  res.render('admin/subjects/index', {
    subjects,
    searchTerm,
    currentPage: page,
    hasNextPage: ITEMS_PER_PAGE * page < totalSubjects,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: Math.ceil(totalSubjects / ITEMS_PER_PAGE)
  });
});


router.get('/subjects/new', isAdminLoggedIn, async (req, res) => {
  const academicYears = await AcademicYear.find({});
  const semesters = await Semester.find({});
  res.render('admin/subjects/new', { academicYears, semesters });
});

router.post('/subjects', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear, semester } = req.body;
  const subject = new Subject(req.body );
  await subject.save();
  req.flash('success', 'Subject created successfully');
  res.redirect('/admin/subjects');
});

router.get('/subjects/:id/edit', isAdminLoggedIn, async (req, res) => {
  const subject = await Subject.findById(req.params.id).populate('academicYear').populate('semester');
  const academicYears = await AcademicYear.find({});
  const semesters = await Semester.find({});
  res.render('admin/subjects/edit', { subject, academicYears, semesters });
});

router.put('/subjects/:id', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear, semester } = req.body;
  await Subject.findByIdAndUpdate(req.params.id,  req.body );
  req.flash('success', 'Subject updated successfully');
  res.redirect('/admin/subjects');
});

router.delete('/subjects/:id', isAdminLoggedIn, async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  req.flash('success', 'Subject deleted successfully');
  res.redirect('/admin/subjects');
});
router.get('/dashboard',isAdminLoggedIn,(req,res)=>{
  res.render('admin/dashboard');
});
// Fetch Academic Years
router.get('/academic-year', async (req, res) => {
  try {
      const academicYears = await AcademicYear.find({});
      res.json(academicYears);
  } catch (err) {
      res.status(500).send('Server Error');
  }
});

// Fetch Branches by Academic Year
router.get('/branch', async (req, res) => {
  try {
      const { year } = req.query;
      const branches = await Branch.find({ academicYear: year });
      res.json(branches);
  } catch (err) {
      res.status(500).send('Server Error');
  }
});

// Fetch Sections by Branch
router.get('/sections', async (req, res) => {
  try {
      const { branch } = req.query;
      const sections = await Section.find({ branch });
      res.json(sections);
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
router.get('/subject', async(req, res) => {
  const subjects = await Subject.find({});
  res.json(subjects);
});
// Route to get the timetable creation and viewing page
router.get('/timetable', isAdminLoggedIn, async (req, res) => {
  try {
    const sections = await Section.find({});
    const { year, branch, section } = req.query;
    let periods = [];
    if (year && branch && section) {
      periods = await Period.find({ year, branch, section });
    }
    res.render('admin/timetable/timetable.ejs', { periods, sections, year, branch, section, message: req.flash('message') });
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
});

router.post('/timetable/period', isAdminLoggedIn, async (req, res) => {
  const { hour, day, branch, year, section, semester, startTime, endTime, batchDetails, subject:subjectId, faculty, room } = req.body;
  console.log(req.body);

  // Convert day number to day name
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayName = dayNames[day - 1];

  try {
      // Find the semester document by ID
      const semesterDoc = await Semester.findById(semester);
      const subject=await Subject.findById(subjectId);
      console.log(subject);
      if (!semesterDoc) {
          req.flash('error', 'Invalid semester');
          return res.redirect(`/admin/timetable/new?year=${year}&branch=${branch}&section=${section}`);
      }

      // Initialize an array to hold the period documents
      let periods = [];

      // Check if the request is for a special period (like lunch, sports, or library)
      if (subject.type=='Non-Academic') {
          const newPeriod = new Period({
              hour,
              day: dayName,
              branch,
              year,
              section,
              subject,
              room,
              semester,
              startTime,
              endTime,
              specialPeriod:subject.name,
              faculty: null, // No faculty for special periods
          });

          let period = await newPeriod.save();
          periods.push(period._id);
          console.log(newPeriod);
      } else if (batchDetails && batchDetails.length > 0) {
          // Create a period for each batch detail
          for (const { batchId, subject, faculty } of batchDetails) {
              if (!subject || !faculty) {
                  req.flash('error', 'Subject and Faculty must be selected for each batch.');
                  return res.json({ success: false, message: 'Subject and Faculty must be selected for each batch.' });
              }
              const newPeriod = new Period({
                  hour,
                  day: dayName,
                  branch,
                  year,
                  section,
                  subject,
                  room,
                  semester,
                  startTime,
                  endTime,
                  faculty,
                  batch: batchId
              });

              let period = await newPeriod.save();
              period = await period.populate('subject faculty'); // Populate subject and faculty in the period
              periods.push(period._id);
          }
      } else {
          // Create a standard period without batches
          const newPeriod = new Period({
              hour,
              day: dayName,
              branch,
              year,
              section,
              subject,
              room,
              semester,
              startTime,
              endTime,
              faculty
          });

          let period = await newPeriod.save();
          period = await period.populate('subject faculty'); // Populate subject and faculty in the period
          periods.push(period._id);
      }

      // Find or create the timetable
      let timetable = await Timetable.findOne({ year, branch, section, semester });
      if (!timetable) {
          timetable = new Timetable({ year, branch, section, semester, periods: [] });
      }

      // Add the periods to the timetable and save
      timetable.periods.push(...periods);
      console.log(periods);
      await timetable.save();

      if (batchDetails && batchDetails.length > 0) {
          // Update faculty with the new periods
          for (const { faculty } of batchDetails) {
              await Faculty.findByIdAndUpdate(faculty, { $push: { periods: { $each: periods } } });
          }
      } else if (faculty) {
          await Faculty.findByIdAndUpdate(faculty, { $push: { periods: { $each: periods } } });
      }

      req.flash('success', 'Period(s) added successfully');
      res.json({ success: true, periods: periods });
  } catch (error) {
      console.error('Error adding period:', error);
      req.flash('error', 'Error adding period');
      res.json({ success: false, error: error.message });
  }
});


router.put('/timetable/period/:id', async (req, res) => {
  try {
      const { subject, faculty, startTime, endTime, batches, room } = req.body;

      // Parse batches if it's a JSON string
      const batchArray = Array.isArray(batches) ? batches : JSON.parse(batches || '[]');

      // Create an update object
      let updateData = {
          subject,
          startTime,
          endTime,
          room,
      };

      // Conditionally add faculty to the update object if it's not null
      if (faculty) {
          updateData.faculty = faculty;
      }

      // Conditionally add batch to the update object if it's not empty
      if (batchArray.length > 0) {
          updateData.batch = batchArray;
      }

      // Update the period with the provided details
      await Period.findByIdAndUpdate(req.params.id, updateData);

      res.json({ success: true });
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
  }
});




router.get('/timetables', async (req, res) => {
  const { section, year, branch, semester } = req.query;
  const timetable = await Timetable.findOne({ section, year, branch, semester });
  res.json(timetable);
});
router.get('/timetable/new', async (req, res) => {
  let { numPeriods, numDays = 7, section, branch, semester, year } = req.query;
  let periods = [];
  let newTimetable = new Timetable({ section, semester, year, branch, periods,numPeriods});
  let timetable = await newTimetable.save();
  res.redirect(`/admin/timetable/${timetable._id}`);
});

router.get('/timetable/:id', async (req, res) => {
  let { id } = req.params;
  
  try {
    let timetable = await Timetable.findById(id)
      .populate({
        path: 'periods',
        populate: {
          path: 'subject faculty',
          select: 'name type'
        }
      })
      .populate('branch section year semester')
      .exec();

    const { section, year, branch, semester } = timetable;

    // Fetch all periods, including special (Non-Academic) periods
    const periods = await Period.find({
      section,
      year,
      branch,
      semester
    })
    .populate('batch')
    .populate('subject')
    .populate('faculty');

    // Group periods by day and hour, including special periods
    let groupedPeriods = periods.reduce((acc, period) => {
      const day = period.day;
      const hour = period.hour;
      if (!acc[day]) acc[day] = {};
      if (!acc[day][hour]) acc[day][hour] = [];
      acc[day][hour].push(period);
      return acc;
    }, {});

    console.log(timetable.periods);

    // Render the view and pass groupedPeriods to it
    res.render('admin/timetable/viewTimetable', {
      timetable, // Pass the timetable data
      groupedPeriods, // Pass the grouped periods data including special periods
    });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    req.flash('error', 'Error fetching timetable');
    res.redirect('/admin/timetable');
  }
});


// Route to delete a period
router.delete('/timetable/period/:id', isAdminLoggedIn, async (req, res) => {
  try {
    const period = await Period.findByIdAndDelete(req.params.id);
    if (period) {
      res.json({ success: true, message: 'Period deleted successfully' });
    } else {
      res.json({ success: false, message: 'Period not found' });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Error deleting period' });
  }
});

// Route to display the student management page with search functionality
// Fetch students and other required data
router.get('/student', async (req, res) => {
  try {
      const students = await Student.find({})
          .populate('branch')
          .populate('year');
      const academicYears = await AcademicYear.find({});
      const branches = await Branch.find({});
      const sections = await Section.find({});
      res.render('admin/student/student', { students, academicYears: academicYears, branches, sections });
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
// Route to handle the search query and return filtered students
router.get('/student/search', isAdminLoggedIn, async (req, res) => {
  const { username, branch, year, section } = req.query;
  let filter = {};

  if (username) {
      filter.username = { $regex: username, $options: 'i' };
  }
  if (branch) {
      filter.branch = branch;
  }
  if (year) {
      filter.year = year;
  }
  if (section) {
      filter.section = section;
  }

  const students = await Student.find(filter).populate('section');
  const sections = await Section.find({});
  const academicYears=await AcademicYear.find({name:year});

  res.render('admin/student/student', { students, sections,academicYears:academicYears });
});
// Render the signup form with academic years and branches
router.get('/student/new', async (req, res) => {
  try {
      const academicYears = await AcademicYear.find({});
      const branches = await Branch.find({});
      res.render('admin/student/createStudent', { academicYears, branches });
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
// Load branches based on academic year
router.get('/branch/:yearId', isAdminLoggedIn, async (req, res) => {
  const branches = await Branch.find({ academicYear: req.params.yearId });
  res.json({ branches });
});

// Load sections based on branch
router.get('/sections/:branchId', isAdminLoggedIn, async (req, res) => {
  const sections = await Section.find({ branch: req.params.branchId });
  res.json({ sections });
});
// Handle student signup form submission
router.post('/student/new', async (req, res) => {
  try {
      const { name, email, username, password, year, branch, gender } = req.body;
      const newStudent = new Student({ name, email, username, year, branch, gender });
      let registeredStudent = await Student.register(newStudent, password);
      res.redirect('/admin/student');
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
// GET /admin/student/:id
router.get('/student/:id', async (req, res) => {
  try {
      const studentId = req.params.id;
      const student = await Student.findById(studentId)
          .populate('branch')
          .populate('year')
          .populate('section')
          .exec();

      if (!student) {
          return res.status(404).send('Student not found');
      }

      res.render('admin/student/viewStudent', { student: student });
  } catch (error) {
      console.error('Error fetching student:', error);
      res.status(500).send('Error fetching student');
  }
});
// Search subjects
router.get('/subjects/search', async (req, res) => {
  const { q } = req.query;
  const subjects = await Subject.find({ name: new RegExp(q, 'i') });
  res.json(subjects);
});
router.put('/faculty/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { email, name, branch, mobile, pan, aadhar, motherName, fatherName, subjects } = req.body;

      // Update the faculty details
      const updatedFaculty = await Faculty.findByIdAndUpdate(id, {
          email,
          name,
          branch,
          mobile,
          pan,
          aadhar,
          motherName,
          fatherName,
          subjects: Array.isArray(subjects) ? subjects : [subjects] // Ensure it's an array even if only one subject is selected
      }, { new: true });

      req.flash('success', 'Faculty updated successfully');
      res.redirect(`/admin/faculty/${updatedFaculty._id}`);
  } catch (e) {
      req.flash('error', 'Error updating faculty');
      res.redirect('/admin/faculty');
  }
});
// Route to render the faculty management page
router.get('/faculty', async (req, res) => {
  try {
      const branches = await Branch.find({});
      const subjects = await Subject.find({});
      res.render('admin/faculty/faculty', { branches, subjects, faculties: [] }); // Initial load with empty faculties array
  } catch (error) {
      console.error('Error fetching branches or subjects:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Render the new faculty creation page
router.get('/faculty/new', async (req, res) => {
  const branches = await Branch.find({});
  res.render('admin/faculty/newFaculty', { branches });
});

// Handle faculty creation
router.post('/faculty/new', async (req, res) => {
  try {
      const { email, name, branch, password, username, mobile, subjects } = req.body;
      if (!name || !email || !branch || !password || !username || !mobile) {
        req.flash('error', 'All fields are required');
        return res.redirect('/admin/register-faculty');
      }
      // Create new faculty instance
      const faculty = new Faculty({
          email,
          name,
          branch,
          username,
          mobile,
          subjects: Array.isArray(subjects) ? subjects : [subjects] // Ensure subjects is an array
      });

      // Set password using passport-local-mongoose
      const registeredFaculty=Faculty.register(faculty, password, (err, faculty) => {
          if (err) {
              console.error('Error registering faculty:', err);
              return res.json({ success: false, message: 'Error registering faculty' });
          }
          res.json({ success: true });
      });
  } catch (error) {
    console.error('Error registering faculty:', error);

    if (error.code === 11000) {
      if (error.keyPattern.email) {
        req.flash('error', 'Email already exists');
      } else if (error.keyPattern.username) {
        req.flash('error', 'Username already exists');
      }
    } else {
      req.flash('error', 'Error registering faculty');
    }
      res.json({ success: false, message: 'Error saving faculty' });
  }
});

// Search subjects
router.get('/subjects/search', async (req, res) => {
  const { q } = req.query;
  const subjects = await Subject.find({ name: new RegExp(q, 'i') });
  res.json(subjects);
});

// Fetch subjects based on branch, semester, and academic year
router.get('/subjects', async (req, res) => {
  const { branch, semester, academicYear } = req.query;
  const subjects = await Subject.find({ branch, semester, academicYear });
  res.json(subjects);
});
const DaysOfWeek = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};
function convertDayNumberToEnum(dayNumber) {
  const days = [
    DaysOfWeek.MONDAY,
    DaysOfWeek.TUESDAY,
    DaysOfWeek.WEDNESDAY,
    DaysOfWeek.THURSDAY,
    DaysOfWeek.FRIDAY,
    DaysOfWeek.SATURDAY,
    DaysOfWeek.SUNDAY
  ];
  return days[dayNumber - 1] || null; // dayNumber - 1 to convert 1-based to 0-based index
}
router.get('/batches', async (req, res) => {
  const { section } = req.query;
  const batches = await Batch.find({ section });
  // Convert the array of objects into an array of batch names
  const batchNames = batches.map(batch => batch);

  // Optionally, you could return this array if that's what you need
  res.json(batchNames);
});

// Fetch faculties based on subject and availability
router.get('/faculties', async (req, res) => {
  const { subject, day, hour,faculty } = req.query;
  // Convert numeric day to enum day
  const dayEnum = convertDayNumberToEnum(Number(day));
  console.log(req.query);
  if (!dayEnum) {
    return res.status(400).json({ message: 'Invalid day number' });
  }
  // Validate subject ID
  if (!subject || !mongoose.Types.ObjectId.isValid(subject)) {
    return res.status(400).json({ message: 'Invalid or missing subject ID' });
  }

  try {
    // Find faculties teaching the subject
    const faculties = await Faculty.find({ subjects: { $in: [subject] } })
    .populate('subjects') // Populating subjects array
    .populate('periods') // Populating periods array
    .populate('branch'); // Populating branch

    // Filter out faculties who have a period at the same day and hour
    const availableFaculties = [];
    for (let faculty of faculties) {

      const periods = await Period.find({ faculty: faculty._id, day: dayEnum, hour: hour });
      if (periods.length === 0) {
        availableFaculties.push(faculty);
      }
    }
    console.log(faculties);
    console.log(availableFaculties);
    res.json(availableFaculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Error fetching faculties' });
  }
});

router.get('/faculty/search', async (req, res) => {
  const { username } = req.query;
  
  try {
      // Ensure you're querying by `username` and not `_id`
      const faculties = await Faculty.find({ username: { $regex: username, $options: 'i' } }).select('_id username name');
      res.json(faculties);
  } catch (err) {
      console.error('Error fetching faculty:', err);
      res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/faculty/:id', async (req, res) => {
  try {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const faculty = await Faculty.findById(req.params.id)
          .populate('branch')
          .populate('subjects');
          let weeklyTimetable = {};

          for (let day of daysOfWeek) {
              let periods = await Period.find({ faculty: faculty._id, day: day })
                  .populate('subject')
                  .populate('year')
                  .populate('branch')
                  .populate('section');
  
              weeklyTimetable[day] = periods;
              console.log(weeklyTimetable);
          }
      res.render('admin/faculty/facultyView', { faculty,weeklyTimetable });
  } catch (error) {
      console.error('Error fetching faculty:', error);
      res.status(500).send('Internal Server Error');
  }
});

router.get('/faculty/:id/edit', async (req, res) => {
  try {
      const faculty = await Faculty.findById(req.params.id).populate('subjects');
      const branches = await Branch.find({});
      const subjects = await Subject.find({});
      res.render('admin/faculty/facultyEdit', { faculty, branches, subjects });
  } catch (error) {
      console.error('Error fetching faculty:', error);
      res.status(500).send('Internal Server Error');
  }
});

router.post('/faculty/:id', async (req, res) => {
  try {
      const { name, email, branch, mobile, subjects } = req.body;
      await Faculty.findByIdAndUpdate(req.params.id, { name, email, branch, mobile, subjects });
      res.redirect('/admin/faculty');
  } catch (error) {
      console.error('Error updating faculty:', error);
      res.status(500).send('Internal Server Error');
  }
});
router.delete('/faculty/:id', async (req, res) => {
  try {
      await Faculty.findByIdAndDelete(req.params.id);
      res.redirect('/admin/faculty');
  } catch (error) {
      console.error('Error deleting faculty:', error);
      res.status(500).send('Internal Server Error');
  }
});


// Fetch all sections along with their branches and academic years
router.get('/section', async (req, res) => {
  try {
      const sections = await Section.find({})
          .populate({
              path: 'branch',
              populate: {
                  path: 'academicYear',
                  model: 'AcademicYear'
              }
          });
      res.render('admin/section/section', { sections });
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
router.get('/attendance', async (req, res) => {
  // const { student, subject, date, status, period, branch, section, semester, year } = req.query;

  // let filter = {};
  // if (student) filter.student = student;
  // if (subject) filter.subject = subject;
  // if (date) filter.date = new Date(date);
  // if (status !== undefined) filter.status = status.toLowerCase() === 'present';
  // if (period) filter.period = period;
  // if (branch) filter.branch = branch;
  // if (section) filter.section = section;
  // if (semester) filter.semester = semester;
  // if (year) filter.year = year;

  try {
    // const attendances = await Attendance.find(filter)
    //   .populate('student subject branch section semester year');
    // res.render('admin/attendance/attendance', { attendances });
    res.render('admin/attendance/attendance');
  } catch (error) {
    console.error('Error fetching attendances:', error);
    req.flash('error', 'Error fetching attendances');
    res.redirect('/admin');
  }
});
// Handle attendance submission
router.post('/attendance', isAdminLoggedIn, async (req, res) => {
  const { attendance } = req.body; // attendance should be an array of { studentId, status }
  try {
    for (let entry of attendance) {
      await Attendance.create({
        student: entry.studentId,
        status: entry.status
      });
    }
    req.flash('success', 'Attendance recorded successfully');
    res.redirect('/admin/attendance');
  } catch (err) {
    req.flash('error', 'Error recording attendance');
    res.redirect('/admin/attendance');
  }
});
router.get("/section/new",(req,res)=>{
  res.render("admin/section/createSection.ejs");
});
router.get('/section/:id/edit', isAdminLoggedIn, async (req, res) => {
  try {
      const section = await Section.findById(req.params.id).populate('year').populate('branch').populate('class_teacher');;
      if (!section) {
          req.flash('error', 'section not found');
          return res.redirect('/admin/section');
      }
      console.log(section);
      res.render('admin/section/sectionEdit.ejs', { section });
  } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred');
      res.redirect('/admin/section');
  }
});
router.post('/section/:id/edit', async (req, res) => {
  const { name, branch, class_teacher, room_no } = req.body;
  try {
      await Section.findByIdAndUpdate(req.params.id, {
          name,
          branch,
          class_teacher,
          room_no
      });
      res.redirect('/admin/section'); // Adjust this redirect as needed
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
// Create New Section
router.post('/section/new', async (req, res) => {
  const { name, branch, class_teacher, room_no,year } = req.body;
  try {
    const existingSection = await Section.findOne({ branch, name });
      if (existingSection) {
          return res.status(400).send('Section name must be unique within the branch');
      }
      const section = new Section({
          name,
          branch,
          class_teacher,
          room_no,
          year
      });
      await section.save();
      res.redirect('/admin/section'); // Adjust this redirect as needed
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
// Fetch faculties based on query
router.get('/faculti', async (req, res) => {
  const { username, subject, branch } = req.query;

  // Build search query
  const searchQuery = {};
  if (username) searchQuery.username = username;
  if (subject && mongoose.Types.ObjectId.isValid(subject)) searchQuery.subjects = { $in: [subject] };
  if (branch && mongoose.Types.ObjectId.isValid(branch)) searchQuery.branch = branch;

  try {
    const faculties = await Faculty.find(searchQuery)
      .populate('branch')
      .populate('subjects');

      const branches = await Branch.find({});
      const subjects = await Subject.find({});
  
      res.render('admin/faculty/faculty', { faculties, branches, subjects });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Error fetching faculties' });
  }
});

router.get("/section/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const section = await Section.findById(id)
      .populate({
        path: 'students.student', // Populate student details
      });
    const students = section.students.map(item => ({
      ...item.student._doc, // Spread the student document
    }));

    if (!section) {
      req.flash('error', 'Section not found');
      return res.redirect('/admin/section');
    }

    res.render("admin/section/showSection.ejs", { students, id, section });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong');
    res.redirect('/admin/section');
  }
});

router.get('/student/:id/edit', isAdminLoggedIn, async (req, res) => {
  try {
      const student = await Student.findById(req.params.id);
      if (!student) {
          req.flash('error', 'Student not found');
          return res.redirect('/admin/student');
      }
      res.render('admin/student/studentEdit.ejs', { student });
  } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred');
      res.redirect('/admin/student');
  }
});

// Route to handle the student update
router.put('/student/:id', isAdminLoggedIn, async (req, res) => {
  const { name, email, username, dept, year, gender } = req.body;
  try {
      await Student.findByIdAndUpdate(req.params.id, { name, email, username, dept, year, gender });
      req.flash('success', 'Student updated successfully');
      res.redirect(`/admin/student/${req.params.id}`);
  } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred while updating the student');
      res.redirect(`/admin/student/${req.params.id}/edit`);
  }
});
// Route to delete a student
router.delete('/student/:id', isAdminLoggedIn, async (req, res) => {
  const studentId = req.params.id;
  try {
    // Find the student
    const student = await Student.findByIdAndDelete(studentId);
    if (!student) {
      req.flash('error', 'Student not found');
      return res.redirect('/admin/student');
    }

    // Remove the student from all sections they are enrolled in
    await Section.updateMany({ students: studentId }, { $pull: { students: studentId } });

    // // Delete the student
    // await student.remove();

    req.flash('success', 'Student deleted successfully');
    res.redirect( '/admin/student'); // Redirect back to the previous page or /admin/student if referer is not present
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete student');
    res.redirect( '/admin/student');
  }
});
// Route to display form for adding students to a section
router.get('/section/:id/add-student', isAdminLoggedIn, async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate({
        path: 'students.student', // Populate student details
      });

    const id = section._id;
    const students = section.students.map(item => ({
      ...item.student._doc, // Spread the student document
    }));
    res.render('admin/section/addStudentToSection.ejs', { section, id, students });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.get('/section/:id/search-students', isAdminLoggedIn, async (req, res) => {
  try {
    const searchQuery = req.query.term;
    // Find students who do not have a section assigned and match the search query
    const students = await Student.find({
      username: { $regex: searchQuery, $options: 'i' }, // Case-insensitive search by username
      section: null // Students with a null section reference
    });
    
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// Route to add a student to a section
router.post('/section/:id/add-student', isAdminLoggedIn, async (req, res) => {
  try {
    const sectionId = req.params.id;
    const { studentId } = req.body; // Expecting batchId from the request

    const section = await Section.findById(sectionId);
    const student = await Student.findById(studentId);

    if (!student.section) {
      // Update the student's section
      student.section = sectionId;
      await student.save();

      // Add student to the section along with the batch reference
      section.students.push({
        student: studentId,
        batch: null
      });
      await section.save();

      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Student is already in another section.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Route to delete a section
router.delete('/section/:id', isAdminLoggedIn, async (req, res) => {
  try {
      const { id } = req.params;
      // Find the section by ID and remove it
      const section = await Section.findByIdAndDelete(id);

      // If the section has students, update their section field to null
      await Student.updateMany({ section: id }, { section: null });

      if (!section) {
          req.flash('error', 'Section not found');
          return res.redirect('/admin/section');
      }

      req.flash('success', 'Section deleted successfully');
      res.redirect('/admin/section');
  } catch (err) {
      console.error(err);
      req.flash('error', 'An error occurred while deleting the section');
      res.redirect('/admin/section');
  }
});


// Route to edit student details
router.get('/section/:id/edit-student/:studentId', isAdminLoggedIn, async (req, res) => {
  const student = await Student.findById(req.params.studentId);
  res.render('admin/student/editStudent.ejs', { student, sectionId: req.params.id });
});

router.put('/section/:id/edit-student/:studentId', isAdminLoggedIn, async (req, res) => {
  try {
    const { name, email, username, dept, year, gender } = req.body;
    const studentId = req.params.studentId;

    // Update the student details
    await Student.findByIdAndUpdate(studentId, { name, email, username, dept, year, gender });

    req.flash('success', 'Student updated successfully');
    res.redirect( `/admin/section/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update student');
    res.redirect(`/admin/section/${req.params.id}`);
  }
});

// Route to remove a student from a section
router.put('/section/:sectionId/delete-student/:studentId', isAdminLoggedIn, async (req, res) => {
  const { sectionId, studentId } = req.params;
  try {
    // Find the section by ID
    const section = await Section.findById(sectionId);
    if (!section) {
      req.flash('error', 'Section not found');
      return res.redirect(req.headers.referer || '/admin/section');
    }

    // Remove the student object from the section's students array
    section.students = section.students.filter(student => student.student.toString() !== studentId);
    await section.save();

    // Unset the section field in the student document
    await Student.findByIdAndUpdate(studentId, { $unset: { section: 1 } });

    req.flash('success', 'Student removed from section');
    res.redirect(`/admin/section/${sectionId}/add-student`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to remove student from section');
    res.redirect(`/admin/section/${sectionId}/add-student`);
  }
});


// Display form to create a new batch
router.get('/section/:id/create-batch', async (req, res) => {
  const { id } = req.params;
  const section = await Section.findById(id);
  res.render('admin/section/createBatch', { section });
});

// Handle creation of a new batch
router.post('/section/:id/create-batch', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  // Create and save the new batch
  const newBatch = new Batch({ name, section: id });
  await newBatch.save();

  res.redirect(`/admin/section/${id}/batches`);
});


// Display all batches in a section
router.get('/section/:id/batches', async (req, res) => {
  const { id } = req.params;

  // Populate the batches of the section
  const section = await Section.findById(id).populate({
    path: 'students.batch',
    match: { section: id }
  });
  const batches=await Batch.find({section:id});
  res.render('admin/section/viewBatches', { section,batches });
});


// View students in a specific batch
router.get('/section/:id/batch/:batchId', async (req, res) => {
  const { id, batchId } = req.params;

  // Fetch the section and populate students belonging to the specific batch
  const section = await Section.findById(id)
      .populate({
          path: 'students',
          populate: { path: 'batch', match: { _id: batchId } }
      })
      .populate({
        path: 'students',
        populate: { path: 'student' }
    });
      
  const batch = await Batch.findById(batchId);
  
  // Filter students who belong to the batch
  const batchStudents = section.students.filter(s => s.batch && s.batch.equals(batchId));
  res.render('admin/section/viewBatchStudents', { section, batch, batchStudents });
});


// Add student to a batch
router.post('/section/:id/batch/:batchId/add-student', async (req, res) => {
  const { id, batchId } = req.params;
  const { studentId } = req.body;

  const section = await Section.findById(id);

  // Find the student in the section and assign them to the batch
  const studentIndex = section.students.findIndex(s => s.student.toString() === studentId);
  if (studentIndex !== -1) {
      section.students[studentIndex].batch = batchId;
      await section.save();
  }

  res.redirect(`/admin/section/${id}/batch/${batchId}`);
});


// Remove student from a batch
router.post('/section/:id/batch/:batchId/remove-student/:studentId', async (req, res) => {
  const { id, batchId, studentId } = req.params;

  const section = await Section.findById(id);

  // Find the student in the section and remove them from the batch
  const studentIndex = section.students.findIndex(s => s.student.toString() === studentId);
  if (studentIndex !== -1) {
      section.students[studentIndex].batch = null;
      await section.save();
  }

  res.redirect(`/admin/section/${id}/batch/${batchId}`);
});


// Delete a batch
router.post('/section/:id/batch/:batchId/delete', async (req, res) => {
  const { id, batchId } = req.params;

  // Delete the batch
  await Batch.findByIdAndDelete(batchId);

  // Remove the batch reference from students and section
  const section = await Section.findById(id);
  section.students.forEach(student => {
    if (student.batch && student.batch.equals(batchId)) {
      student.batch = null;
    }
  });
  await section.save();

  res.redirect(`/admin/section/${id}/batches`);
});


// Route to handle search query for students without a batch
router.get('/section/:id/search-students-no-batch', async (req, res) => {
  const { id } = req.params;
  const searchQuery = req.query.term;

  // Fetch the section and populate students without a batch
  const section = await Section.findById(id)
      .populate({
          path: 'students.student',
          match: { username: new RegExp(searchQuery, 'i') }
      });

  // Filter out students who do not have a batch
  const studentsNoBatch = section.students
      .filter(s => !s.batch)
      .map(s => s.student);

  res.json(studentsNoBatch);
});

router.get('/non-academic-subjects', async (req, res) => {
  try {
    const nonAcademicSubjects = await Subject.find({ type: 'Non-Academic' });
    res.json(nonAcademicSubjects);
  } catch (error) {
    console.error('Error fetching non-academic subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
