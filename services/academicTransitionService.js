const mongoose = require('mongoose');

class AcademicTransitionService {
  constructor() {
    this.AcademicYear = mongoose.model('AcademicYear');
    this.Section = mongoose.model('Section');
    this.Student = mongoose.model('Student');
    this.Semester = mongoose.model('Semester');
  }

  /**
   * Start a new semester within the same academic year
   */
  async startNewSemester(academicYearId, newSemesterId) {
    try {
      // 1. Validate inputs
      const academicYear = await this.AcademicYear.findById(academicYearId);
      if (!academicYear) throw new Error('Academic year not found');

      const semester = await this.Semester.findById(newSemesterId);
      if (!semester) throw new Error('Semester not found');

      // 2. Update academic year's current semester
      await this.AcademicYear.findByIdAndUpdate(
        academicYearId,
        {
          $set: {
            'semesters.$[elem].isActive': false
          },
          $push: {
            semesters: {
              sem: newSemesterId,
              startDate: new Date(),
              endDate: null,
              isActive: true
            }
          }
        },
        {
          arrayFilters: [{ 'elem.isActive': true }]
        }
      );

      // 3. Update all active sections for this academic year
      await this.Section.updateMany(
        { 
          academicYear: academicYearId,
          isActive: true 
        },
        { 
          $set: { currentSemester: newSemesterId }
        }
      );

      return { message: 'New semester started successfully' };
    } catch (error) {
      throw new Error(`Failed to start new semester: ${error.message}`);
    }
  }

  /**
   * Start a new academic year and promote sections/students
   */
  async startNewAcademicYear(oldAcademicYearId, newAcademicYearData) {
    try {
      // 1. Create new academic year
      const newAcademicYear = await this.AcademicYear.create({
        name: newAcademicYearData.name,
        startDate: newAcademicYearData.startDate,
        endDate: newAcademicYearData.endDate,
        isActive: true
      });

      // 2. Get all active sections from previous year
      const oldSections = await this.Section.find({
        academicYear: oldAcademicYearId,
        isActive: true
      }).populate('students.student');

      // 3. Create sections for new year (only for existing sections)
      for (const oldSection of oldSections) {
        // Skip if it's final year section
        if (oldSection.yearOfStudy >= 4) continue;

        // Create new section with same name
        const newSection = await this.Section.create({
          name: oldSection.name,
          yearOfStudy: oldSection.yearOfStudy + 1,
          academicYear: newAcademicYear._id,
          branch: oldSection.branch,
          isActive: true
        });

        // Move eligible students to new section
        for (const studentEntry of oldSection.students) {
          if (studentEntry.status === 'active') {
            await this.Student.findByIdAndUpdate(
              studentEntry.student._id,
              {
                $set: {
                  year: newAcademicYear._id,
                  section: newSection._id,
                  currentYear: oldSection.yearOfStudy + 1
                },
                $push: {
                  academicHistory: {
                    academicYear: newAcademicYear._id,
                    section: newSection._id,
                    status: 'active'
                  }
                }
              }
            );
          }
        }
      }

      // 4. Mark old academic year as inactive
      await this.AcademicYear.findByIdAndUpdate(
        oldAcademicYearId,
        { $set: { isActive: false } }
      );

      return { message: 'New academic year started successfully' };
    } catch (error) {
      throw new Error(`Failed to start new academic year: ${error.message}`);
    }
  }

  /**
   * Graduate final year students
   */
  async graduateFinalYearStudents(academicYearId) {
    try {
      const finalYearSections = await this.Section.find({
        academicYear: academicYearId,
        yearOfStudy: 4,
        isActive: true
      });

      for (const section of finalYearSections) {
        // Update all active students in final year sections
        await this.Student.updateMany(
          {
            '_id': { $in: section.students.map(s => s.student) },
            'academicHistory.status': 'active'
          },
          {
            $set: {
              'academicHistory.$.status': 'graduated'
            }
          }
        );
      }

      return { message: 'Final year students graduated successfully' };
    } catch (error) {
      throw new Error(`Failed to graduate students: ${error.message}`);
    }
  }
}
module.exports = AcademicTransitionService;