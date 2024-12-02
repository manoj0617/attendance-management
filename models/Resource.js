const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resourceSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['notes', 'assignment', 'circular', 'notice', 'event'],
    validate: {
      validator: function(v) {
        // Admin can only upload circulars, notices, and events
        if (this.uploaderType === 'Admin') {
          return ['circular', 'notice', 'event'].includes(v);
        }
        // Faculty can only upload notes and assignments
        return ['notes', 'assignment'].includes(v);
      },
      message: 'Invalid resource type for the uploader role'
    }
  },
  fileId: { 
    type: String, 
    required: true  // Google Drive file ID
  },
  fileLink: { 
    type: String, 
    required: true  // Google Drive file URL
  },
  uploader: { 
    type: Schema.Types.ObjectId, 
    refPath: 'uploaderType',
    required: true 
  },
  uploaderType: { 
    type: String, 
    required: true, 
    enum: ['Admin', 'Faculty']
  },
  accessControl: {
    allYears: {
      type: Boolean,
      default: false
    },
    years: [{
      year: { 
        type: Schema.Types.ObjectId, 
        ref: 'AcademicYear' 
      },
      allBranches: {
        type: Boolean,
        default: false
      },
      branches: [{
        branch: { 
          type: Schema.Types.ObjectId, 
          ref: 'Branch' 
        },
        allSections: {
          type: Boolean,
          default: false
        },
        sections: [{
          type: Schema.Types.ObjectId,
          ref: 'Section'
        }]
      }]
    }]
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-save middleware to update the updatedAt timestamp
resourceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to check if a student has access to a resource
resourceSchema.statics.hasAccess = async function(resourceId, student) {
  const resource = await this.findById(resourceId);
  if (!resource) return false;

  // If resource is shared with all years, student has access
  if (resource.accessControl.allYears) return true;

  // Check year-specific access
  const yearAccess = resource.accessControl.years.find(y => 
    y.year.equals(student.year)
  );
  
  if (!yearAccess) return false;

  // If all branches in this year have access
  if (yearAccess.allBranches) return true;

  // Check branch-specific access
  const branchAccess = yearAccess.branches.find(b => 
    b.branch.equals(student.branch)
  );

  if (!branchAccess) return false;

  // If all sections in this branch have access
  if (branchAccess.allSections) return true;

  // Check section-specific access
  return branchAccess.sections.some(s => 
    s.equals(student.section)
  );
};

// Instance method to add access for a specific combination
resourceSchema.methods.addAccess = async function(year, branch, section) {
  // If year doesn't exist in the access control, add it
  let yearAccess = this.accessControl.years.find(y => y.year.equals(year));
  if (!yearAccess) {
    yearAccess = { year, branches: [] };
    this.accessControl.years.push(yearAccess);
  }

  // If branch doesn't exist for this year, add it
  let branchAccess = yearAccess.branches.find(b => b.branch.equals(branch));
  if (!branchAccess) {
    branchAccess = { branch, sections: [] };
    yearAccess.branches.push(branchAccess);
  }

  // Add section if it doesn't exist
  if (section && !branchAccess.sections.includes(section)) {
    branchAccess.sections.push(section);
  }

  await this.save();
};

// Instance method to set all access for a year
resourceSchema.methods.setAllAccessForYear = async function(year) {
  let yearAccess = this.accessControl.years.find(y => y.year.equals(year));
  if (!yearAccess) {
    yearAccess = { year, branches: [], allBranches: true };
    this.accessControl.years.push(yearAccess);
  } else {
    yearAccess.allBranches = true;
  }
  await this.save();
};

// Instance method to set all access for a branch
resourceSchema.methods.setAllAccessForBranch = async function(year, branch) {
  let yearAccess = this.accessControl.years.find(y => y.year.equals(year));
  if (!yearAccess) {
    yearAccess = { 
      year, 
      branches: [{ branch, sections: [], allSections: true }] 
    };
    this.accessControl.years.push(yearAccess);
  } else {
    let branchAccess = yearAccess.branches.find(b => b.branch.equals(branch));
    if (!branchAccess) {
      yearAccess.branches.push({ branch, sections: [], allSections: true });
    } else {
      branchAccess.allSections = true;
    }
  }
  await this.save();
};

module.exports = mongoose.model('Resource', resourceSchema);