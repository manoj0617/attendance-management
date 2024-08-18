const express = require('express');
const pdf = require('html-pdf');
const passport = require('passport');
const router = express.Router({ mergeParams: true });
const { isFacultyLoggedIn, saveRedirectUrl, validateDownload, canModifyAttendance } = require('../middleware.js');
const wrapAsync = require('../utils/wrapAsync.js');
const fs = require('fs');
const exceljs = require('exceljs');
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
const { ObjectId } = mongoose.Types;

router.get('/subject',async(req,res)=>{
  try {
    const faculty=await Faculty.findById(req.user._id).populate({
      path: 'subjects',
      select:'name'
  });
  const subjects=faculty.subjects;
  console.log(subjects);
  res.json(subjects);
} catch (err) {
    res.status(500).send('Server Error');
}
});

router.post('/submitAttendance', isFacultyLoggedIn, async (req, res) => {
    const { date, section, acYear, branch, sem, periods, attendance, batch, students } = req.body;

    try {
        // Convert date to the day of the week
        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' });
        const semester = await Semester.findById(sem);
        if (!semester) {
            return res.status(400).send('Invalid semester ID');
        }

        // Fetch periods information
        const periodsData = await Period.find({
            section: new mongoose.Types.ObjectId(section),
            day: dayOfWeek,
            year: new mongoose.Types.ObjectId(acYear),
            branch: new mongoose.Types.ObjectId(branch),
            semester: new mongoose.Types.ObjectId(sem),
            hour: { $in: periods.map(Number) },
            batch: batch ? batch : null
        }).populate('subject');
        
        console.log(req.body);
        console.log(periodsData);
        console.log(students);

        // Create attendance records for each period
        for (const period of periodsData) {
            // Construct student attendance statuses
            const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const studentsAttendance = students.map(studentId => {
    if (!isValidObjectId(studentId)) {
        throw new Error(`Invalid ObjectId: ${studentId}`);
    }
    return {
        student: new mongoose.Types.ObjectId(studentId),
        status: attendance[studentId] === 'true'
    };
});


            const newAttendance = new Attendance({
                date: new Date(date),
                section: new mongoose.Types.ObjectId(section),
                year: new mongoose.Types.ObjectId(acYear),
                branch: new mongoose.Types.ObjectId(branch),
                semester: new mongoose.Types.ObjectId(sem),
                period: period._id,
                subject: period.subject._id,
                students: studentsAttendance,
                batch: batch ? new mongoose.Types.ObjectId(batch) : null, // Include batch if provided
                created_by: req.user._id // Assuming req.user contains the logged-in faculty info
            });

            const savedAttendance = await newAttendance.save();
            if (!savedAttendance) {
                return res.status(500).send('Error saving attendance');
            }
        }
        res.redirect('/faculty/attendance');
    } catch (err) {
        console.error(err);
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
        console.log(branches);
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

// Route to handle show attendance
router.get('/showAttendance', wrapAsync(async (req, res) => {
    try {
        const { section, date, acYear, branch, sem } = req.query;
        const attendanceRecords = await Attendance.find({ date: new Date(date), section, semester: sem });

        const enabledPeriods = attendanceRecords.map(record => record.period.hour);

        res.json({ enabledPeriods });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}));

// Route to handle modify attendance
router.post('/modifyAttendance', isFacultyLoggedIn, canModifyAttendance, wrapAsync(async (req, res) => {
    const { section, date, periods, acYear, branch, sem } = req.body;
    console.log(req.body);
    const facultyId = req.user._id;

    await Attendance.deleteMany({ section, date: new Date(date), semester: sem, created_by: facultyId });

    const attendanceRecords = periods.map(period => ({
        section,
        date: new Date(date),
        period,
        academicYear: acYear,
        branch,
        semester: sem,
        created_by: facultyId
    }));

    await Attendance.insertMany(attendanceRecords);
    res.redirect('/faculty/attendance');
}));

// Route to display the view attendance form
router.get('/attendanceView', wrapAsync(async (req, res) => {
    try {
        const { date, section } = req.query;
        const students = await Student.find({ section });
        const attendanceRecords = await Attendance.find({ date: new Date(date), section });

        res.render('faculty/attendanceView', { date, students, attendanceRecords });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}));

// Fetch periods based on section, date, and action (new or modify)
router.get('/fetchPeriods', isFacultyLoggedIn, async (req, res) => {
    try {
        const { section, date, acYear, program, branch, sem, action, facultyId } = req.query;
        let day = new Date(date).toLocaleString('en-US', { weekday: 'long' });
        // Fetch periods
        const periods = await Period.find({ section, semester: sem, branch, year: acYear,day,faculty: req.user._id }).populate('subject faculty branch year section batch');
        console.log(req.query);
        let attendanceRecords = await Attendance.find({ section, semester: sem, branch, year: acYear, date: new Date(date)}).populate('period');
        let enabledPeriods = [1,2,3,4,5,6,7];
        if (action === 'markAttendance') {
            enabledPeriods=[];
            const attendedPeriodHours = attendanceRecords.map(record => record.period.hour);
            enabledPeriods = attendedPeriodHours;
            console.log(attendedPeriodHours);
        } else if (action === 'modifyAttendance') {
            enabledPeriods = attendanceRecords
                .filter(record => record.created_by.equals(facultyId))
                .map(record => record.period.hour);
        }
        // Fetch available batches for the section
        const batches = await Batch.find({ section });
        console.log(periods.length);
        console.log(enabledPeriods);
        console.log(attendanceRecords);
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
    .get(isFacultyLoggedIn, wrapAsync(facultyController.renderAttendanceForm));

router.route("/markAttendance")
    .post(isFacultyLoggedIn, wrapAsync(facultyController.markAttendance));

// Download routes
router.route("/download")
    .get(isFacultyLoggedIn, wrapAsync(facultyController.renderDownloadForm))
    .post(isFacultyLoggedIn, validateDownload, wrapAsync(facultyController.download));

    async function generatePDFReport(data) {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
  
      page.drawText('Attendance Report', { x: 50, y: 750, size: 20 });
  
      const tableYStart = 700;
      let tableY = tableYStart;
      const rowHeight = 20;
  
      const headers = ['#', 'Username', 'Name', 'Total Classes', 'Attended Classes', 'Percentage'];
      const headerXPositions = [50, 100, 200, 300, 400, 500];
  
      headers.forEach((header, i) => {
          page.drawText(header, { x: headerXPositions[i], y: tableY, size: 10 });
      });
  
      tableY -= rowHeight;
  
      data.forEach((record, index) => {
          const values = [index + 1, record.username, record.name, record.totalClasses, record.attendedClasses, record.percentage.toFixed(2)];
  
          values.forEach((value, i) => {
              page.drawText(value.toString(), { x: headerXPositions[i], y: tableY, size: 10 });
          });
  
          tableY -= rowHeight;
      });
  
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
  }
  
  router.post('/downloadReport', isFacultyLoggedIn, async (req, res) => {
      const {
          program,
          branch,
          semester,
          section,
          fromDate,
          toDate,
          percentageCriteria,
          otherCondition,
          percentageValue,
          percentageValue2,
          format
      } = req.body;
  
      try {
          const filter = {
              branch,
              semester,
              section,
              created_at: { $gte: new Date(fromDate), $lte: new Date(toDate) }
          };
  
          const attendanceData = await Attendance.find(filter)
              .populate({
                  path: 'students.student',
                  select: 'username name'
              });
  
          if (!attendanceData.length) {
              return res.status(404).send('No attendance data found for the given filters.');
          }
  
          let reportData = calculateAttendancePercentage(attendanceData);
  
          // Apply percentage criteria filter
          if (percentageCriteria) {
              let percentageFilter;
              switch (percentageCriteria) {
                  case 'less_65':
                      percentageFilter = (percentage) => percentage < 65;
                      break;
                  case 'less_75':
                      percentageFilter = (percentage) => percentage < 75;
                      break;
                  case 'above_90':
                      percentageFilter = (percentage) => percentage > 90;
                      break;
                  case 'other':
                      if (otherCondition === 'between') {
                          percentageFilter = (percentage) => percentage >= parseFloat(percentageValue) && percentage <= parseFloat(percentageValue2);
                      } else {
                          percentageFilter = (percentage) => {
                              switch (otherCondition) {
                                  case '>':
                                      return percentage > parseFloat(percentageValue);
                                  case '<':
                                      return percentage < parseFloat(percentageValue);
                                  case '>=':
                                      return percentage >= parseFloat(percentageValue);
                                  case '<=':
                                      return percentage <= parseFloat(percentageValue);
                                  default:
                                      return true;
                              }
                          };
                      }
                      break;
                  default:
                      percentageFilter = () => true;
              }
  
              reportData = reportData.filter((record) => percentageFilter(record.percentage));
          }
  
          if (format === 'excel') {
              const workbook = generateExcelReport(reportData);
              const buffer = await workbook.xlsx.writeBuffer();
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
              res.send(buffer);
          } else if (format === 'pdf') {
              const pdfBytes = await generatePDFReport(reportData);
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
              res.send(pdfBytes);
          } else {
              res.status(400).send('Invalid format requested.');
          }
      } catch (error) {
          console.error('Error generating report:', error);
          res.status(500).send('Internal Server Error');
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


router.get('/getAttendanceData', async (req, res) => {
    const { fromDate, toDate, academicYear, program, branch, semester, section, percentageCriteria, otherCondition, percentageValue, percentageValue2 } = req.query;
  
    try {
      const filter = {
        created_at: { $gte: new Date(fromDate), $lte: new Date(toDate) },
        semester,
        section
      };
  
      const attendanceData = await Attendance.find(filter).populate({
        path: 'students.student',
        select: 'username name'
      });
      if (!attendanceData.length) {
        return res.status(404).send('No attendance data found for the given filters.');
      }
  
      const reportData = calculateAttendancePercentage(attendanceData);
  
      let filteredReportData = reportData;
  
      // Apply percentage criteria filter
      if (percentageCriteria) {
        let percentageFilter;
        switch (percentageCriteria) {
          case 'less_65':
            percentageFilter = (percentage) => percentage < 65;
            break;
          case 'less_75':
            percentageFilter = (percentage) => percentage < 75;
            break;
          case 'above_90':
            percentageFilter = (percentage) => percentage > 90;
            break;
          case 'other':
            if (otherCondition === 'between') {
              percentageFilter = (percentage) => percentage >= parseFloat(percentageValue) && percentage <= parseFloat(percentageValue2);
            } else {
              percentageFilter = (percentage) => {
                switch (otherCondition) {
                  case '>':
                    return percentage > parseFloat(percentageValue);
                  case '<':
                    return percentage < parseFloat(percentageValue);
                  case '>=':
                    return percentage >= parseFloat(percentageValue);
                  case '<=':
                    return percentage <= parseFloat(percentageValue);
                  default:
                    return true;
                }
              };
            }
            break;
          default:
            percentageFilter = () => true;
        }
  
        filteredReportData = reportData.filter((record) => percentageFilter(record.percentage));
      }
      
      res.json(filteredReportData);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
module.exports = router;
