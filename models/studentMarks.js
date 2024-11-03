const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Grade Points Configuration Schema
const GradePointConfigSchema = new Schema({
  percentage: { type: Number, required: true },
  grade: { type: String, required: true },
  gradePoint: { type: Number, required: true }
}, { _id: false });

// Assessment Component Schema
const AssessmentComponentSchema = new Schema({
  name: { type: String, required: true },
  maxMarks: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { _id: false });

// Marking Scheme Configuration Schema
const MarkingSchemeConfigSchema = new Schema({
  regulation: {
    type: Schema.Types.Mixed, // Changed from String to Mixed to accept both String and ObjectId
    required: true,
    unique: true
  },
  startYear: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  theoryComponents: {
    internal: [AssessmentComponentSchema],
    external: [AssessmentComponentSchema]
  },
  labComponents: {
    internal: [AssessmentComponentSchema],
    external: [AssessmentComponentSchema]
  },
  gradePoints: [GradePointConfigSchema],
  totalInternalMarks: {
    type: Number,
    default: 40
  },
  totalExternalMarks: {
    type: Number,
    default: 60
  },
  passingCriteria: {
    minInternalPercentage: { type: Number, default: 40 },
    minExternalPercentage: { type: Number, default: 40 },
    minTotalPercentage: { type: Number, default: 40 }
  }
}, {
  timestamps: true
});

const InternalMarksSchema = new Schema({
  componentMarks: [{
    componentName: { 
      type: String, 
      required: true,
      validate: {
        validator: async function(v) {
          const doc = this.parent().parent();
          const subject = await mongoose.model('Subject').findById(doc.subject);
          const markingScheme = await mongoose.model('MarkingSchemeConfig').findOne({
            _id: doc.regulation,
            isActive: true
          });
          const components = subject.type === 'Theory' ? 
            markingScheme.theoryComponents.internal : 
            markingScheme.labComponents.internal;
          return components.some(c => c.name === v);
        },
        message: 'Invalid component name'
      }
    },
    marks: { 
      type: Number, 
      required: true,
      min: 0
    }
  }]
}, { _id: false });

const ExternalMarksSchema = new Schema({
  componentMarks: [{
    componentName: { 
      type: String, 
      required: true,
      validate: {
        validator: async function(v) {
          const doc = this.parent().parent();
          const subject = await mongoose.model('Subject').findById(doc.subject);
          const markingScheme = await mongoose.model('MarkingSchemeConfig').findOne({
            _id: doc.regulation,
            isActive: true
          });
          const components = subject.type === 'Theory' ? 
            markingScheme.theoryComponents.external : 
            markingScheme.labComponents.external;
          return components.some(c => c.name === v);
        },
        message: 'Invalid component name'
      }
    },
    marks: { type: Number, required: true }
  }]
}, { _id: false });


// Student Marks Schema (Updated)
const StudentMarksSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  semester: {
    type: Schema.Types.ObjectId,
    ref: 'Semester',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  regulation: {
    type: String,
    required: true,
    ref: 'MarkingSchemeConfig'
  },
  internal: InternalMarksSchema,
  external: ExternalMarksSchema,
  totalMarks: {
    type: Number,
    min: 0,
    max: 100
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String
  },
  gradePoint: {
    type: Number,
    min: 0,
    max: 10
  }
}, {
  timestamps: true
});

// Example of default marking scheme data
const defaultMarkingScheme = {
  regulation: "R20",
  startYear: 2020,
  isActive: true,
  theoryComponents: {
    internal: [
      { name: "Mid1", maxMarks: 30 },
      { name: "Mid2", maxMarks: 30 },
      { name: "Assignment", maxMarks: 5 },
      { name: "Presentation", maxMarks: 5 }
    ],
    external: [
      { name: "Semester End Exam", maxMarks: 60 }
    ]
  },
  labComponents: {
    internal: [
      { name: "Mid1", maxMarks: 10 },
      { name: "Mid2", maxMarks: 10 },
      { name: "DayToDay", maxMarks: 10 },
      { name: "Viva", maxMarks: 10 },
      { name: "Project", maxMarks: 10 }
    ],
    external: [
      { name: "Lab Exam", maxMarks: 60 }
    ]
  },
  gradePoints: [
    { percentage: 90, grade: 'O', gradePoint: 10 },
    { percentage: 80, grade: 'A+', gradePoint: 9 },
    { percentage: 70, grade: 'A', gradePoint: 8 },
    { percentage: 60, grade: 'B+', gradePoint: 7 },
    { percentage: 50, grade: 'B', gradePoint: 6 },
    { percentage: 40, grade: 'C', gradePoint: 5 },
    { percentage: 0, grade: 'F', gradePoint: 0 }
  ]
};
const calculateInternalTotal = (componentMarks, components, subjectType) => {
  if (subjectType === 'Theory') {
    // Find mid-term marks
    const mid1Mark = componentMarks.find(m => m.componentName === 'Mid1')?.marks || 0;
    const mid2Mark = componentMarks.find(m => m.componentName === 'Mid2')?.marks || 0;
    
    // Calculate average of mid-terms (out of 30)
    const midAverage = (mid1Mark + mid2Mark) / 2;
    
    // Get assignment and presentation marks
    const assignmentMark = componentMarks.find(m => m.componentName === 'Assignment')?.marks || 0;
    const presentationMark = componentMarks.find(m => m.componentName === 'Presentation')?.marks || 0;
    
    // Total internal = midAverage + assignment + presentation
    return midAverage + assignmentMark + presentationMark;
  } else {
    // For Lab subjects, simply sum all component marks
    return componentMarks.reduce((total, mark) => {
      const component = components.internal.find(c => c.name === mark.componentName);
      if (component && component.isActive) {
        return total + mark.marks;
      }
      return total;
    }, 0);
  }
};
// Helper function to calculate grade based on marking scheme
const calculateGrade = async function(percentage, regulation) {
  const markingScheme = await mongoose.model('MarkingSchemeConfig').findOne({ 
    _id: regulation,
    isActive: true 
  });
  
  for (const gradePoint of markingScheme.gradePoints) {
    if (percentage >= gradePoint.percentage) {
      return {
        grade: gradePoint.grade,
        gradePoint: gradePoint.gradePoint
      };
    }
  }
  return { grade: 'F', gradePoint: 0 };
};

StudentMarksSchema.pre('save', async function(next) {
  try {
    const markingScheme = await mongoose.model('MarkingSchemeConfig').findOne({
      _id: this.regulation,
      isActive: true
    });
    if (!markingScheme) {
      throw new Error(`Marking scheme not found for regulation: ${this.regulation}`);
    }

    const subject = await mongoose.model('Subject').findById(this.subject);
    if (!subject) {
      throw new Error(`Subject not found with ID: ${this.subject}`);
    }

    const components = subject.type === 'Theory' ? 
      markingScheme.theoryComponents : 
      (subject.type === 'Lab' ? markingScheme.labComponents : null);

    if (!components) {
      throw new Error(`Invalid subject type: ${subject.type}. Must be either 'Theory' or 'Lab'`);
    }

    // Calculate internal marks using the helper function
    let internalTotal = 0;
    if (this.internal && this.internal.componentMarks) {
      internalTotal = calculateInternalTotal(
        this.internal.componentMarks, 
        components, 
        subject.type
      );
    }

    // Calculate external marks
    let externalTotal = 0;
    if (this.external && this.external.componentMarks) {
      for (const mark of this.external.componentMarks) {
        const component = components.external.find(c => c.name === mark.componentName);
        if (component && component.isActive) {
          externalTotal = (mark.marks / component.maxMarks) * markingScheme.totalExternalMarks;
        }
      }
    }

    // Calculate final totals
    this.totalMarks = internalTotal + externalTotal;
    this.percentage = (this.totalMarks / (markingScheme.totalInternalMarks + markingScheme.totalExternalMarks)) * 100;

    if (this.percentage !== undefined) {
      const gradeInfo = await calculateGrade(this.percentage, this.regulation);
      this.grade = gradeInfo.grade;
      this.gradePoint = gradeInfo.gradePoint;
    }

    next();
  } catch (error) {
    console.error('Error in StudentMarks pre-save hook:', error);
    next(error);
  }
});

// Export models
module.exports = {
  MarkingSchemeConfig: mongoose.model('MarkingSchemeConfig', MarkingSchemeConfigSchema),
  StudentMarks: mongoose.model('StudentMarks', StudentMarksSchema)
};