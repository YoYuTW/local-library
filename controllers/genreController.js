const Genre = require('../models/genre');
const Book = require('../models/book');
const { body, validationResult } = require('express-validator');

// Display list of all Genre.
exports.genreList = (req, res, next) => {
  try {
    Genre.find().sort([['name', 'ascending']]).exec().then(genres => {
    //Successful, so render
    res.render('genreList', {
      title: 'Genre List',
      genreList: genres 
    });
  });
  } catch(err) {
    return next(err)
  }  
};

// Display detail page for a specific Genre.
exports.genreDetail = (req, res, next) => {
  try {
    const getGenre = Genre.findById(req.params.id).exec();
    const getGenreBooks = Book.find({ 'genre': req.params.id }).exec();    
    Promise.all([getGenre, getGenreBooks]).then(values => {   
      if (values[0] === null) {
        const err = new Error('Genre not found');
        err.status = 404;
        return next(err)
      }
      res.render('genreDetail', {
        title: 'Genre Detail',
        genre: values[0],
        genreBooks: values[1],
      });
    });
  } catch(err) {
    return next(err)
  }
};

// Display Genre create form on GET.
exports.genreCreateGet = (req, res, next) => {
  res.render('genreForm', {
    title: 'Create Genre',
  });
};

// Handle Genre create on POST.
exports.genreCreatePost = [

  // Validate and sanitize the name field.
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const newGenre = new Genre({ 
      name: req.body.name 
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genreForm', {
        title: 'Create Genre',
        genre: newGenre,
        errors: errors.array(),
      });
      return;
    }
    else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      try {
        Genre.findOne({ 'name': req.body.name }).exec().then(genre => {
          if (genre) {
            res.redirect(genre.url);
            return
          } else {
          newGenre.save().then(value => res.redirect(value.url));
          }
        });
      } catch(err) {
          return next(err)
      }      
    }
  }
];


// Display Genre delete form on GET.
exports.genreDeleteGet = (req, res, next) => {
  try {
    const genre = Genre.findById(req.params.id).exec();
    const books = Book.find({ 'genre': req.params.id }).exec();
    Promise.all([genre, books]).then(result => {
      if (result[0] === null) { // No results
        res.redirect('/catalog/genres');        
      } else {
        // Successful, so render.
        res.render('genreDelete', {
          title: 'Delete Genre',
          genre: result[0],
          books: result[1],
        });
      }
    });
  } catch(err) {
    return next(err)
  } 
};

// Handle Genre delete on POST.
exports.genreDeletePost = (req, res) => {
  try {
    const genre = Genre.findById(req.params.id).exec();
    const books = Book.find({ 'genre': req.params.id }).exec();
    Promise.all([genre, books]).then(result => {
      if (result[1].length > 1) {
        // Genre has associated books. Render in same way in GET method.
        res.render('genreDelete', {
          title: 'Delete Genre',
          genre: result[0],
          books: result[1],
        });
      } else {
        // Genre has no books. Delete object and redirect to the list of genres.
        Genre.findByIdAndRemove(req.body.genreid).then(result => res.redirect('/catalog/genres'));
      }
    });
  } catch(err) {
    return next(err)
  }
};

// Display Genre update form on GET.
exports.genreUpdateGet = (req, res, next) => {
  try {
    Genre.findById(req.params.id).exec().then(result => {
      if (result === null) { // No results
        const err = new Error('Genre not found');
        err.status = 404;
        return next(err)
      }
      // Success.
      res.render('genreForm', {
        title: 'Update Genre',
        genre: result,
      });
    });
  } catch(err) {
    return next(err)
  }
};

// Handle Genre update on POST.
exports.genreUpdatePost = [

  // Validate and sanitize the name field.
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    try {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a genre object with escaped and trimmed data.
      const genre = new Genre({ 
        name: req.body.name,
        _id: req.params.id, 
      });

      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values/error messages.
        res.render('genreForm', {
          title: 'Update Genre',
          genre: genre,
          errors: errors.array(),
        });
        return;
      }
      else {
        // Data from form is valid.  
        Genre.findByIdAndUpdate(req.params.id, genre).then(genre => res.redirect(genre.url));
      }
    } catch(err) {
      return next(err)
    }      
  } 
];
