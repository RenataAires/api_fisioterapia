const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
     ? { rejectUnauthorized: false }
     :false,
});

pool.connect((err, client, release) => {
    if(err){
        console.error('Erro ao conectar no banco de dados:', err.message);
        return;
    }
    release();
    console.log('Banco de dados conectado com sucesso!');
});


module.exports = pool;

