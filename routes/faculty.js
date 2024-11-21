const express = require('express');
const pdf = require('html-pdf');
const passport = require('passport');
const router = express.Router({ mergeParams: true });
const { isFacultyLoggedIn, saveRedirectUrl, validateDownload, canModifyAttendance } = require('../middleware.js');
const wrapAsync = require('../utils/wrapAsync.js');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const multer =require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Resource = require('../models/Resource');
const exceljs = require('exceljs');
const Marks = require('../models/studentMarks'); // Adjust the path as necessary
const { PDFDocument, rgb,StandardFonts } = require('pdf-lib');
const facultyController = require("../controllers/faculty.js");
const Student = require('../models/student');
const Faculty = require('../models/faculty');
const Section = require('../models/section');
const Timetable = require('../models/timetable');
const Period = require('../models/period');
const Branch = require('../models/branch');
const Semester = require('../models/semester');
const AcademicYear = require('../models/academicYear');
const Subject = require('../models/subject');
const Attendance = require('../models/attendance');
const mongoose = require('mongoose');
let { ObjectId } = mongoose.Types;
const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const {xlsx} = require('xlsx');
const { 
    getMarkingScheme, 
    getSectionMarks, 
    saveMarks,
    downloadMarksSheet
} = require("../controllers/marks.js");

// OAuth2 client setup
const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'http://localhost:2000/admin/oauth2/callback'  // Replace with your redirect URL
);

// Drive file upload function
async function uploadToGoogleDrive(fileBuffer, fileName, mimeType) {
  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: fileBuffer
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}

router.get('/subject',async(req,res)=>{
  try {
    const faculty=await Faculty.findById(req.user._id).populate({
      path: 'subjects',
      select:'name'
  });
  const subjects=faculty.subjects;
  res.json(subjects);
} catch (err) {
    res.status(500).send('Server Error');
}
});

router.post('/submitAttendance', isFacultyLoggedIn, async (req, res) => {
  const { date, section, acYear, branch, sem, periods, attendance, batch, students, periodsMatched, subject } = req.body;

  try {
      // Log and validate `section`
      console.log("Received section ID:", section);
      if (!mongoose.Types.ObjectId.isValid(section)) {
          return res.status(400).send('Invalid or missing section ID');
      }

      // Convert date to the day of the week
      const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' });
      const semester = await Semester.findById(sem);
      if (!semester) {
          return res.status(400).send('Invalid semester ID');
      }

      // Fetch periods data with additional logging
      const periodsData = await Period.find({
          section: new mongoose.Types.ObjectId(section),
          day: dayOfWeek,
          year: new mongoose.Types.ObjectId(acYear),
          branch: new mongoose.Types.ObjectId(branch),
          semester: new mongoose.Types.ObjectId(sem),
          hour: { $in: periods.map(Number) },
          batch: batch ? batch : null
      }).populate('subject');

      console.log("Fetched periods data:", periodsData);

      if(periodsData.length === 0) {
          return res.status(400).send('No periods data found for the selected criteria.');
      }
      // Create attendance records for each period
      for (const period of periodsData) {
          const studentsAttendance = students.map(studentId => ({
              student: new mongoose.Types.ObjectId(studentId),
              status: attendance[studentId] === 'true'
          }));

          const newAttendance = new Attendance({
              date: new Date(date),
              section: new mongoose.Types.ObjectId(section),
              year: new mongoose.Types.ObjectId(acYear),
              branch: new mongoose.Types.ObjectId(branch),
              semester: new mongoose.Types.ObjectId(sem),
              period: period._id,
              subject: periodsMatched ? period.subject._id : subject,
              students: studentsAttendance,
              batch: batch ? new mongoose.Types.ObjectId(batch) : null,
              created_by: req.user._id
          });

          const savedAttendance = await newAttendance.save();
          console.log("Saved attendance record:", savedAttendance);
          if (!savedAttendance) {
              return res.status(500).send('Error saving attendance');
          }
      }
      res.redirect('/faculty/attendance?sectionId=' + section);
  } catch (err) {
      console.error("Error in submitAttendance:", err);
      res.status(500).send('Server Error');
  }
});

// Fetch semesters by academic year
router.get('/semester', wrapAsync(async (req, res) => {
    try {
        const { year } = req.query;
        const semesters = await Semester.find({});
        const branches = await Branch.find({ academicYear: year });
        res.json({ semesters, branches });
    } catch (err) {
        res.status(500).send('Server Error');
    }
}));

// Fetch branches by academic year
router.get('/branch', wrapAsync(async (req, res) => {
    try {
        const { year } = req.query;
        const branches = await Branch.find({ academicYear: year });
        res.json(branches);
    } catch (err) {
        res.status(500).send('Server Error');
    }
}));

// Fetch sections by branch and semester
router.get('/sections', wrapAsync(async (req, res) => {
    try {
        const { branch, sem } = req.query;
        const sections = await Section.find({ branch });
        res.json(sections);
    } catch (err) {
        res.status(500).send('Server Error');
    }
}));

// Logout route
router.get('/logout', facultyController.logout);

// Route to handle showing attendance
router.post('/showAttendance', wrapAsync(async (req, res) => {
    try {
        let { date, section, acYear, periods, branch, sem, subject, batch, periodsMatched } = req.body;
        const selectedDate = new Date(date);

        const dayOfWeek = selectedDate.toLocaleString('en-US', { weekday: 'long' });
        // Fetch periods information
        const periodsData = await Period.find({
            section: new mongoose.Types.ObjectId(section),
            day: dayOfWeek,
            year: new mongoose.Types.ObjectId(acYear),
            branch: new mongoose.Types.ObjectId(branch),
            semester: new mongoose.Types.ObjectId(sem),
            hour: periods,
            batch: batch ? new mongoose.Types.ObjectId(batch) : null
        }).populate('subject');
        if (periodsData.length === 0) {
            req.flash('error', 'No periods data found for the selected criteria.');
            return res.redirect('/faculty/attendance?sectionId=' + section);
        }
        // Fetch attendance records
        let attendance = await Attendance.find({
            date: selectedDate,
            section: new mongoose.Types.ObjectId(section),
            year: new mongoose.Types.ObjectId(acYear),
            branch: new mongoose.Types.ObjectId(branch),
            semester: new mongoose.Types.ObjectId(sem),
            period: periodsData[0]._id,
            subject: periodsMatched ? new mongoose.Types.ObjectId(subject) : periodsData[0].subject._id,
            batch: batch ? new mongoose.Types.ObjectId(batch) : null,
            created_by: req.user._id
        }).populate('students.student');

        if (attendance.length === 0) {
            req.flash('error', 'No attendance records found for the selected criteria.');
            return res.redirect('/faculty/attendance?sectionId=' + section);
        }

        res.render('faculty/showAttendance.ejs', { attendance,section });

    } catch (error) {
        console.error('Error fetching attendance records:', error);
        req.flash('error', 'An internal server error occurred.');
        res.redirect('/faculty/attendance?sectionId=' + section);
    }
}));

router.post('/modifyAttendance', isFacultyLoggedIn, wrapAsync(async (req, res) => {
    let { date, section, acYear, periods, branch, sem, subject, batch, periodsMatched } = req.body;
    const today = new Date();
    const selectedDate = new Date(date);
    
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' });
    if (today.getTime() !== selectedDate.getTime()) {
        req.flash('error', 'You can only modify attendance for today\'s date.');
        return res.redirect('/faculty/attendance?sectionId=' + section);
    }
    // Fetch periods information
    const periodsData = await Period.find({
        section: new mongoose.Types.ObjectId(section),
        day: dayOfWeek,
        year: new mongoose.Types.ObjectId(acYear),
        branch: new mongoose.Types.ObjectId(branch),
        semester: new mongoose.Types.ObjectId(sem),
        hour: periods,
        batch: batch ? batch : null
    }).populate('subject');
    console.log( new Date(date),
    new mongoose.Types.ObjectId(section), new mongoose.Types.ObjectId(acYear),
     new mongoose.Types.ObjectId(branch),
    new mongoose.Types.ObjectId(sem),
     periodsData[0]._id,
 batch // Include batch if provided
    ,req.user._id,periodsMatched?subject:periodsData[0].subject._id);
    try {
        let attendance = await Attendance.find({
                date: new Date(date),
                section: new mongoose.Types.ObjectId(section),
                year: new mongoose.Types.ObjectId(acYear),
                branch: new mongoose.Types.ObjectId(branch),
                semester: new mongoose.Types.ObjectId(sem),
                period: periodsData[0]._id,
                subject: periodsMatched?new mongoose.Types.ObjectId(subject):periodsData[0].subject._id,
                batch: batch ? new mongoose.Types.ObjectId(batch) : null, // Include batch if provided
                created_by: req.user._id
        }).populate('students.student');
        console.log(attendance);
        if (attendance.length === 0) {
            req.flash('error', 'No attendance records found for the selected criteria.');
            return res.redirect('/faculty/attendance?sectionId=' + section);
        }

        res.render('faculty/modifyAttendance.ejs', { attendance });
    } catch (error) {
        console.error('Error finding attendance records:', error);
        req.flash('error', 'An internal server error occurred.');
        res.redirect('/faculty/attendance?sectionId=' + section);
    }
}));

router.post('/saveModifiedAttendance', isFacultyLoggedIn, wrapAsync(async (req, res) => {
    const { attendanceId, updatedAttendance,section } = req.body;

    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
        return res.status(404).send('Attendance record not found1.');
    }

    // Update attendance statuses
    attendanceRecord.students.forEach(studentRecord => {
        if (updatedAttendance[studentRecord.student._id]) {
            studentRecord.status = updatedAttendance[studentRecord.student._id] === 'true';
        }
    });

    await attendanceRecord.save();

    res.redirect('/faculty/attendance?sectionId=' + section);  // Redirect back to the attendance form
}));

router.post('/confirmModification', isFacultyLoggedIn, wrapAsync(async (req, res) => {
    const { attendanceId, updatedAttendance, section, date, period, subject, batch } = req.body;

    const attendanceRecord = await Attendance.findById(attendanceId).populate('students.student');

    if (!attendanceRecord) {
        return res.status(404).send('Attendance record not found.');
    }

    // Prepare the data for review
    const reviewData = attendanceRecord.students.map(studentRecord => ({
        student: studentRecord.student,
        originalStatus: studentRecord.status,
        newStatus: updatedAttendance[studentRecord.student._id] === 'true'
    }));

    // Calculate before and after modification counts
    const beforeModification = attendanceRecord.students.reduce((acc, studentRecord) => {
        studentRecord.status ? acc.present++ : acc.absent++;
        return acc;
    }, { present: 0, absent: 0 });

    const afterModification = reviewData.reduce((acc, studentRecord) => {
        studentRecord.newStatus ? acc.present++ : acc.absent++;
        return acc;
    }, { present: 0, absent: 0 });

    res.render('faculty/ReviewModification', {
        reviewData,
        attendanceId,
        beforeModification,
        afterModification,
        section,
        date,
        period,
        subject,
        batch,
        updatedAttendance
    });
}));

// Fetch periods based on section, date, and action (new or modify)
router.get('/fetchPeriods', isFacultyLoggedIn, async (req, res) => {
    try {
        const { section, date, acYear, branch, sem, action, facultyId } = req.query;
        let day = new Date(date).toLocaleString('en-US', { weekday: 'long' });
        // Fetch periods
        const periods = await Period.find({ section, semester: sem, branch, year: acYear,day,faculty: req.user._id }).populate('subject faculty branch year section batch');
        let attendanceRecords = await Attendance.find({ section, semester: sem, branch, year: acYear, date: new Date(date)}).populate('period');
        let enabledPeriods = [1,2,3,4,5,6,7];
        if (action === 'markAttendance') {
            enabledPeriods=[];
            const attendedPeriodHours = attendanceRecords.map(record => record.period.hour);
            enabledPeriods = attendedPeriodHours;
        } else if (action === 'modifyAttendance') {
            enabledPeriods = attendanceRecords
                .filter(record => record.created_by.equals(facultyId))
                .map(record => record.period.hour);
        }else if (action === 'showAttendance') {
            enabledPeriods = attendanceRecords
                .filter(record => record.created_by.equals(facultyId))
                .map(record => record.period.hour);
        }
        // Fetch available batches for the section
        const batches = await Batch.find({ section });
        res.json({ periods, enabledPeriods, batches });
    } catch (err) {
        console.error('Error fetching periods:', err);
        res.status(500).send('Server Error');
    }
});
// Routes for faculty authentication
router.route('/login')
    .get(facultyController.renderLoginForm)
    .post(saveRedirectUrl, passport.authenticate('local-faculty', { failureRedirect: '/faculty/login', failureFlash: true }), wrapAsync(facultyController.login));

router.route('/signup')
    .get(facultyController.renderSignupForm)
    .post(facultyController.signup);

router.get("/dashboard", isFacultyLoggedIn, wrapAsync(facultyController.facultyDashboard));

// Attendance routes
router.route("/attendance")
    .get(isFacultyLoggedIn, wrapAsync(async (req, res) => {
        const { sectionId } = req.query;
        if (!sectionId) {
            req.flash('error', 'Section ID is required.');
            return res.redirect('/faculty/dashboard');
        }
        await facultyController.renderAttendanceForm(req, res);
    }));

router.route("/markAttendance")
    .post(isFacultyLoggedIn, wrapAsync(facultyController.markAttendance));

// Download routes
router.route("/download")
    .get(isFacultyLoggedIn, wrapAsync(async (req, res) => {
        const { sectionId } = req.query;
        if (!sectionId) {
            req.flash('error', 'Section ID is required.');
            return res.redirect('/faculty/dashboard');
        }
        await facultyController.renderDownloadForm(req, res);
    }))
    .post(isFacultyLoggedIn, validateDownload, wrapAsync(facultyController.download));

// Your existing function to generate the PDF report
async function generatePDFReport(data) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([600, 800]);

    const title = 'Attendance Report';
    const titleFontSize = 20;
    const contentFontSize = 10;

    // Draw title
    page.drawText(title, {
        x: 50,
        y: 750,
        size: titleFontSize,
        font: font,
        color: rgb(0, 0, 0),
    });

    const tableYStart = 700;
    let tableY = tableYStart;
    const rowHeight = 20;

    const headers = ['#', 'Username', 'Name', 'Total Classes', 'Attended Classes', 'Percentage'];
    const headerXPositions = [50, 100, 200, 300, 400, 500];

    // Draw headers
    headers.forEach((header, i) => {
        page.drawText(header, {
            x: headerXPositions[i],
            y: tableY,
            size: contentFontSize,
            font: font,
            color: rgb(0, 0, 0),
        });
    });

    tableY -= rowHeight;

    // Draw data rows
    data.forEach((record, index) => {
        if (tableY < 50) {
            tableY = tableYStart;
            page = pdfDoc.addPage([600, 800]);
        }

        const values = [
            index + 1,
            record.username || 'N/A',
            record.name || 'N/A',
            record.totalClasses || '0',
            record.attendedClasses || '0',
            record.percentage ? record.percentage.toFixed(2) : '0.00'
        ];

        values.forEach((value, i) => {
            page.drawText(value.toString(), {
                x: headerXPositions[i],
                y: tableY,
                size: contentFontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
        });

        tableY -= rowHeight;
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

// // Route to handle PDF report download
// router.post('/downloadReport', isFacultyLoggedIn, async (req, res) => {
//     const {
//         branch,
//         semester,
//         section,
//         fromDate,
//         toDate,
//         percentageCriteria,
//         otherCondition,
//         percentageValue,
//         percentageValue2,
//         format
//     } = req.body;

//     try {
//         const filter = {
//             branch,
//             semester,
//             section,
//             created_at: { $gte: new Date(fromDate), $lte: new Date(toDate) }
//         };

//         const attendanceData = await Attendance.find(filter)
//             .populate({
//                 path: 'students.student',
//                 select: 'username name'
//             });

//         if (!attendanceData.length) {
//             return res.status(404).send('No attendance data found for the given filters.');
//         }

//         let reportData = calculateAttendancePercentage(attendanceData);

//         // Apply percentage criteria filter
//         if (percentageCriteria) {
//             let percentageFilter;
//             switch (percentageCriteria) {
//                 case 'less_65':
//                     percentageFilter = (percentage) => percentage < 65;
//                     break;
//                 case 'less_75':
//                     percentageFilter = (percentage) => percentage < 75;
//                     break;
//                 case 'above_90':
//                     percentageFilter = (percentage) => percentage > 90;
//                     break;
//                 case 'other':
//                     if (otherCondition === 'between') {
//                         percentageFilter = (percentage) => percentage >= parseFloat(percentageValue) && percentage <= parseFloat(percentageValue2);
//                     } else {
//                         percentageFilter = (percentage) => {
//                             switch (otherCondition) {
//                                 case '>':
//                                     return percentage > parseFloat(percentageValue);
//                                 case '<':
//                                     return percentage < parseFloat(percentageValue);
//                                 case '>=':
//                                     return percentage >= parseFloat(percentageValue);
//                                 case '<=':
//                                     return percentage <= parseFloat(percentageValue);
//                                 default:
//                                     return true;
//                             }
//                         };
//                     }
//                     break;
//                 default:
//                     percentageFilter = () => true;
//             }

//             reportData = reportData.filter((record) => percentageFilter(record.percentage));
//         }

//         if (format === 'excel') {
//             const workbook = generateExcelReport(reportData);
//             const buffer = await workbook.xlsx.writeBuffer();
//             res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//             res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
//             res.send(buffer);
//         } else if (format === 'pdf') {
//             const pdfBytes = await generatePDFReport(reportData);
//             const filePath = path.join(__dirname, 'attendance-report.pdf');
//             fs.writeFileSync(filePath, pdfBytes);

//             res.download(filePath, 'attendance-report.pdf', (err) => {
//                 if (err) {
//                     console.error('Error sending the file:', err);
//                     res.status(500).send('Failed to send PDF');
//                 }
//                 fs.unlinkSync(filePath); // Optional: Clean up the file after sending
//             });
//         } else {
//             res.status(400).send('Invalid format requested.');
//         }
//     } catch (error) {
//         console.error('Error generating report:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });
ObjectId = mongoose.Types.ObjectId;
// Helper function to calculate attendance
const calculateAttendance = async (filter, reportType, subject = null) => {
  try {
      const matchStage = {
          ...filter,
          ...(subject && { subject: mongoose.Types.ObjectId(subject) })
      };

      const pipeline = [
          { $match: matchStage },
          {
              $lookup: {
                  from: 'students',
                  localField: 'students.student',
                  foreignField: '_id',
                  as: 'studentDetails'
              }
          },
          {
              $unwind: '$students'
          },
          {
              $lookup: {
                  from: 'subjects',
                  localField: 'subject',
                  foreignField: '_id',
                  as: 'subjectDetails'
              }
          },
          {
              $group: {
                  _id: {
                      student: '$students.student',
                      ...(reportType === 'cumulative' && { subject: '$subject' })
                  },
                  totalClasses: { $sum: 1 },
                  attendedClasses: {
                      $sum: { $cond: ['$students.status', 1, 0] }
                  },
                  studentInfo: { $first: '$studentDetails' },
                  subjectInfo: { $first: '$subjectDetails' }
              }
          }
      ];

      if (reportType === 'cumulative') {
          pipeline.push({
              $group: {
                  _id: '$_id.student',
                  subjects: {
                      $push: {
                          subject: '$_id.subject',
                          subjectName: { $arrayElemAt: ['$subjectInfo.name', 0] },
                          totalClasses: '$totalClasses',
                          attendedClasses: '$attendedClasses',
                          percentage: {
                              $multiply: [
                                  { $divide: ['$attendedClasses', '$totalClasses'] },
                                  100
                              ]
                          }
                      }
                  },
                  studentInfo: { $first: '$studentInfo' }
              }
          });
      }

      const attendanceData = await Attendance.aggregate(pipeline);

      if (reportType === 'monthly') {
          return attendanceData.map(record => ({
              rollNo: record.studentInfo[0]?.rollNo,
              name: record.studentInfo[0]?.name,
              totalClasses: record.totalClasses,
              attendedClasses: record.attendedClasses,
              percentage: (record.attendedClasses / record.totalClasses) * 100
          }));
      } else {
          return attendanceData.map(record => ({
              rollNo: record.studentInfo[0]?.rollNo,
              name: record.studentInfo[0]?.name,
              subjects: record.subjects.reduce((acc, subj) => ({
                  ...acc,
                  [subj.subject]: {
                      subjectName: subj.subjectName,
                      totalClasses: subj.totalClasses,
                      attendedClasses: subj.attendedClasses,
                      percentage: subj.percentage
                  }
              }), {}),
              overallPercentage: 
                  (record.subjects.reduce((sum, subj) => sum + subj.attendedClasses, 0) /
                  record.subjects.reduce((sum, subj) => sum + subj.totalClasses, 0)) * 100
          }));
      }
  } catch (error) {
      console.error('Error calculating attendance:', error);
      throw error;
  }
};

const calculateSubjectAttendance = async (filter) => {
  try {
    if (filter.subject && typeof filter.subject === 'string') {
      filter.subject = new mongoose.Types.ObjectId(filter.subject);
    }
    if (filter.student && typeof filter.student === 'string') {
      filter.student = new mongoose.Types.ObjectId(filter.student);
    }
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectDetails'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'students.student',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      { $unwind: '$students' },
      {
        $group: {
          _id: {
            student: '$students.student',
            subject: '$subject'
          },
          subjectName: { $first: { $arrayElemAt: ['$subjectDetails.name', 0] } },
          studentName: { $first: { $arrayElemAt: ['$studentDetails.name', 0] } },
          rollNo: { $first: { $arrayElemAt: ['$studentDetails.rollNo', 0] } },
          totalClasses: { $sum: 1 },
          attendedClasses: { $sum: { $cond: ['$students.status', 1, 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.student',
          studentName: { $first: '$studentName' },
          rollNo: { $first: '$rollNo' },
          subjects: {
            $push: {
              subject: '$_id.subject',
              subjectName: '$subjectName',
              TC: '$totalClasses',
              TA: '$attendedClasses'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          studentName: 1,
          rollNo: 1,
          subjects: 1,
          totalTC: { $sum: '$subjects.TC' },
          totalTA: { $sum: '$subjects.TA' }
        }
      },
      { $sort: { rollNo: 1 } }
    ];

    return await Attendance.aggregate(pipeline);
  } catch (error) {
    console.error('Error calculating subject attendance:', error);
    throw error;
  }
};

const calculateMonthlyAttendance = async (filter) => {
  try {
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'students',
          localField: 'students.student',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      { $unwind: '$students' },
      {
        $group: {
          _id: {
            student: '$students.student',
            month: { $month: '$date' },
            year: { $year: '$date' }
          },
          studentName: { $first: { $arrayElemAt: ['$studentDetails.name', 0] } },
          rollNo: { $first: { $arrayElemAt: ['$studentDetails.rollNo', 0] } },
          totalClasses: { $sum: 1 },
          attendedClasses: { $sum: { $cond: ['$students.status', 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          student: '$_id.student',
          month: {
            $concat: [
              {
                $switch: {
                  branches: [
                    { case: { $eq: ['$_id.month', 1] }, then: 'January' },
                    { case: { $eq: ['$_id.month', 2] }, then: 'February' },
                    { case: { $eq: ['$_id.month', 3] }, then: 'March' },
                    { case: { $eq: ['$_id.month', 4] }, then: 'April' },
                    { case: { $eq: ['$_id.month', 5] }, then: 'May' },
                    { case: { $eq: ['$_id.month', 6] }, then: 'June' },
                    { case: { $eq: ['$_id.month', 7] }, then: 'July' },
                    { case: { $eq: ['$_id.month', 8] }, then: 'August' },
                    { case: { $eq: ['$_id.month', 9] }, then: 'September' },
                    { case: { $eq: ['$_id.month', 10] }, then: 'October' },
                    { case: { $eq: ['$_id.month', 11] }, then: 'November' },
                    { case: { $eq: ['$_id.month', 12] }, then: 'December' }
                  ]
                }
              },
              ' ',
              { $toString: '$_id.year' }
            ]
          },
          studentName: 1,
          rollNo: 1,
          TC: '$totalClasses',
          TA: '$attendedClasses'
        }
      },
      {
        $group: {
          _id: '$student',
          studentName: { $first: '$studentName' },
          rollNo: { $first: '$rollNo' },
          months: {
            $push: {
              month: '$month',
              TC: '$TC',
              TA: '$TA'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          studentName: 1,
          rollNo: 1,
          months: 1,
          totalTC: { $sum: '$months.TC' },
          totalTA: { $sum: '$months.TA' }
        }
      },
      { $sort: { rollNo: 1 } }
    ];

    return await Attendance.aggregate(pipeline);
  } catch (error) {
    console.error('Error calculating monthly attendance:', error);
    throw error;
  }
};

// Route for getting attendance data
router.get('/getAttendanceData', async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      section,
      reportType,
      subject,
      percentageCriteria,
      otherCondition,
      percentageValue,
      percentageValue2
    } = req.query;

    const filter = {
      date: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      },
      section: new mongoose.Types.ObjectId(section)
    };

    const attendanceData = await calculateAttendance(filter, reportType, subject);

    // Apply filters
    let filteredData = attendanceData;
    if (percentageCriteria) {
      const getPercentage = (record) => 
          reportType === 'monthly' ? record.percentage : record.overallPercentage;

      filteredData = attendanceData.filter(record => {
        const percentage = getPercentage(record);
        switch (percentageCriteria) {
          case 'less_65':
            return percentage < 65;
          case 'less_75':
            return percentage < 75;
          case 'above_90':
            return percentage > 90;
          case 'other':
            switch (otherCondition) {
              case '>':
                return percentage > Number(percentageValue);
              case '<':
                return percentage < Number(percentageValue);
              case '>=':
                return percentage >= Number(percentageValue);
              case '<=':
                return percentage <= Number(percentageValue);
              case 'between':
                return percentage >= Number(percentageValue) && 
                       percentage <= Number(percentageValue2);
              default:
                return true;
            }
          default:
            return true;
        }
      });
    }

    res.json(filteredData);
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to download attendance report
router.post('/downloadReport', async (req, res) => {
  try {
      const {
          fromDate,
          toDate,
          section,
          reportType,
          subject,
          percentageCriteria,
          otherCondition,
          percentageValue,
          percentageValue2,
          format
      } = req.body;

      const filter = {
          created_at: {
              $gte: new Date(fromDate),
              $lte: new Date(toDate)
          },
          section: new mongoose.Types.ObjectId(section)
      };

      const attendanceData = await calculateAttendance(filter, reportType, subject);

      // Apply filters
      let filteredData = attendanceData;
      if (percentageCriteria) {
          const getPercentage = (record) => 
              reportType === 'monthly' ? record.percentage : record.overallPercentage;

          filteredData = attendanceData.filter(record => {
              const percentage = getPercentage(record);
              switch (percentageCriteria) {
                  case 'less_65':
                      return percentage < 65;
                  case 'less_75':
                      return percentage < 75;
                  case 'above_90':
                      return percentage > 90;
                  case 'other':
                      switch (otherCondition) {
                          case '>':
                              return percentage > Number(percentageValue);
                          case '<':
                              return percentage < Number(percentageValue);
                          case '>=':
                              return percentage >= Number(percentageValue);
                          case '<=':
                              return percentage <= Number(percentageValue);
                          case 'between':
                              return percentage >= Number(percentageValue) && 
                                     percentage <= Number(percentageValue2);
                          default:
                              return true;
                      }
                  default:
                      return true;
              }
          });
      }

      if (format === 'excel') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Attendance Report');

          // Add headers
          if (reportType === 'monthly') {
              worksheet.addRow(['Roll No', 'Name', 'Total Classes', 'Attended Classes', 'Percentage']);
              filteredData.forEach(record => {
                  worksheet.addRow([
                      record.rollNo,
                      record.name,
                      record.totalClasses,
                      record.attendedClasses,
                      `${record.percentage.toFixed(2)}%`
                  ]);
              });
          } else {
              const headers = ['Roll No', 'Name'];
              if (filteredData.length > 0) {
                  headers.push(...Object.keys(filteredData[0].subjects), 'Overall Percentage');
              }
              worksheet.addRow(headers);

              filteredData.forEach(record => {
                  const row = [record.rollNo, record.name];
                  Object.values(record.subjects).forEach(subject => {
                      row.push(`${subject.percentage.toFixed(2)}%`);
                  });
                  row.push(`${record.overallPercentage.toFixed(2)}%`);
                  worksheet.addRow(row);
              });
          }

          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
          await workbook.xlsx.write(res);
          res.end();

      } else if (format === 'pdf') {
          const doc = new PDFDocument();
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
          doc.pipe(res);

          // Add title
          doc.fontSize(16).text('Attendance Report', { align: 'center' });
          doc.moveDown();

          // Add data
          doc.fontSize(12);
          if (reportType === 'monthly') {
              doc.table({
                  headers: ['Roll No', 'Name', 'Total Classes', 'Attended Classes', 'Percentage'],
                  rows: filteredData.map(record => [
                      record.rollNo,
                      record.name,
                      record.totalClasses.toString(),
                      record.attendedClasses.toString(),
                      `${record.percentage.toFixed(2)}%`
                  ])
              });
          } else {
              const headers = ['Roll No', 'Name'];
              if (filteredData.length > 0) {
                  headers.push(...Object.keys(filteredData[0].subjects), 'Overall %');
              }
              
              const rows = filteredData.map(record => {
                  const row = [record.rollNo, record.name];
                  Object.values(record.subjects).forEach(subject => {
                      row.push(`${subject.percentage.toFixed(2)}%`);
                  });
                  row.push(`${record.overallPercentage.toFixed(2)}%`);
                  return row;
              });

              doc.table({ headers, rows });
          }

          doc.end();
      }
  } catch (error) {
      console.error('Error downloading attendance report:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

function calculateAttendancePercentage(attendanceData) {
    const studentAttendance = {};
    const unpopulatedStudents = [];

    attendanceData.forEach(record => {
        record.students.forEach(studentRecord => {
            const student = studentRecord.student; // The populated student document
            if (student) { // Ensure the student is not null
                if (!studentAttendance[student._id]) {
                    studentAttendance[student._id] = {
                        username: student.username,
                        name: student.name,
                        totalClasses: 0,
                        attendedClasses: 0
                    };
                }
                studentAttendance[student._id].totalClasses++;
                if (studentRecord.status) {
                    studentAttendance[student._id].attendedClasses++;
                }
            } else {
                unpopulatedStudents.push(studentRecord);
            }
        });
    });

    const reportData = Object.keys(studentAttendance).map(studentId => {
        const data = studentAttendance[studentId];
        data.percentage = (data.attendedClasses / data.totalClasses) * 100;
        return data;
    });

    return reportData;
}
     

function generateExcelReport(reportData) {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    worksheet.columns = [
        { header: 'Roll NO.', key: 'username', width: 20 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Total Classes', key: 'totalClasses', width: 15 },
        { header: 'Attended Classes', key: 'attendedClasses', width: 20 },
        { header: 'Percentage', key: 'percentage', width: 15 }
    ];

    reportData.forEach(data => worksheet.addRow(data));

    return workbook;
}


// router.get('/getAttendanceData', async (req, res) => {
//     const { fromDate, toDate, academicYear, program, branch, semester, section, percentageCriteria, otherCondition, percentageValue, percentageValue2 } = req.query;
  
//     try {
//       const semesterId = semester && typeof semester === 'object' && semester._id ? semester._id : semester;
//       const filter = {
//         created_at: { $gte: new Date(fromDate), $lte: new Date(toDate) },
//         semester: semesterId,
//         section
//       };
  
//       const attendanceData = await Attendance.find(filter).populate({
//         path: 'students.student',
//         select: 'username name'
//       });
//       if (!attendanceData.length) {
//         return res.status(404).send('No attendance data found for the given filters.');
//       }
  
//       const reportData = calculateAttendancePercentage(attendanceData);
  
//       let filteredReportData = reportData;
  
//       // Apply percentage criteria filter
//       if (percentageCriteria) {
//         let percentageFilter;
//         switch (percentageCriteria) {
//           case 'less_65':
//             percentageFilter = (percentage) => percentage < 65;
//             break;
//           case 'less_75':
//             percentageFilter = (percentage) => percentage < 75;
//             break;
//           case 'above_90':
//             percentageFilter = (percentage) => percentage > 90;
//             break;
//           case 'other':
//             if (otherCondition === 'between') {
//               percentageFilter = (percentage) => percentage >= parseFloat(percentageValue) && percentage <= parseFloat(percentageValue2);
//             } else {
//               percentageFilter = (percentage) => {
//                 switch (otherCondition) {
//                   case '>':
//                     return percentage > parseFloat(percentageValue);
//                   case '<':
//                     return percentage < parseFloat(percentageValue);
//                   case '>=':
//                     return percentage >= parseFloat(percentageValue);
//                   case '<=':
//                     return percentage <= parseFloat(percentageValue);
//                   default:
//                     return true;
//                 }
//               };
//             }
//             break;
//           default:
//             percentageFilter = () => true;
//         }
  
//         filteredReportData = reportData.filter((record) => percentageFilter(record.percentage));
//       }
      
//       res.json(filteredReportData);
//     } catch (error) {
//       console.error('Error fetching attendance data:', error);
//       res.status(500).send('Internal Server Error');
//     }
//   });
  
// Faculty view for uploading resources

router.get('/resources', isFacultyLoggedIn, async (req, res) => {
    const { sectionId } = req.query;
    const section = await Section.findById(sectionId).populate('year branch class_teacher');
    res.render('faculty/resource/resources', { section });
});
  
  // Faculty uploads a resource
  router.post('/resources/upload', isFacultyLoggedIn, async (req, res) => {
    try {
      const { title, description, fileId, fileLink, section } = req.body;
  
      const newResource = new Resource({
        title,
        description,
        fileId,
        fileLink,
        uploader: req.user._id,  // Faculty ID
        sharedWith: { section }
      });
  
      await newResource.save();
      req.flash('success', 'Resource uploaded successfully.');
      res.redirect('/faculty/resources');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Failed to upload resource.');
      res.redirect('/faculty/resources');
    }
  });

router.get('/section', async (req, res) => {
    try {
        const sections = await Section.find({}).populate('year branch class_teacher');
        const academicYears = await AcademicYear.find({});
        res.render('faculty/section/section.ejs', { sections, academicYears });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
router.post('/sections/getSections', async (req, res) => {
    const { yearId } = req.body;
    console.log('Received yearId:', yearId);

    try {
        const sections = await Section.find({ year: yearId })
            .populate('branch')
            .populate('class_teacher')
            .populate('currentSemester')
            .populate('students.student')
            .populate('students.batch');
        res.json(sections);
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).send('Server error');
    }
});

router.get('/sections/:sectionId', async (req, res) => {
    const { sectionId } = req.params;

    try {
        const section = await Section.findById(sectionId)
            .populate('branch')
            .populate('class_teacher')
            .populate('currentSemester')
            .populate('students.student')
            .populate('students.batch');
        
        res.render('faculty/section/sectionDetails', { section });
    } catch (error) {
        console.error('Error fetching section details:', error);
        res.status(500).send('Server error');
    }
});

router.get('/sections/:sectionId/enterMarks', 
     isFacultyLoggedIn, 
    facultyController.renderEnterMarks
);

// Announcements (Send Emails)
router.get('/sections/:sectionId/announcements', isFacultyLoggedIn, async (req, res) => {
    const section = await Section.findById(req.params.sectionId).populate('students');
    res.render('faculty/email-form', { section,sectionId: req.params.sectionId });
});

// Helper function to get student emails from section
async function getStudentEmailsFromSection(sectionId) {
    const section = await Section.findById(sectionId)
      .populate({
        path: 'students.student',
        select: 'email'
      });
    
    if (!section) {
      throw new Error('Section not found');
    }
    
    return section.students.map(s => s.student.email);
  }
  
  // Helper function to verify faculty has access to section
  async function verifyFacultySection(facultyId, sectionId) {
    const section = await Section.findById(sectionId);
    
    if (!section) {
      throw new Error('Section not found');
    }
  
    // Check if faculty is class teacher or teaches any subject in this section
    const isClassTeacher = section.class_teacher.equals(facultyId);
    const isSubjectTeacher = section.facultySubjects.some(fs => 
      fs.faculty.equals(facultyId)
    );
  
    if (!isClassTeacher && !isSubjectTeacher) {
      throw new Error('Unauthorized: Faculty does not teach this section');
    }
  
    return true;
  }
  
  // Route to handle faculty email sending
  router.post('/sections/:sectionId/send-email', 
    isFacultyLoggedIn,
    upload.single('emailAttachment'),
    async (req, res) => {
      const { sectionId } = req.params;
      const { emailSubject, emailBody } = req.body;
      const file = req.file;
  
      try {
        // Verify faculty has access to this section
        await verifyFacultySection(req.user._id, sectionId);
  
        // Store file in session if it exists
        if (file) {
          req.session.fileData = {
            originalname: file.originalname,
            buffer: file.buffer,
            mimetype: file.mimetype
          };
        }
  
        // Get all student emails from the section
        const recipientEmails = await getStudentEmailsFromSection(sectionId);
  
        if (recipientEmails.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No student emails found in this section'
          });
        }
  
        // Create state object for OAuth flow
        const stateData = {
          sectionId,
          emailSubject: emailSubject || '',
          emailBody: emailBody || '',
          recipientEmails: recipientEmails.join(',')
        };
  
        // Encode state as base64
        const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');
  
        // Generate OAuth URL
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.send openid profile email')}` +
          `&access_type=offline` +
          `&include_granted_scopes=true` +
          `&response_type=code` +
          `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
          `&client_id=${encodeURIComponent(process.env.CLIENT_ID)}` +
          `&state=${encodedState}` +
          `&prompt=consent`;
  
        res.redirect(authUrl);
  
      } catch (error) {
        console.error('Error in faculty send-email route:', error);
        res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
          success: false,
          error: error.message || 'Failed to initiate email send process'
        });
      }
  });
  
  // Modify the existing OAuth callback route to handle faculty emails
  router.get('/oauth2/callback', async (req, res) => {
    const { code, state } = req.query;
  
    if (!code) {
      return res.status(400).send('Invalid request: Missing authorization code');
    }
  
    try {
      // Decode state
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      const { sectionId, emailSubject, emailBody, recipientEmails } = decodedState;
  
      // Exchange code for tokens
      const { access_token, refresh_token } = await exchangeCodeForTokens(code);
      
      // Get user email
      const userEmail = await getUserEmail(access_token);
  
      // Send email
      await sendEmail({
        accessToken: access_token,
        refreshToken: refresh_token,
        from: userEmail,
        to: recipientEmails,
        subject: emailSubject,
        text: emailBody,
        fileData: req.session.fileData
      });
  
      // Clear file data from session
      delete req.session.fileData;
  
      // Success redirect
      req.flash('success', 'Email sent successfully');
      res.redirect(`/faculty/sections/${sectionId}`);
  
    } catch (error) {console.error('OAuth callback error:', error);
        // If we have sectionId in the state, redirect to that section, otherwise to dashboard
        const sectionId = JSON.parse(Buffer.from(state, 'base64').toString()).sectionId;
        req.flash('error', 'Failed to send email. Please try again.');
        res.redirect(sectionId ? 
          `http://localhost:2000/faculty/sections/${sectionId}` : 
          '/faculty/dashboard'
        );
      
      let errorMessage = 'Error processing request. Please try again.';
      let statusCode = 500;
  
      if (error.message.includes('Invalid grant')) {
        errorMessage = 'Authorization expired. Please try again.';
        statusCode = 400;
      } else if (error.message.includes('token')) {
        errorMessage = 'Authentication failed. Please try again.';
        statusCode = 401;
      }
  
      res.status(statusCode).send(errorMessage);
    }
  });
// Get marking scheme for a subject
router.get('/subjects/:subjectId/marking-scheme',
  isFacultyLoggedIn,
  getMarkingScheme
);

// Get section marks without component - THIS ROUTE MUST COME FIRST
router.get('/sections/:sectionId/marks/:subjectId',
  isFacultyLoggedIn,
  getSectionMarks
);

// Get section marks with component - THIS ROUTE MUST COME SECOND
router.get('/sections/:sectionId/marks/:subjectId/component/:componentName',
  isFacultyLoggedIn,
  getSectionMarks
);

// Save marks for students
router.post('/marks/save',
  isFacultyLoggedIn,
  saveMarks
);

router.get('/sections/:sectionId/marks/:subjectId/download', downloadMarksSheet);

module.exports = router;
