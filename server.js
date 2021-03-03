/***********************************************************************/
/************************IMPORT MODULES*********************************/
/***********************************************************************/

// load the server dependencies
const express = require('express');
const cors = require('cors');
const ejs = require('ejs');
const pg = require('pg');//postgress module
const dotenv = require('dotenv');
const superagent = require('superagent');//super agent module help in working with api's
var methodOverride = require('method-override');

/***********************************************************************/
/**********************SERVER CONFIGURATION******** ********************/
/***********************************************************************/

dotenv.config(); //configure .env file 

const PORT = process.env.PORT;

//const client = new pg.Client(process.env.DATABASE_URL);     //configure  client db
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });//heroko
const app = express();
app.use(cors());
app.use(express.static('./public/'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');      // set the view engine to ejs
app.use(methodOverride('_method'))



/***********************************************************************/
/***********************END POINTS**************************************/
/***********************************************************************/

/******HOME ******/
app.get('/', (req, res) => {
    const query = 'SELECT * FROM books';
    client.
        query(query).
        then(data => {
            console.log("hello i am [HOME] route and my data is",data.rows)
            res.render('./pages/index', { "books": data.rows })
        }).catch(error => {
            console.log(error);
            res.render('./pages/error', { "error": error })
        });
});

/******SEARCH ******/
app.get('/search', (req, res) => {
    // console.log(res, req);
    res.render('./pages/searches/new')
});
/******SEARCH RESULT ******/
app.post('/searches/show', (req, res) => {
    //request google  google book api 
    console.log("hello i am [SEARCHES/SHOWS]")
    let baseAPIUrl = "https://www.googleapis.com/books/v1/volumes"
    let searchQuery = req.body.searchQuery + "+" + req.body.searchBy;
    superagent
        .get(baseAPIUrl)
        .query({q: searchQuery})
        .then(data => {
            console.log("hello i am [SEARCHES/show] route ");
            
            res.render('./pages/searches/show', { "results": getBookArray(data) });
        })
        .catch(error => {
            res.render('./pages/error', { "error": error })
        });
});
/******BOOK SHOW******/
app.get('/books/:id', (req, res) => {
    let id = req.params.id;
    const query = 'SELECT * FROM books WHERE id=$1';
    let safeValue = [id];
    client.
        query(query, safeValue).
        then(data => {
            console.log("hello i am [BOOK SHOW] route and my data is",data.rows)
            res.render('./pages/books/show.ejs', { "books": data.rows })
        }).catch(error => {
            console.log(error);
            res.render('./pages/error', { "error": error })
        });
})
/******BOOK POST ******/
app.post('/books', (req, res) => {
    console.log("hello I am [/BOOKS] post ");

    const item = JSON.parse(req.body.item);
    const dbQuery = 'INSERT INTO books (author, title, isbn, image_url,description)VALUES($1,$2,$3,$4,$5) RETURNING id';
    const safeValues = [item.author, item.title, item.isbn, item.image_url, item.description];
    client
        .query(dbQuery, safeValues).then(data => {
            // now i need the id of the inserted item 
            const id=data.rows[0].id;//because the returning word in the query
            console.log("hello i am [books] route and my data is ",Array.of(item));
            res.redirect("/books/"+id);    
        })
        .catch(error => {
            res.render('./pages/error', { "error": error })
        });
});
/******BOOK UPDATE ******/
app.put('/books/:id', function (req, res) {
    const id=req.params.id;
    const item=req.body;
    console.log("hello i am a  put request",id)
    console.log("hello i am data from form ",item);
    //const item = JSON.parse(req.body.item);
     const dbQuery = 'UPDATE books SET author=$1,title=$2,isbn=$3,image_url=$4,description=$5 WHERE id= $6';
     const safeValues = [item.author, item.title, item.isbn, item.image_url, item.description,id];
    client
        .query(dbQuery, safeValues).then(data => { 
            console.log("successfuly updated data")
            res.redirect("/books/"+id);
            //res.redirect(`/books/:${id}`);
        })
        .catch(error => {
            res.render('./pages/error', { "error": error })
            console.log(error);
        });
})
/******BOOK DELETE ******/
app.delete("/books/:id",(req,res)=>{
    const id=req.params.id;
    console.log("hello i am [books] delete ",id);
    const dbQuery='DELETE FROM books WHERE id=$1'
    const safeValue=[id];
    client.
        query(dbQuery,safeValue).
        then(data=>{
            console.log("succeessfully deleted ");
            res.redirect('/');
        }).
        catch(error=>{
            res.render('./pages/error', { "error": error })
        })


});

app.get('/hello', (req, res) => {
    res.render('./pages/index');
});

/***********************************************************************/
/***********************DATA MODEL**************************************/
/***********************************************************************/
function Book(title, img, authorName, description, isbn) {
    this.title = title || 'unknown title';
    this.image_url = secure(img) || 'https://i.imgur.com/J5LVHEL.jpg';
    // this.img = secure(img);
    this.authorName = formatAuthor(authorName) || 'unknown author';
    this.description = description || 'unavailable description';
    this.isbn = formatIsbn(isbn) || "unavailable isbn";
}

/***********************************************************************/
/***********************HELPER FUNCTIONS********************************/
/***********************************************************************/
function secure(img) {
    if (typeof img == typeof undefined) return null;
    let url = img.thumbnail;
    if (url[5] != 's') {
        var i = url.split("")
        i.splice(4, 0, 's');
    }
    return i.join("");
}
function formatIsbn(isbn) {
    if (isbn.length != 0)
        return isbn[0].type + " " + isbn[0].identifier//isbn
    return null;
}
function formatAuthor(author) {
    if (typeof author == typeof undefined) return null;
    if (author.length != 0)
        return author.join(", ");
    return null;
}
function getBookArray(data) {
    const temp = [];
    for (let index = 0; index < 10; index++) {
        const element = data.body.items[index];
        const book = new Book(
            element.volumeInfo.title,
            element.volumeInfo.imageLinks,
            element.volumeInfo.authors,
            element.volumeInfo.description,
            element.volumeInfo.industryIdentifiers
        );
        temp.push(book);
    }
    return temp;
}
/***********************************************************************/
/*************************RUN*******************************************/
/***********************************************************************/
client.connect().then(() => {
    app.listen(PORT, () => {
        console.log('app is lestining in port ....', PORT);
    });
}).catch(error => {
    console.log('error app is not lestining in port ....', error);
});