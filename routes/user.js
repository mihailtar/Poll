const { USER } = require('../models/user');
const express = require('express');
const router = express.Router();

const is = {
  loggedIn: (req) => req.session.login,
  admin: (req) => req.session.group && req.session.group == 'admin'
}

// statistics
router.get('/', async (req, res) => {
    if (!is.loggedIn(req)) {
        return res.status(401).type('json')
      .send({ error: "You need to login in order to view availiable polls" })
    }

    let stats = await USER.loadStats(req.session);
    res.status(stats.error ? 400 : 200).type('json').send(stats);
});

// logout user
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if(err) {
          return console.log(err);
      }
      res.redirect('/');
  });
});

// login user
router.post('/', async (req, res) => {
  let user = await USER.login(req.body, req.session);

  res.status(user.error ? 400 : 200).type('json').send(user);
});

// create new user
router.put('/', async (req, res) => {
  if (!is.admin(req)) {
      return res.status(403).type('json')
          .send({ error: "only admin can create new users" });
  }

  let user = await USER.create(req.body);
  res.status(user.error ? 400 : 200).type('json').send(user);
});

// delete user
router.delete('/', async (req, res) => {
  if (!is.admin(req)) {
    return res.status(403).type('json')
        .send({ error: "only admin can delete users" });
  }

  let user = await USER.delete(req.body);
  res.status(user.error ? 400 : 200).type('json').send(user);
});

module.exports = router;