// loading credentials from .env file
require('dotenv').config()

// init express
const express = require('express');
const app = express();
const session = require('express-session');


// init redis
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client = redis.createClient({host: '192.168.99.100', port: 6379});
app.use(session({
    secret: "secret",
    store: new redisStore({ host: '192.168.99.100', port: 6379, client: client, ttl : 260}),
    saveUninitialized: false,
    resave: false
}));

// init mongo
const mongoose = require('mongoose');
const { USER } = require('./models/user');
mongoose.connect('mongodb://192.168.99.100/', {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // user: process.env.MONGO_USERNAME,
    // pass: process.env.MONGO_PASSWORD,
    keepAlive: true,
}).then(() => {
  // create admin user if he does not exist yet
  USER.create({
    login: 'admin',
    group: 'admin',
    email: 'admin@admin.com',
    password: 'password'
  }, 1).then(admin => {
    if (!admin.error) {
      console.log(`New admin user has been created
    login: ${admin.login}
    password: ${admin.password}`, admin)
    }
  })
})
  .catch(err => console.error('Something went wrong', err));

// init influxdb
const Influx = require('influx')
const os = require('os')

const influx = new Influx.InfluxDB({
    host: '192.168.99.100',
    port: 8086,
    database: 'express_response_db',
    schema: [
      {
        measurement: 'response_times',
        fields: {
          path: Influx.FieldType.STRING,
          duration: Influx.FieldType.INTEGER
        },
        tags: [
          'host'
        ]
      }
    ]
})

influx.getDatabaseNames()
.then(names => {
  if (!names.includes('express_response_db')) {
    return influx.createDatabase('express_response_db');
  }
})
.catch(err => {
  console.error(`Error creating Influx database!`);
})

// logging response times with influx
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`Request to ${req.originalUrl} took ${duration}ms`);

    influx.writePoints([
      {
        measurement: 'response_times',
        tags: { host: os.hostname() },
        fields: { duration, path: req.originalUrl },
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  })

  return next()
})


// routing
app.use(express.json());
app.use('/', express.Router());

const user = require('./routes/user');
app.use('/', user);

const poll = require('./routes/poll');
app.use('/poll', poll);


const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Listening on port ${port}...`));