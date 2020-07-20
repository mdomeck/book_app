'use strict'

const express = require('express');
const app = express();

require('dotenv').config();
require('ejs');
const superagent = require('superagent');
const { response } = require('express');

// set the view engine
app.set('view engine', 'ejs');

// global variables
const PORT = process.env.PORT || 3001;

// middleware

app.use(express.static('./public'));
app.use(express.urlencoded({extended: true}));

app.get('/', renderHomePage);
app.get('/newSearch', renderSearchPage);

app.post('/searches', collectSearchResults);


// functions

function renderHomePage(request, response){
  response.render('pages/index');
}

function renderSearchPage(request, response){
  response.render('pages/searches/new.ejs')
}

function collectSearchResults(request, response){
  console.log('this is the form data:' request.body);

  let query = request.body.search[0];
  let category = request.body.search[1];
  let url = 'https://www.googleleapis.com/books/v1/volumes?q='

  if(category === 'title'){url+= `+intitle:${query}`}
  if(category === 'author'){url+= `+inauthor:${query}`};
}

superagent.get(url)
  .then(results => {
    // console.log('superagents results', results.body);
    let bookArray = results.body.items;

    const finalBookArray = bookArray.map(book => {
      // console.log('superagents results', book.volumeInfo);
      return new Book(book.volumeInfo);
    })

    response.render('pages/show.ejs', {searchResults: finalBookArray});
  })


  function Book(obj){
    this.title = obj.title ? obj.title : 'no title available';
  }

// turn on the server
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

