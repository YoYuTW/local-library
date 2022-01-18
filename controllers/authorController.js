const Author = require('../models/author');
const Book = require('../models/book');
const { body, validationResult } = require('express-validator');
const { DateTime } = require('luxon');

// Display list of all Authors.
exports.authorList = (req, res, next) => {
  try {
    Author.find().sort([['familyName', 'ascending']]).exec().then(authors => {
      //Successful, so render
      res.render('authorList', {
        title: 'Author List',
        authorList: authors 
      });
    });
  } catch(err) {
    return next(err)
  }  
};

// Display detail page for a specific Author.
exports.authorDetail = (req, res, next) => {
  try {
    const getAuthor = Author.findById(req.params.id).exec();
    const getAuthorBooks = Book.find({ 'author': req.params.id },'title summary').exec();
    Promise.all([getAuthor, getAuthorBooks]).then(values => {
      if (values[0] === null) { // No results.
        const err = new Error('Author not found');
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render('authorDetail', {
        title: 'Author Detail',
        author: values[0],
        authorBooks: values[1] 
      });
    });
  } catch(err) {
      return next(err)
  }
};

// Display Author create form on GET.
exports.authorCreateGet = (req, res) => {
  res.render('authorForm', { 
    title: 'Create Author'
  });
};

// Handle Author create on POST.
exports.authorCreatePost = [
  // Validate and sanitize fields.
  body('firstName').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('familyName').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  body('dateOfBirth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('dateOfDeath', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),
  
  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render('authorForm', {
        title: 'Create Author',
        author: req.body,
        errors: errors.array() 
      });
      return
    } else { // Date from form is valid.
      try {
        const author = new Author({
          firstName: req.body.firstName,
          familyName: req.body.familyName,
          dateOfBirth: req.body.dateOfBirth,
          dateOfDeath: req.body.dateOfDeath,
        });
        author.save().then(value => {
          res.redirect(value.url);
        });
      } catch(err) {
        return next(err)
      };
    }    
  }
];

// Display Author delete form on GET.
exports.authorDeleteGet = (req, res, next) => {
  try {
    const author = Author.findById(req.params.id).exec();
    const authorBooks = Book.find({ 'author': req.params.id }).exec();
    Promise.all([author, authorBooks]).then(results => {
      if (results[0] === null) { // No results
        res.redirect('/catalog/authors');
      }
      // Successful, so render
      res.render('authorDelete', {
        title: 'Delete Author',
        author: results[0],
        authorBooks: results[1],
      });
    });
  } catch(err) {
    return next(err)
  }
};

// Handle Author delete on POST.
exports.authorDeletePost =  (req, res, next) => {
  try {
    const author = Author.findById(req.body.authorid).exec();
    const authorBooks = Book.find({ 'author': req.body.authorid }).exec();
    Promise.all([author, authorBooks]).then(results => {
      if (results[1].length > 0) {
        // Author has books. Render in sameway as for GET route.
        res.render('authorDelete', {
          title: 'Delete Author',
          author: results[0],
          authorBooks: results[1] 
        });
        return;
      } else {
        // Author has no books. Delete object and redirect to the list of authors
        Author.findByIdAndRemove(req.body.authorid).then(() => res.redirect('/catalog/authors'));
      }
    });
  } catch(err) {
    return next(err)
  }
};

// Display Author update form on GET.
exports.authorUpdateGet = (req, res, next) => {
  try {
    Author.findById(req.params.id).exec().then(author => {
      
      if (author === null) { // No result.
        const err = new Error("Genre not found");
        err.status = 404;
        return next(err)
      }
      // Success.
      const authorFormatted = {
        firstName: author.firstName,
        familyName: author.familyName,
        dateOfBirth: DateTime.fromJSDate(author.dateOfBirth).toFormat('yyyy-MM-dd'),
        dateOfDeath: DateTime.fromJSDate(author.dateOfDeath).toFormat('yyyy-MM-dd'),
      };
      res.render('authorForm', {
        title: 'Update Author',
        author: authorFormatted,
      });
    });
  } catch(err) {
    return next(err)
  }
};

// Handle Author update on POST.
exports.authorUpdatePost = [
  // Validate and sanitize fields.
  body('firstName').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('familyName').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  body('dateOfBirth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('dateOfDeath', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),
  
  // Process request after validation and sanitization.
  (req, res, next) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/errors messages.
        res.render('authorForm', {
          title: 'Update Author',
          author: req.body,
          errors: errors.array() 
        });
        return
      } else { // Date from form is valid.
        const author = new Author({
          firstName: req.body.firstName,
          familyName: req.body.familyName,
          dateOfBirth: req.body.dateOfBirth,
          dateOfDeath: req.body.dateOfDeath,
          _id: req.params.id,
        });
        Author.findByIdAndUpdate(req.params.id, author).then(author => {
          res.redirect(author.url);
        });      
      }
    } catch(err) {
      return next(err)
    }        
  }
];
