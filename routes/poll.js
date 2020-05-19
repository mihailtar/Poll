const express = require('express');
const router = express.Router();
const { POLL } = require('../models/poll');

const is = {
  loggedIn: (req) => req.session.login,
  admin: (req) => req.session.group && req.session.group == 'admin'
}


router.get('/', (req, res) => {
  res.redirect('/');
});

// vote
router.post('/', async (req, res) => {
  if (!is.loggedIn) {
    return res.status(401).type('json')
      .send({ error: "You need to login in order to vote" })
  }

  let result = await POLL.vote(req.body, req.session);
  res.status(result.error ? 400 : 200).type('json').send(result);
});

// create new Poll
router.put('/', async (req, res) => {
  if (!is.admin(req)) {
    return res.status(403).type('json')
      .send({ error: "only admin can create new polls" });
  }

  let result = await POLL.create(req.body)
  res.status(result.error ? 400 : 200).type('json').send(result);
});

// delete poll
router.delete('/', async (req, res) => {
  if (!is.admin(req)) {
    return res.status(403).type('json')
        .send({ error: "only admin can delete polls" });
  }

  let result = await POLL.delete(req.body)
  res.status(result.error ? 400 : 200).type('json').send(result);
});

// update polls
router.patch('/', async (req, res) => {
  if (!is.admin(req)) {
    return res.status(403).type('json')
      .send({ error: "only admin can create new polls" });
  }

  let results = await POLL.update(req.body);
  res.type('json').send(results);
})

module.exports = router;