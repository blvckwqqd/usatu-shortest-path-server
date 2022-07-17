if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
};

const Pool = require('pg').Pool
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGUHOST,
  database: process.env.PGDB,
  password: process.env.PGPASS,
  port: process.env.PGPORT,
});

const connect = async () => {
  await pool.connect((err, client, release)=> {
    if (err) {
      return console.error('Error while connecting pool', err.stack)
    }
    client.query('SELECT NOW()', (err, result) => {
      release();
      if (err) {
        return console.error('Error executing query', err.stack)
      }
      console.log("Database Connected Successfully at Time: ", result.rows[0].now)
    })
  });
};

pool.on('error', (err, client) => {
  console.log(client);
  console.error('idle client error', err.message, err.stack);
});

const dbquery = async (text, value=[])=> {
  //console.log('query:', text, value);
  const client = await pool.connect();
  try {
    const res = await client.query(text, value);
    //console.log(res)
    return res.rows;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  connect,
  dbquery
}