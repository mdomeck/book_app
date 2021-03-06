'use strict'

const express = require('express');
const app = express();

require('dotenv').config();
require('ejs');
const superagent = require('superagent');

const pg = require('pg');
const { response } = require('express');

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', error => {
  console.log('ERROR', error);
});

const methodOverride = require('method-override'); // lets us change the method in html



// app.set('views', './views');
// set the view engine
app.set('view engine', 'ejs'); // use to parse our template


// global variables
const PORT = process.env.PORT || 3001;

// middleware
app.use(express.static('./public')); //where out static front end is going to live
app.use(express.urlencoded({ extended: true })); // decodes out response.body- body parser
app.use(methodOverride('_method'));

// routes
app.get('/', getAllFromDatabase);
app.get('/books/:books_id', getOneBook);
app.get('/app', showResults);
app.post('/addbook', addBook);
app.get('/searches/new', renderSearchPage);
app.post('/searches', collectSearchResults);
app.put('/update/:id', updateBook);


function getAllFromDatabase(request, response) {
  let sql = 'SELECT * FROM books;';
  client.query(sql)
    .then(results => {
      let books = results.rows;
      response.render('./pages/index', { results: books });
    })
    .catch(error => {
      console.error(error);
      response.status(500).send("Kill me please");
    })

}

function getOneBook(request, response) {
  console.log('this is my request.params:', request.params);

  let id = request.params.books_id;

  let sql = 'SELECT * FROM books WHERE id=$1;';
  let safeValues = [id];

  client.query(sql, safeValues)
    .then(results => {
      console.log('this should be the book that I selected', results.rows);
      let selectedBooks = results.rows[0];
      response.render('./pages/books/show.ejs', { bookSelection: selectedBooks });
    })

}

function showResults(request, response) {
  response.render('pages/books');
}

function addBook(request, response) {
  let formData = request.body;
  console.log('This is our form data', formData);
  let { author, title, isbn, image_url, description, bookshelf } = request.body

  let sql = 'INSERT INTO books (author, title, isbn, image_url, description, bookshelf) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID;';

  let safeValues = [author, title, isbn, image_url, description, bookshelf];


  client.query(sql, safeValues)
    .then(results => {
      let books_id = results.rows[0].id;
      console.log('this should be an id', books_id);
      response.redirect(`/books/${books_id}`);
    })
    .catch(error => {
      console.log(error);
      response.status(500).send('Sorry, something went wrong');
    })
}


// functions

function renderSearchPage(request, response) {
  response.render('pages/searches/new.ejs');
}

function collectSearchResults(request, response) {
  console.log('this is the form data:', request.body);

  let query = request.body.search[0];
  let category = request.body.search[1];
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  if (category === 'title') { url += `+intitle:${query}` }
  if (category === 'author') { url += `+inauthor:${query}` };

  superagent.get(url)
    .then(results => {
      console.log('superagents results', results.body);
      let bookArray = results.body.items;

      const finalBookArray = bookArray.map(book => {
        return new Book(book.volumeInfo);
      })
      console.log('finalBookArray results', finalBookArray);

      response.render('pages/searches/show.ejs', { searchResults: finalBookArray });
    }).catch((error) => {
      console.log('ERROR', error);
      response.status(500).send('Sorry, something went wrong');
    })
}

function updateBook(request, response) {
  let id = request.params.id;
  let { title, author, description, isbn, image_url, bookshelf } = request.body;
  let sql = 'UPDATE books SET title=$1, author=$2, description=$3, isbn=$4, image_url=$5, bookshelf=$6 WHERE id =$7';
  let safeValues = { title, author, description, isbn, image_url, bookshelf };

  client.query(sql, safeValues)
    .then(res => {
      response.status(200).redirect('/');
    })
}

function Book(obj) {

  let str = obj.imageLinks.smallThumbnail;
  let regex = /^http:/
  if (regex.test(str)) {
    str.replace(regex, 'https:');
  }

  this.title = obj.title ? obj.title : 'no title available';
  this.image_url = obj.imageLinks ? obj.imageLinks.smallThumbnail : 'https://i.imgur.com/J5LVHEL.jpg';
  this.author = obj.authors ? obj.authors[0] : 'no author available';
  this.description = obj.description ? obj.description : 'no description available';
  this.isbn = obj.industryIdentifiers[0].identifier;
  this.bookshelf = '';

}

app.use('*', (request, response) => {
  response.status(404).send('page not found');
});


client.connect()
  .then(() => {
    app.listen(PORT, () => console.log(`listening on ${PORT}`));
  }).catch(err => console.log('ERROR', err));