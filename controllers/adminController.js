const { MarkingSchemeConfig } = require('../models/studentMarks');
const AcademicTransitionService = require('../services/AcademicTransitionService');
const AcademicYear = require('../models/academicYear');
const Semester = require('../models/semester');

const academicTransitionService = new AcademicTransitionService();

const adminController = {
    // Render Regulations
    renderRegulations: async (req, res) => {
        try {
            const regulations = await MarkingSchemeConfig.find().sort('-startYear');
            res.render('admin/regulations', { regulations });
        } catch (error) {
            req.flash('error', 'Failed to load regulations');
            res.redirect('/admin/dashboard');
        }
    },

    // Get Single Regulation
    getRegulation: async (req, res) => {
        try {
            const { id } = req.params;
            const regulation = await MarkingSchemeConfig.findById(id);
            
            if (!regulation) {
                return res.status(404).json({
                    success: false,
                    message: 'Regulation not found'
                });
            }

            res.json({
                success: true,
                regulation
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch regulation',
                error: error.message
            });
        }
    },

    // Create New Regulation
    createRegulation: async (req, res) => {
        try {
            const {
                regulation,
                startYear,
                totalInternalMarks,
                totalExternalMarks,
                theoryComponents,
                labComponents,
                gradePoints,
                passingCriteria
            } = req.body;

            // Validate if regulation already exists
            const existingRegulation = await MarkingSchemeConfig.findOne({ regulation });
            if (existingRegulation) {
                return res.status(400).json({
                    success: false,
                    message: 'Regulation already exists'
                });
            }

            const newRegulation = new MarkingSchemeConfig({
                regulation,
                startYear,
                totalInternalMarks,
                totalExternalMarks,
                theoryComponents,
                labComponents,
                gradePoints,
                passingCriteria,
                isActive: true
            });

            await newRegulation.save();

            res.status(201).json({
                success: true,
                message: 'Regulation created successfully',
                regulation: newRegulation
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create regulation',
                error: error.message
            });
        }
    },

    // Update Regulation
    updateRegulation: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const regulation = await MarkingSchemeConfig.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!regulation) {
                return res.status(404).json({
                    success: false,
                    message: 'Regulation not found'
                });
            }

            res.json({
                success: true,
                message: 'Regulation updated successfully',
                regulation
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update regulation',
                error: error.message
            });
        }
    },

    // Delete (Deactivate) Regulation
    deleteRegulation: async (req, res) => {
        try {
            const { id } = req.params;
            const regulation = await MarkingSchemeConfig.findById(id);

            if (!regulation) {
                return res.status(404).json({
                    success: false,
                    message: 'Regulation not found'
                });
            }

            // Instead of deleting, mark as inactive
            regulation.isActive = false;
            await regulation.save();

            res.json({
                success: true,
                message: 'Regulation deactivated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete regulation',
                error: error.message
            });
        }
    },

    showTransitions: async (req, res) => {
        try {
            const academicYears = await AcademicYear.find({ isActive: true })
                .sort({ startDate: -1 })
                .populate('semesters.sem');
            
            const semesters = await Semester.find({});
            
            res.render('admin/transitions', { 
                academicYears, 
                semesters,
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                }
            });
        } catch (error) {
            req.flash('error', 'Error loading academic transitions page');
            res.redirect('/admin/dashboard');
        }
    },
    startNewSemester : async (req, res) => {
        try {
            const { academicYearId, newSemesterId } = req.body;
            const result = await academicTransitionService.startNewSemester(
                academicYearId,
                newSemesterId
            );
    
            // Check if it's an API request (typical indicators)
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json(result);
            }
    
            // Server-side rendered response
            req.flash('success', 'New semester started successfully');
            res.redirect('/admin/transitions');
        } catch (error) {
            // Check if it's an API request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ error: error.message });
            }
    
            // Server-side rendered error handling
            req.flash('error', error.message);
            res.redirect('/admin/transitions');
        }
    },
    startNewAcademicYear: async (req, res) => {
        try {
            const { oldAcademicYearId, newAcademicYearData } = req.body;
            
            // Additional validation
            if (!oldAcademicYearId || !newAcademicYearData) {
                throw new Error('Missing required data');
            }
    
            if (!newAcademicYearData.startDate || !newAcademicYearData.endDate) {
                throw new Error('Start date and end date are required');
            }
    
            // Validate input
            if (!oldAcademicYearId) {
                throw new Error('Previous Academic Year must be selected');
            }
    
            // Ensure dates are valid
            const startDate = new Date(newAcademicYearData.startDate);
            const endDate = new Date(newAcademicYearData.endDate);
    
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid date format');
            }
    
            if (startDate >= endDate) {
                throw new Error('End date must be after start date');
            }
    
            // Add a name if not provided
            if (!newAcademicYearData.name) {
                const startYear = startDate.getFullYear();
                const endYear = endDate.getFullYear();
                newAcademicYearData.name = `${startYear}-${endYear}`;
            }
    
            const result = await academicTransitionService.startNewAcademicYear(
                oldAcademicYearId,
                newAcademicYearData
            );
    
            // Check if it's an API request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'New academic year started successfully',
                    ...result
                });
            }
    
            // Server-side rendered response
            req.flash('success', 'New academic year started successfully');
            res.redirect('/admin/transitions');
        } catch (error) {
            console.error('Start New Academic Year Error:', error);
            
            // Check if it's an API request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ 
                    success: false,
                    error: error.message || 'Failed to start new academic year' 
                });
            }
    
            // Server-side rendered error handling
            req.flash('error', error.message || 'Failed to start new academic year');
            res.redirect('/admin/transitions');
        }
    },
    graduateFinalYear : async (req, res) => {
        try {
            const { academicYearId } = req.body;
            
            // Validate input
            if (!academicYearId) {
                throw new Error('Academic Year must be selected');
            }
    
            const result = await academicTransitionService.graduateFinalYearStudents(
                academicYearId
            );
    
            // Check if it's an API request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json(result);
            }
    
            // Server-side rendered response
            req.flash('success', 'Final year students graduated successfully');
            res.redirect('/admin/transitions');
        } catch (error) {
            // Check if it's an API request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ error: error.message });
            }
    
            // Server-side rendered error handling
            req.flash('error', error.message);
            res.redirect('/admin/transitions');
        }
    }
};

module.exports = adminController;