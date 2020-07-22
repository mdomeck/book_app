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

app.set('views', './views');
// set the view engine
app.set('view engine', 'ejs'); // use to parse our template


// global variables
const PORT = process.env.PORT || 3001;

// middleware
app.use(express.static('./public')); //where out static front end is going to live
app.use(express.urlencoded({extended: true})); // decodes out response.body- body parser

// routes
app.get('/', getAllFromDatabase);
app.get ('/books/:books_id', getOneBook);
app.get ('/app', showResults);
app.post ('/add', addBook);
app.get ('/searches/new', renderSearchPage);
app.post ('/searches', collectSearchResults);
app.post('/addbook', addBookToFavorites);


function getAllFromDatabase (request, response)
{
  let sql = 'SELECT * FROM books;';
  client.query (sql)
      .then (results =>
             {
               let books = results.rows;
               response.render ('./pages/index', {results: books});
             })
      .catch(error =>
             {
               console.error(error);
               response.status(500).send("Kill me please");
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
    response.render('./pages/books/show.ejs', {bookSelection:selectedBooks});
  })
  // return(selectedBooks.id);
}

function showResults(request, response){
  response.render('pages/books');
}

function addBook(request, response){
  let formData = request.body;
  console.log('This is our form data', formData);
  let {title, description} = request.body

  let sql = 'INSERT INTO books (title, author, description, isbn, image_url, bookshelf) VALUES ($1, $2, $3, $4, $5, $6)RETURNING ID;';

  let safeValues = [title, author, description, isbn,image_url, bookshelf];

  client.query(sql, safeValues)
  .then(results => {
    let id = results.rows[0];
    console.log('this should be an id', id);
    response.redirect(`/books/${id}`);
  })
  .catch(error => {
    console.log(error);
    response.status(500).send('Sorry, something went wrong');
  })
}


// functions

function renderHomePage(request, response){
  response.render('pages/index.ejs');
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

// function addBookToFavorites(request, response){
//   console.log('this is my form data from my add to favs', request.body);

//   let {author, title, image, description} = request.body;

//   let sql = 'INSERT INTO books (author, title, image_url, decription) VALUES ($1, $2, $3, $4) RETURNING id;';

// let safeValues = [author title, image, description];

// client.query(sql, safeValues)
// .then(results => {
//   console.log('sql results', results.rows[0].id);
//   let id = results.rows[0].id;
//   response.status(200).redirect(`/boos/${id}`);
// })

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
    this.bookshelf = [];
    
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