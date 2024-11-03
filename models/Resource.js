const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  fileId: { type: String, required: true },  // Google Drive file ID
  fileLink: { type: String, required: true },  // Google Drive file URL
  uploader: { 
    type: Schema.Types.ObjectId, 
    refPath: 'uploaderType', // Dynamic reference either to Admin or Faculty
    required: true 
  },
  uploaderType: { 
    type: String, 
    required: true, 
    enum: ['Admin', 'Faculty']  // Specifies whether the uploader is an Admin or Faculty
  },
  sharedWith: [{
    year: { type: Schema.Types.ObjectId, ref: 'AcademicYear' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    section: { type: Schema.Types.ObjectId, ref: 'Section' }
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Resource', resourceSchema);
