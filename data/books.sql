-- id
-- author
-- title
-- isbn
-- image_url
-- description
-- bookshelf
DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  author VARCHAR(255),
  title VARCHAR(255),
  isbn VARCHAR(255),
  image_url
  description TEXT,
  bookshelf
);