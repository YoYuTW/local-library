const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');
const { body,validationResult } = require('express-validator');

exports.index = async (req, res) => {  
  const result = {
    bookCount: 0,
    bookInstanceCount: 0,
    bookInstanceAvailableCount: 0,
    authorCount: 0,
    genreCount: 0,
  };
  try {
    const bookCount = Book.countDocuments().exec();
    const bookInstanceCount = BookInstance.countDocuments().exec();
    const bookInstanceAvaliableCount = BookInstance.countDocuments({status:'Available'}).exec();
    const authorCount = Author.countDocuments().exec();
    const genreCount = Genre.countDocuments().exec();
    Promise.all([bookCount, bookInstanceCount, bookInstanceAvaliableCount, authorCount, genreCount]).then(values => {
      result.bookCount = values[0];
      result.bookInstanceCount = values[1];
      result.bookInstanceAvailableCount = values[2];
      result.authorCount = values[3];
      result.genreCount = values[4];
      res.render('index', {
        title: 'Local Library Home',
        data: result });
    });    
  } catch(err) {
    res.render('error', { error: error });
  }
};

// Display list of all Books.
exports.bookList = (req, res, next) => {
  try {
    Book.find({}, 'title author').sort({title : 1}).populate('author').exec().then(bookList => {
      res.render('bookList', {
        title: 'Book List',
        bookList,
      });
    });
  } catch(err) {
    return next(err)
  }
};

// Display detail page for a specific book.
exports.bookDetail = (req, res, next) => {
  try {
    const getBook = Book.findById(req.params.id).populate('author').populate('genre').exec();
    const getBookinstance = BookInstance.find({ 'book': req.params.id }).exec();
    Promise.all([getBook, getBookinstance]).then(values => {
      if (values[0] === null) { // No results.
        const err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render('bookDetail', {
        title: values[0].title,
        book: values[0],
        bookInstances: values[1]
      });
    });
  } catch(err) {
      return next(err)  
  }  
};


// Display book create form on GET.
exports.bookCreateGet = (req, res, next) => {
  try {
    const author = Author.find().exec();
    const genre = Genre.find().exec();
    Promise.all([author, genre]).then(values => {
      res.render('bookForm', {
        title: 'Create Book',
        authors: values[0],
        genres: values[1],
      });
    });
  } catch(err) {
    return next(err)
  }
};

// Handle book create on POST.
exports.bookCreatePost = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined') {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // Validate and sanitise fields.
  body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
  body('genre.*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });
    
    try {
      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/error messages.

        // Get all authors and genres for form.
        const authors = Author.find().exec();
        const genres = Genre.find().exec();
        Promise.all([authors, genres]).then(values => {
          values[1].forEach(genre => {
            if (book.genre.indexOf(genre._id) > -1) {
              genre.checked = 'true';
            }
          });
          res.render('bookForm', {
            title: 'Create Book',
            authors: values[0],
            genres: values[1],
            book,
            errors: errors.array(),
          });
        });         
        return;
      } else {
        // Data from form is valid. Save book.
        book.save().then(() => {
          //successful - redirect to new book record.
          res.redirect(book.url);
        });
      }
    } catch(err) {
      return next(err)
    }
  }    
];

// Display book delete form on GET.
exports.bookDeleteGet = (req, res, next) => {
  try {
    const book = Book.findById(req.params.id).exec();
    const bookinstance = BookInstance.find({ 'book': req.params.id }).exec();
    Promise.all([book, bookinstance]).then(results => {
      if (results[0] === null) { // No results
        res.redirect('/catalog/books');
      }
      // Successful, so render
      res.render('bookDelete', {
        title: 'Delete Book',
        book: results[0],
        bookinstances: results[1],
      });
    });
  } catch(err) {
    return next(err)
  }
};

// Handle book delete on POST.
exports.bookDeletePost = (req, res, next) => {
  try {
    const book = Book.findById(req.body.bookid).exec();
    const bookinstance = BookInstance.find({ 'book': req.body.bookid }).exec();
    Promise.all([book, bookinstance]).then(results => {
      if (results[1].length > 0) {
        // Book has copies. Render in sameway as for GET route.
        res.render('bookDelete', {
          title: 'Delete Book',
          book: results[0],
          bookinstances: results[1] 
        });
        return;
      } else {
        // Book has no copies. Delete object and redirect to the list of books
        Book.findByIdAndRemove(req.body.bookid).then(result => res.redirect('/catalog/books'));
      }
    });
  } catch(err) {
    return next(err)
  }
};

// Display book update form on GET.
exports.bookUpdateGet = (req, res, next) => {
  try {
    const book = Book.findById(req.params.id).populate('author').populate('genre').exec();
    const authors = Author.find().exec();
    const genres = Genre.find().exec();
    Promise.all([book, authors, genres]).then(result => {
      if (result[0] === null) { // No results
        const err = new Error('Book not found');
        err.status = 404;
        return next(err)
      }
      // Success.
      // Mark our selected genres as checked.
      result[2].forEach(genre => {
        result[0].genre.forEach(bookGenre => {
          if (genre._id.toString() === bookGenre._id.toString()) {
            genre.checked = true;
          }
        });
      });
      res.render('bookForm', {
        title: 'Update Book',
        authors: result[1],
        genres: result[2],
        book: result[0],
      })
    });
  } catch(err) {
    return next(err)
  }
};

// Handle book update on POST.
exports.bookUpdatePost = [

  // Convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
        if (typeof req.body.genre==='undefined') {
          req.body.genre=[];
        } else {
          req.body.genre=new Array(req.body.genre);
        }
    }
    next();
  },

  // Validate and sanitise fields.
  body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
  body('genre.*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    try {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a Book object with escaped/trimmed data and old id.
      const book = new Book(
        { title: req.body.title,
          author: req.body.author,
          summary: req.body.summary,
          isbn: req.body.isbn,
          genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
          _id:req.params.id //This is required, or a new ID will be assigned!
        });

      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/error messages.

        // Get all authors and genres for form.
        const authors = Author.find().exec();
        const genres = Genre.find().exec();
        Promise.all([authors, genres]).then(result => {
          result[1].forEach(genre => {
            if (book.genre.indexOf(genre._id) > -1) {
              genre.checked='true';
            }
          });
          res.render('bookForm', {
            title: 'Update Book',
            authors: result[0],
            genres: result[1],
            book,
            errors: errors.array(),
          });
        });        
        return;
      } else {
        // Data from form is valid. Update the record.
        Book.findByIdAndUpdate(req.params.id, book, {}).then(thebook =>{
          // Successful - redirect to book detail page.
          res.redirect(thebook.url);
        });      
      }
    } catch(err) {
      return next(err)
    }
  }
];
