'use strict'

const express = require('express');
const app = express();

require('dotenv').config();
require('ejs');
const superagent = require('superagent');

const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', error => {
  console.log('ERROR', error);
});

// set the view engine
app.set('view engine', 'ejs'); // use to parse our template


// global variables
const PORT = process.env.PORT || 3001;

// middleware

app.use(express.static('./public')); //where out static front end is going to live
app.use(express.urlencoded({extended: true})); // decodes out response.body- body parser

// routes
// app.get('/', renderHomePage);
app.get('/books/:books_id', getOneBook);
app.get('/app', showResults);
app.post('/add', addBook);
app.get('/searches/new', renderSearchPage);
app.post('/searches', collectSearchResults);


function getAllFromDatabase(request, response) {
  let sql = 'SELECT * FROM books;';
  client.query(sql)
  .then(results => {
    let books = results.rows;
    response.render('index.ejs', {results: books});
  })
}

function getOneBook(request, response){
  console.log('this is my request.params:', request.params);

  let id = request.params.books_id;

  let sql = 'SELECT * FROM books WHERE id=$1;';
  let safeValues = [id];

  client.query(sql, safeValues)
  .then(results => {
    console.log('this should be the book that I selected', results.rows);
    let selectedBooks = results.rows[0];
    response.render('./pages/index', {books:selectedBooks});
  })
  // return(selectedBooks.id);
}

function showResults(request, response){
  response.render('pages/books');
}

function addBook(request, response){
  let formData = request.body;
  console.log('This is our form data', formData);
  let {title, desription} = request.body

  let sql = 'INSERT INTO books (title, author, description, isbn, image_url, bookshelf) VALUES ($1, $2, $3, $4, $5, $6)RETURNING ID;';

  let safeValues = [title, author, description, isbn,image_url, bookshelf];

  client.query(sql, safeValues)
  .then(results => {
    let id = results.rows[0];
    console.log('this should be an id', id);
    response.redirect(`/books/${id}`);
  })
}


// functions

function renderHomePage(request, response){
  response.render('pages/index');
}

function renderSearchPage(request, response){
  response.render('pages/searches/new.ejs');
}

function collectSearchResults(request, response){
  console.log('this is the form data:', request.body);

  let query = request.body.search[0];
  let category = request.body.search[1];
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  if(category === 'title'){url += `+intitle:${query}`}
  if(category === 'author'){url += `+inauthor:${query}`};

superagent.get(url)
  .then(results => {
    console.log('superagents results', results.body);
    let bookArray = results.body.items;

    const finalBookArray = bookArray.map(book => {
      return new Book(book.volumeInfo);
    })
    console.log('finalBookArray results', finalBookArray);

    response.render('pages/searches/show.ejs', {searchResults: finalBookArray});
  }).catch((error) => {
    console.log('ERROR', error);
    response.status(500).send('Sorry, something went wrong');
  })
}

  function Book(obj){

    let str = obj.imageLinks.smallThumbnail;
    let regex = /^http:/
    if(regex.test(str)) {
      str.replace(regex, 'https:');
    }

    this.title = obj.title ? obj.title : 'no title available';
    this.image = obj.imageLinks ? obj.imageLinks.smallThumbnail : 'https://i.imgur.com/J5LVHEL.jpg';
    this.authors = obj.authors ? obj.authors[0] : 'no author available';
    this.description = obj.description ? obj.description : 'no description available';
    this.isbn = obj.industryIdentifiers[0].identifier;
    // this.bookshelf = obj.industryIdentifiers.categories[0];
    // console.log(obj.industryIdentifiers.categories[0]);
  }

app.use('*', (request, response) => {
  response.status(404).send('page not found');
});

// // turn on the server
// app.listen(PORT, () => {
//   console.log(`listening on ${PORT}`);
// });

client.connect()
  .then(() => {
    app.listen(PORT, () => console.log(`listening on ${PORT}`));
  }).catch(err => console.log('ERROR', err));