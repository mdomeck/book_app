'use strict'

const express = require('express');
const app = express();

require('dotenv').config();
require('ejs');
const superagent = require('superagent');
const { response } = require('express');

// const pg = require('pg');
// const client = new pg.Client(process.env.DATABASE_URL);
// client.on('error', error => {
//   console.log('ERROR', error);
// });

// set the view engine
app.set('view engine', 'ejs'); // use to parse our template


// global variables
const PORT = process.env.PORT || 3001;

// middleware

app.use(express.static('./public')); //where out static front end is going to live
app.use(express.urlencoded({extended: true})); // decodes out response.body- body parser

// routes



app.get('/', renderHomePage);

// app.get('/tasks/:task_id', getOneTask);
// app.get('/app', showForm);
// app.post('/add', addTask);

app.get('/searches/new', renderSearchPage);

app.post('/searches', collectSearchResults);


// function getAllTasksFromDatabase(request, response) {
//   let sql = 'SELECT * FROM tasks;';
//   client.query(sql)
//   .then(results => {
//     let tasks = results.rows;
//     response.render('index.ejs', {results: tasks});
//   })
// }

// function getOneTask(request, response){
//   console.log('this is my request.params:', request.params);

//   let id = request.params.task_id;

//   let sql = 'SELECT * FROM tasks WHERE id=$1;';
//   let safeValues = [id];

//   client.query(sql, safeValues)
//   .then(results => {
//     console.log('this should be the task that I selected', results.rows);
//     let selectedTask = results.rows[0];
//     response.render('pages/detail-view', {task:selectedTask});
//   })
// }

// function showForm(request, response){
//   response.render('pages/');
// }

// function addTask(request, response){
//   let formData = request.body;
//   console.log('This is our form data', formData);
//   let {title, desription} = request.body

//   let sql = 'INSERT INTO tasks (title, description) VALUES ($1, $2)RETURNING ID;';

//   let safeValues = [title, description];

//   client.query(sql, safeValues)
//   .then(results => {
//     let id = results.rows[0];
//     console.log('this should be an id', id);

//     response.redirect(`/tasks/${id}`);
//   })
// }


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

  }

app.use('*', (request, response) => {
  response.status(404).send('page not found');
});

// turn on the server
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

// client.connect()
//   .then(() => {
//     app.listen(PORT, () => console.log(`listening on ${PORT}`));
//   }).catch(err => console.log('ERROR', err));