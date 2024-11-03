const { MarkingSchemeConfig } = require('../models/studentMarks');

module.exports.renderRegulations = async (req, res) => {
    try {
        const regulations = await MarkingSchemeConfig.find().sort('-startYear');
        res.render('admin/regulations', { regulations });
    } catch (error) {
        req.flash('error', 'Failed to load regulations');
        res.redirect('/admin/dashboard');
    }
};

module.exports.getRegulation = async (req, res) => {
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
};

module.exports.createRegulation = async (req, res) => {
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
};

module.exports.updateRegulation = async (req, res) => {
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
};

module.exports.deleteRegulation = async (req, res) => {
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
};