const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const batchSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  section: {
    type: Schema.Types.ObjectId,
    ref: 'Section'
  },
});

Batch=mongoose.model("Batch",batchSchema);
module.exports=Batch;
