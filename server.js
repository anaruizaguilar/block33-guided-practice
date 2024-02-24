const pg = require('pg');
const express = require('express');
const app = express();

const client = new pg.Client(process.env.DATABASE_URL || 'postgress://localhost/acme_notes_categories_db');

app.use(express.json());
app.use(require('morgan')('dev'));

app.get('/api/categories', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM categories;';
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
})

app.get('/api/notes', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM notes ORDER BY create_at DESC;';
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
})

app.post('/api/notes', async (req, res, next) => {
    try {
        const SQL = `
            INSERT INTO notes(txt, category_id)
            VALUES($1, $2)
            RETURNING *;
            `;
        const response = await client.query(SQL, [req.body.txt, req.body.category_id]);
        res.send(response.rows[0]);
    } catch (error) {
        next(error);
    }
})

app.put('/api/notes/:id', async (req, res, next) => {
    try {
        const SQL = `
            UPDATE notes
            SET txt=$1, ranking=$2, category_id=$3, updated_at=now()
            WHERE id=$4
            RETURNING *;
            `;
        const response = await client.query(SQL, [req.body.txt, req.body.ranking, req.body.category_id, req.params.id]);
        res.send(response.rows[0]);
    } catch(error) {
        next(error);
    }
})

app.delete('/api/notes/:id', async (req, res, next) => {
    try {
        const SQL = `
            DELETE FROM notes
            WHERE id=$1
            `;
        const response = await client.query(SQL, [req.params.id]);
        res.sendStatus(204);
    } catch(error) {
        next(error);
    }
})

const init = async () => {
    await client.connect();
    let SQL = `
        DROP TABLE IF EXISTS notes;
        DROP TABLE IF EXISTS categories;
        CREATE TABLE categories(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
        );
        CREATE TABLE notes(
            id SERIAL PRIMARY KEY,
            create_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            ranking INTEGER DEFAULT 3 NOT NULL,
            txt VARCHAR(255) NOT NULL,
            category_id INTEGER REFERENCES categories(id) NOT NULL
        )`;
    await client.query(SQL);
    console.log('tables created');

    SQL = `
        INSERT INTO categories(name) VALUES('SQL');
        INSERT INTO categories(name) VALUES('Express');
        INSERT INTO categories(name) VALUES('Shopping');
        INSERT INTO notes(txt, ranking, category_id) VALUES('learn express', 5, (SELECT id FROM categories WHERE name='Express'));
        INSERT INTO notes(txt, ranking, category_id) VALUES('add logging middleware', 5, (SELECT id FROM categories WHERE name='SQL'));
        INSERT INTO notes(txt, ranking, category_id) VALUES('learn about foreign keys', 4, (SELECT id FROM categories WHERE name='SQL'));
        INSERT INTO notes(txt, ranking, category_id) VALUES('buy a quart of milk', 2, (SELECT id FROM categories WHERE name='Shopping'));
        `;
    await client.query(SQL);
    console.log('data seeded');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`App listening in port ${PORT}`);
    })
}

init();