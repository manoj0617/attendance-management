const Section = require('../models/section');
const Subject = require('../models/subject');
const { MarkingSchemeConfig, StudentMarks } = require('../models/studentMarks');
const XLSX = require('xlsx');

module.exports.getMarkingScheme = async (req, res) => {
    try {
        const { subjectId } = req.params;

        const subject = await Subject.findById(subjectId).populate('regulation');
        if (!subject) {
            return res.json({ success: false, message: 'Subject not found' });
        }

        const markingScheme = await MarkingSchemeConfig.findById(subject.regulation);
        
        if (!markingScheme) {
            return res.json({ success: false, message: 'Marking scheme not found' });
        }

        res.json({
            success: true,
            subject,
            markingScheme
        });
    } catch (error) {
        console.error('Error fetching marking scheme:', error);
        res.json({ success: false, message: error.message });
    }
};

module.exports.getSectionMarks = async (req, res) => {
    try {
        const { sectionId, subjectId } = req.params;
        const { type } = req.query; // 'internal' or 'external'
        const componentName = req.params.componentName || null;  // Changed from componentId to componentName

        console.log('Request parameters:', {
            sectionId,
            subjectId,
            componentName,  // Updated log
            type
        });

        // Input validation
        if (!sectionId || !subjectId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Section ID and Subject ID are required' 
            });
        }

        // Validate marking type more strictly
        const markingType = type?.toLowerCase();
        if (!markingType || !['internal', 'external'].includes(markingType)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid marking type. Must be either "internal" or "external".' 
            });
        }

        // Get the section with students
        const section = await Section.findById(sectionId)
            .populate({
                path: 'students.student',
                select: 'name username _id'
            });

        if (!section) {
            return res.status(404).json({ 
                success: false, 
                message: 'Section not found' 
            });
        }

        // Filter and sort valid students
        const validStudents = section.students
            .filter(s => s && s.student)
            .map(s => ({
                _id: s.student._id,
                name: s.student.name,
                rollNo: s.student.username || 'N/A'
            }))
            .sort((a, b) => {
                if (a.rollNo !== 'N/A' && b.rollNo !== 'N/A') {
                    return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });
                }
                return a.name.localeCompare(b.name);
            });

        if (validStudents.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No students found in this section' 
            });
        }

        // Build marks query
        const marksQuery = {
            student: { $in: validStudents.map(s => s._id) },
            subject: subjectId,
            semester: section.currentSemester
        };

        console.log('Marks query:', JSON.stringify(marksQuery, null, 2));

        // Get marks with proper population
        const marks = await StudentMarks.find(marksQuery)
            .populate('student', 'name username')
            .lean();

        console.log(`Found ${marks.length} marks records`);

        // Transform marks based on componentName presence
        const transformedMarks = marks.map(mark => {
            const markingData = mark[markingType] || { componentMarks: [] };
            const filteredComponentMarks = componentName 
                ? markingData.componentMarks.filter(cm => cm.componentName === componentName)  // Changed from componentId to componentName
                : markingData.componentMarks;

            return {
                student: mark.student._id,
                [markingType]: {
                    componentMarks: filteredComponentMarks
                }
            };
        });

        res.json({
            success: true,
            students: validStudents,
            marks: transformedMarks,
            metadata: {
                section: section._id,
                subject: subjectId,
                component: componentName,  // Changed from componentId to componentName
                type: markingType,
                semester: section.currentSemester,
                totalStudents: validStudents.length,
                totalMarks: marks.length
            }
        });

    } catch (error) {
        console.error('Error fetching section marks:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error while fetching marks',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports.saveMarks = async (req, res) => {
    try {
        const { sectionId, subjectId, componentName, markingType, marks } = req.body;
        
        // Validate required fields
        if (!sectionId || !subjectId || !markingType || !marks || !componentName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Validate marking type
        if (!['internal', 'external'].includes(markingType)) {
            return res.status(400).json({ success: false, message: 'Invalid marking type' });
        }

        // Get section and subject details
        const section = await Section.findById(sectionId);
        if (!section) {
            return res.status(404).json({ success: false, message: 'Section not found' });
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }

        // Get marking scheme
        const markingScheme = await MarkingSchemeConfig.findOne({
            _id: subject.regulation,
            isActive: true
        });

        if (!markingScheme) {
            return res.status(404).json({ success: false, message: 'Marking scheme not found' });
        }

        // Get components based on subject type
        const components = subject.type === 'Theory' ? 
            markingScheme.theoryComponents[markingType] : 
            markingScheme.labComponents[markingType];

        // Verify component exists and get max marks
        const component = components.find(c => c.name === componentName);
        if (!component) {
            return res.status(400).json({ 
                success: false, 
                message: `Component ${componentName} not found in marking scheme` 
            });
        }

        // Save marks for each student
        const savePromises = Object.entries(marks).map(async ([studentId, mark]) => {
            try {
                let studentMarks = await StudentMarks.findOne({
                    student: studentId,
                    subject: subjectId,
                    semester: section.currentSemester
                });

                if (!studentMarks) {
                    studentMarks = new StudentMarks({
                        student: studentId,
                        subject: subjectId,
                        semester: section.currentSemester,
                        academicYear: section.year,
                        regulation: markingScheme._id,
                        internal: { componentMarks: [] },
                        external: { componentMarks: [] }
                    });
                }

                // Add or update component mark
                const existingMarkIndex = studentMarks[markingType].componentMarks
                    .findIndex(cm => cm.componentName === componentName);

                if (existingMarkIndex >= 0) {
                    studentMarks[markingType].componentMarks[existingMarkIndex].marks = mark;
                } else {
                    studentMarks[markingType].componentMarks.push({
                        componentName: componentName,
                        marks: mark
                    });
                }

                await studentMarks.save();
                return studentMarks;
            } catch (error) {
                console.error(`Error processing student ${studentId}:`, error);
                throw error;
            }
        });

        const savedMarks = await Promise.all(savePromises);

        res.json({
            success: true,
            message: 'Marks saved successfully',
            marks: savedMarks
        });
    } catch (error) {
        console.error('Error saving marks:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error saving marks'
        });
    }
};

const generateMarksExcel = (students, markingScheme, subject, sectionInfo) => {
    // Create worksheet data
    const wsData = [
        [`B.TECH-MID EXAMINATION MARKS SHEET`],
        [`YEAR: ${sectionInfo.year}`, '', `BRANCH: ${sectionInfo.branch}`],
        [`SEM: ${sectionInfo.semester}`, '', `SECTION: ${sectionInfo.name}`],
        [`REGULATION: ${markingScheme.regulation}`, '', `ACADEMIC YEAR: ${sectionInfo.academicYear}`],
        [''], // Empty row for spacing
        [
            'S.No',
            'Roll Number',
            'Name of the Student',
            ...getComponentHeaders(markingScheme, subject),
            'TOTAL',
            'AVG.',
            'Presentation',
            'Total'
        ]
    ];

    // Add student data
    students.forEach((student, index) => {
        const studentRow = [
            index + 1,
            student.rollNo,
            student.name
        ];

        // Add marks for each component
        const components = getComponents(markingScheme, subject);
        components.forEach(component => {
            const mark = student.marks?.find(m => m.componentName === component.name)?.marks || '';
            studentRow.push(mark);
        });

        // Add calculations
        studentRow.push(
            calculateTotal(student.marks, components),
            calculateAverage(student.marks, components),
            student.presentation || '',
            calculateGrandTotal(student.marks, components, student.presentation)
        );

        wsData.push(studentRow);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = [
        { wch: 5 },  // S.No
        { wch: 12 }, // Roll Number
        { wch: 30 }, // Name
        ...Array(getComponents(markingScheme, subject).length).fill({ wch: 10 }), // Component columns
        { wch: 10 }, // TOTAL
        { wch: 10 }, // AVG
        { wch: 12 }, // Presentation
        { wch: 10 }  // Total
    ];
    ws['!cols'] = colWidths;

    // Add styles
    styleWorksheet(ws, wsData.length);

    XLSX.utils.book_append_sheet(wb, ws, 'Marks Sheet');
    return wb;
};

function getComponentHeaders(markingScheme, subject) {
    const components = getComponents(markingScheme, subject);
    return components.map(c => `${c.name} (${c.maxMarks})`);
}

function getComponents(markingScheme, subject) {
    const type = subject.type === 'Theory' ? 'theoryComponents' : 'labComponents';
    return markingScheme[type].internal.filter(c => c.isActive);
}

function calculateTotal(marks, components) {
    if (!marks || !marks.length) return 0;
    return marks.reduce((sum, mark) => sum + (mark.marks || 0), 0);
}

function calculateAverage(marks, components) {
    const total = calculateTotal(marks, components);
    return components.length ? (total / components.length).toFixed(2) : 0;
}

function calculateGrandTotal(marks, components, presentation) {
    return calculateTotal(marks, components) + (presentation || 0);
}

function styleWorksheet(ws, lastRow) {
    // Add cell styles
    const headerStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center' },
        fill: { fgColor: { rgb: "CCCCCC" } }
    };

    // Apply styles to header rows
    for (let row = 1; row <= 6; row++) {
        for (let col = 0; col < 10; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col });
            if (!ws[cellRef]) continue;
            ws[cellRef].s = headerStyle;
        }
    }
}

// Server-side controller addition
module.exports.downloadMarksSheet = async (req, res) => {
    try {
        const { sectionId, subjectId } = req.params;

        const section = await Section.findById(sectionId)
            .populate('branch')
            .populate('currentSemester');
        
        const subject = await Subject.findById(subjectId);
        const markingScheme = await MarkingSchemeConfig.findById(subject.regulation);

        // Get all student marks
        const marks = await StudentMarks.find({
            section: sectionId,
            subject: subjectId
        }).populate('student');

        const workbook = generateMarksExcel(marks, markingScheme, subject, {
            year: section.year,
            branch: section.branch.name,
            semester: section.currentSemester.name,
            name: section.name,
            academicYear: section.academicYear
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=marks-sheet.xlsx');

        // Send the workbook
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);

    } catch (error) {
        console.error('Error generating marks sheet:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating marks sheet'
        });
    }
};