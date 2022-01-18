const BookInstance = require('../models/bookinstance');
const { body,validationResult } = require('express-validator');
const Book = require('../models/book');
const { DateTime } = require('luxon');

// Display list of all BookInstances.
exports.bookinstanceList = (req, res, next) => {
  try {
    BookInstance.find().populate('book').exec().then(bookinstances => {
      res.render('bookinstanceList', {
        title: 'Book Instance List', 
        bookinstanceList: bookinstances 
      });
    });
  } catch(err) {
    return next(err)
  }  
};

// Display detail page for a specific BookInstance.
exports.bookinstanceDetail = (req, res, next) => {
  try {
    BookInstance.findById(req.params.id).populate('book').exec().then(bookinstance => {
      if (bookinstance === null) { // No results
        const err = new Error('Book copy not found');
        err.status = 404;
        return next(err)
      }
      res.render('bookinstanceDetail', {
        title: `Copy: ${bookinstance.book.title}`,
        bookinstance,});
    });   
  } catch(err) {
    return next(err)
  }
};


// Display BookInstance create form on GET.
exports.bookinstanceCreateGet = (req, res, next) => {
  try {
    Book.find({}, 'title').exec().then(books => {
      res.render('bookinstanceForm', {
        title: 'Create BookInstance',
        bookList: books,
      });
    });    
  } catch(err) {
    return next(err)
  }
};

// Handle BookInstance create on POST.
exports.bookinstanceCreatePost = [

  // Validate and sanitise fields.
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
  body('status').escape(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
  
      // Create a BookInstance object with escaped and trimmed data.
      const bookinstance = new BookInstance({
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,       
      });
      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values and error messages.
        await Book.find({},'title').exec().then(books => {
          res.render('bookinstanceForm', {
            title: 'Create BookInstance',
            bookList: books,
            selected_book: bookinstance.book._id,
            errors: errors.array(),
            bookinstance,
          });
          return
        });        
      } else {
        await bookinstance.save().then(bookinstance => {
          res.redirect(bookinstance.url);
        });
      }
    } catch(err) {
      return next(err)
    }    
  }
];

// Display BookInstance delete form on GET.
exports.bookinstanceDeleteGet = (req, res, next) => {
  try {
    BookInstance.findById(req.params.id).exec().then(bookinstance => {
      if (bookinstance === null) {
        res.redirect('/catalog/bookinstances');
      }
      res.render('bookinstanceDelete', {
        title: 'Delete Copy',
        bookinstance,
      });
    });
  } catch(err) {
    return next(err)
  }  
};

// Handle BookInstance delete on POST.
exports.bookinstanceDeletePost = (req, res, next) => {
  try {
    BookInstance.findByIdAndRemove(req.body.copyid).exec().then(() => res.redirect('/catalog/bookinstances'));
  } catch(err) {
    return next(err)
  }
};

// Display BookInstance update form on GET.
exports.bookinstanceUpdateGet = (req, res, next) => {
  try {
    const books = Book.find({}, 'title').exec();
    const copy = BookInstance.findById(req.params.id).exec();
    Promise.all([books, copy]).then(result => {
      if (result[1] === null) { // No results
        const err = new Error('Copy not found');
        err.status = 404;
        return next(err)
      }
      // Success.
      const formatted = {
        book: result[1].book,
        imprint: result[1].imprint,
        status: result[1].status,
        due_back: DateTime.fromJSDate(result[1].due_back).toFormat('yyyy-MM-dd'),
      }
      res.render('bookinstanceForm', {
        title: 'Update Copy',
        bookList: result[0],
        bookinstance: formatted,
      });
    });   
  } catch(err) {
    return next(err)
  }
};

// Handle bookinstance update on POST.
exports.bookinstanceUpdatePost = [

  // Validate and sanitise fields.
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
  body('status').escape(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
  
      // Create a BookInstance object with escaped and trimmed data.
      const bookinstance = new BookInstance({
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
        _id: req.params.id,       
      });
      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values and error messages.
        Book.find({},'title').exec().then(books => {
          res.render('bookinstanceForm', {
            title: 'Create BookInstance',
            bookList: books,
            selected_book: bookinstance.book._id,
            errors: errors.array(),
            bookinstance,
          });
          return
        });        
      } else {
        BookInstance.findByIdAndUpdate(req.params.id, bookinstance)
          .then(bookinstance => res.redirect(bookinstance.url));
      }
    } catch(err) {
      return next(err)
    }    
  }
];