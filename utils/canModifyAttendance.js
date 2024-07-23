const Attendance = require('../models/attendance');

const canModifyAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).send('Attendance record not found');
    }
    if (attendance.created_by.toString() !== req.user._id.toString()) {
      return res.status(403).send('You do not have permission to modify this attendance record');
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

module.exports = { canModifyAttendance };
