const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const Schema = mongoose.Schema;

const AuthorSchema = new Schema(
  {
    firstName: { type: String, required: true, maxlength: 100 },
    familyName: { type: String, required: true, maxlength: 100 },
    dateOfBirth: { type: Date },
    dateOfDeath: { type: Date },
  }
);

AuthorSchema
.virtual('name')
.get(function () {
// To avoid errors in cases where an author does not have either a family name or first name
// We want to make sure we handle the exception by returning an empty string for that case
  let fullname = '';
  if (this.firstName && this.familyName) {
    fullname = this.familyName + ', ' + this.firstName;
  }
  /*
  if (!this.firstName || !this.familyName) {
    fullname = '';
  }
  */
  return fullname;
});

// Virtual for author's lifespan
AuthorSchema.virtual('lifespan').get(function() {
  if (!this.dateOfBirth) {
    return `NO BIRTH AND DEATH DATA`
  }
  const death = this.dateOfDeath ? this.dateOfDeath.getFullYear() : '';
  return `${this.dateOfBirth.getFullYear()} - ${death}`;
});

AuthorSchema.virtual('url').get(function() {
  return `/catalog/author/${this._id}`;
});

AuthorSchema.virtual('birthFormatted').get(function() {
  return this.dateOfBirth ? DateTime.fromJSDate(this.dateOfBirth).toLocaleString(DateTime.DATE_MED) : '';
});

AuthorSchema.virtual('deathFormatted').get(function() {
  return this.dateOfDeath ? DateTime.fromJSDate(this.dateOfDeath).toLocaleString(DateTime.DATE_MED) : '';
});

module.exports = mongoose.model('Author', AuthorSchema);

