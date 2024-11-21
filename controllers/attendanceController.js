// controllers/admin/attendanceController.js
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Section = require('../models/Section');
const AcademicYear = require('../models/AcademicYear');
const PDFDocument = require('pdfkit');
const excel = require('exceljs');

class AttendanceController {
    // Get attendance dashboard with initial data
    async getAttendanceDashboard(req, res) {
        try {
            const academicYears = await AcademicYear.find().sort({ startDate: -1 });
            const branches = await Section.distinct('branch').populate('branch', 'name');
            
            res.render('admin/attendance/index', {
                academicYears,
                branches,
                students: [] // Initial empty state, will be populated via API
            });
        } catch (error) {
            console.error('Dashboard Error:', error);
            res.status(500).json({ error: 'Error loading dashboard' });
        }
    }

    // Get attendance summary with analytics
    async getAttendanceSummary(req, res) {
        try {
            const defaultFilters = {
                year: req.query.year || await this.getCurrentAcademicYear(),
                // Add other default filters as needed
            };

            const [students, analytics] = await Promise.all([
                this.getFilteredStudents(defaultFilters),
                this.generateAttendanceAnalytics(defaultFilters)
            ]);

            res.json({
                students,
                analytics
            });
        } catch (error) {
            console.error('Summary Error:', error);
            res.status(500).json({ error: 'Error fetching attendance summary' });
        }
    }

    // Filter attendance based on provided criteria
    async filterAttendance(req, res) {
        try {
            const filters = {
                year: req.query.academicYear,
                branch: req.query.branch,
                semester: req.query.semester,
                section: req.query.section,
                subject: req.query.subject,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const [students, analytics] = await Promise.all([
                this.getFilteredStudents(filters),
                this.generateAttendanceAnalytics(filters)
            ]);

            res.json({
                students,
                analytics
            });
        } catch (error) {
            console.error('Filter Error:', error);
            res.status(500).json({ error: 'Error applying filters' });
        }
    }

    // Get detailed attendance for a specific student
    async getStudentAttendance(req, res) {
        try {
            const studentId = req.params.id;
            const filters = {
                ...req.query,
                student: studentId
            };

            const attendance = await Attendance.find({
                'students.student': studentId
            })
            .populate('subject')
            .populate('period')
            .sort({ date: -1 });

            const analytics = await this.generateStudentAnalytics(studentId, filters);

            res.json({
                attendance,
                analytics
            });
        } catch (error) {
            console.error('Student Attendance Error:', error);
            res.status(500).json({ error: 'Error fetching student attendance' });
        }
    }

    // Edit attendance record
    async editAttendance(req, res) {
        try {
            const { attendanceId, studentId, status, reason } = req.body;

            const attendance = await Attendance.findById(attendanceId);
            if (!attendance) {
                return res.status(404).json({ error: 'Attendance record not found' });
            }

            // Update the student's attendance status
            const studentIndex = attendance.students.findIndex(
                s => s.student.toString() === studentId
            );

            if (studentIndex === -1) {
                return res.status(404).json({ error: 'Student not found in attendance record' });
            }

            attendance.students[studentIndex].status = status;
            
            // Add audit log
            attendance.auditLog = attendance.auditLog || [];
            attendance.auditLog.push({
                user: req.user._id,
                action: 'edit',
                reason,
                timestamp: new Date()
            });

            await attendance.save();

            res.json({ message: 'Attendance updated successfully' });
        } catch (error) {
            console.error('Edit Error:', error);
            res.status(500).json({ error: 'Error updating attendance' });
        }
    }

    // Download attendance report
    async downloadReport(req, res) {
        try {
            const type = req.params.type;
            const filters = req.query;

            const students = await this.getFilteredStudents(filters);
            const analytics = await this.generateAttendanceAnalytics(filters);

            if (type === 'pdf') {
                await this.generatePDFReport(res, students, analytics);
            } else if (type === 'excel') {
                await this.generateExcelReport(res, students, analytics);
            } else {
                res.status(400).json({ error: 'Invalid report type' });
            }
        } catch (error) {
            console.error('Download Error:', error);
            res.status(500).json({ error: 'Error generating report' });
        }
    }

    // Load semesters for a given academic year
    async loadSemesters(req, res) {
        try {
            const yearId = req.params.yearId;
            const academicYear = await AcademicYear.findById(yearId)
                .populate('semesters.sem');

            res.json(academicYear.semesters);
        } catch (error) {
            console.error('Semesters Error:', error);
            res.status(500).json({ error: 'Error loading semesters' });
        }
    }

    // Load sections for a given branch
    async loadSections(req, res) {
        try {
            const branchId = req.params.branchId;
            const sections = await Section.find({ branch: branchId })
                .select('name');

            res.json(sections);
        } catch (error) {
            console.error('Sections Error:', error);
            res.status(500).json({ error: 'Error loading sections' });
        }
    }

    // Load subjects for a given section
    async loadSubjects(req, res) {
        try {
            const sectionId = req.params.sectionId;
            const section = await Section.findById(sectionId)
                .populate('facultySubjects.subject');

            const subjects = section.facultySubjects.map(fs => fs.subject);
            res.json(subjects);
        } catch (error) {
            console.error('Subjects Error:', error);
            res.status(500).json({ error: 'Error loading subjects' });
        }
    }

    // Helper Methods
    async getCurrentAcademicYear() {
        const currentDate = new Date();
        return await AcademicYear.findOne({
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });
    }

    async getFilteredStudents(filters) {
        const query = this.buildAttendanceQuery(filters);
        const attendanceRecords = await Attendance.find(query)
            .populate('students.student');

        return this.processAttendanceRecords(attendanceRecords);
    }

    buildAttendanceQuery(filters) {
        const query = {};
        
        if (filters.year) query.year = filters.year;
        if (filters.branch) query.branch = filters.branch;
        if (filters.semester) query.semester = filters.semester;
        if (filters.section) query.section = filters.section;
        if (filters.subject) query.subject = filters.subject;
        
        if (filters.startDate || filters.endDate) {
            query.date = {};
            if (filters.startDate) query.date.$gte = new Date(filters.startDate);
            if (filters.endDate) query.date.$lte = new Date(filters.endDate);
        }

        return query;
    }

    processAttendanceRecords(records) {
        const studentMap = new Map();

        records.forEach(record => {
            record.students.forEach(studentAttendance => {
                const student = studentAttendance.student;
                if (!studentMap.has(student._id)) {
                    studentMap.set(student._id, {
                        _id: student._id,
                        rollNo: student.rollNo,
                        name: student.name,
                        totalClasses: 0,
                        attended: 0,
                        percentage: 0
                    });
                }

                const studentStats = studentMap.get(student._id);
                studentStats.totalClasses++;
                if (studentAttendance.status) {
                    studentStats.attended++;
                }
                studentStats.percentage = Math.round((studentStats.attended / studentStats.totalClasses) * 100);
            });
        });

        return Array.from(studentMap.values());
    }

    async generateAttendanceAnalytics(filters) {
        const students = await this.getFilteredStudents(filters);
        
        return {
            distribution: {
                below75: students.filter(s => s.percentage < 75).length,
                between75And85: students.filter(s => s.percentage >= 75 && s.percentage < 85).length,
                above85: students.filter(s => s.percentage >= 85).length
            },
            trends: await this.getAttendanceTrends(filters)
        };
    }

    async getAttendanceTrends(filters) {
        const attendanceByDate = await Attendance.aggregate([
            { $match: this.buildAttendanceQuery(filters) },
            { $unwind: '$students' },
            {
                $group: {
                    _id: '$date',
                    presentCount: {
                        $sum: { $cond: ['$students.status', 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        return attendanceByDate.map(day => ({
            date: day._id,
            percentage: (day.presentCount / day.totalCount) * 100
        }));
    }

    async generatePDFReport(res, students, analytics) {
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
        
        doc.pipe(res);
        
        // Add report content
        doc.fontSize(16).text('Attendance Report', { align: 'center' });
        // Add more formatting and content as needed
        
        doc.end();
    }

    async generateExcelReport(res, students, analytics) {
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');
        
        // Add headers and data
        worksheet.columns = [
            { header: 'Roll No', key: 'rollNo' },
            { header: 'Name', key: 'name' },
            { header: 'Total Classes', key: 'totalClasses' },
            { header: 'Attended', key: 'attended' },
            { header: 'Percentage', key: 'percentage' }
        ];
        
        worksheet.addRows(students);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
        
        await workbook.xlsx.write(res);
    }
}

module.exports = new AttendanceController();