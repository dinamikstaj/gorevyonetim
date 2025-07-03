const mongoose = require('mongoose');

const PersonnelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Personnel', PersonnelSchema);
