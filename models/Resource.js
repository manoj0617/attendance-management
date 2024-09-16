const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  fileId: { type: String, required: true },  // Google Drive file ID
  fileLink: { type: String, required: true },  // Google Drive file URL
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  sharedWith: {
    year: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicYear'
    },
    branch: { 
        type: Schema.Types.ObjectId,
        ref: 'Branch' 
    },
    section: { 
        type: Schema.Types.ObjectId,
        ref: 'Section' 
    }
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Resource', resourceSchema);
