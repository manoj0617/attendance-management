const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true }
});

AdminSchema.plugin(passportLocalMongoose);

const Admin = mongoose.model('Admin', AdminSchema);

module.exports= Admin;
