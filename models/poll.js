const Joi = require('joi');
const mongoose = require('mongoose');
const { Neo4j } = require('../models/neo4j');

class POLL{
  static mongo = {
    poll: mongoose.model('Poll', new mongoose.Schema({
      text: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 1024,
        unique: true
      },
      options: [ new mongoose.Schema({
        text: {
          type: String,
          required: true,
          minlength: 1,
          maxlength: 1024
        }
      }) ]
    })),

    answer: mongoose.model('Answer', new mongoose.Schema({
      userId: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 1024
      },
      pollId: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 1024
      },
      optionId: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 1024
      }
    }))
  }

  static validate = {
    vote(fields) {
      const schema = {
        poll: Joi.string().min(1).max(1024).required(),
        option: Joi.string().min(1).max(1024).required(),
      };

      return Joi.validate(fields, schema);
    },
    poll(fields) {
      const schema = {
        text: Joi.string().min(1).max(1024).required(),
        options: Joi.array().items(
          Joi.object({
            text: Joi.string().min(1).max(1024).required(),
          })
        ).min(1)
      };
      return Joi.validate(fields, schema);
    }
  }

  static async create(fields) {
    // First Validate The Request
    const { error } = this.validate.poll(fields);
    if (error) {
        return { error: error.details[0].message };
    }

    // Check if this poll already exisits
    let poll = await this.mongo.poll.findOne({ text: fields.text });
    if (poll) {
        return { error: 'That poll already exisits!' };
    }

    // Insert the new poll if it does not exist yet
    poll = new this.mongo.poll({
        text: fields.text,
        options: fields.options
    });

    await poll.save();
    await Neo4j.poll.create(poll);

    return poll;
  }

  static async vote(fields, session) {
    const { error } = this.validate.vote(fields);
    if (error) {return { error: error.details[0].message }}

    let poll = await this.mongo.poll.findOne({ text: fields.poll })
    if (!poll) {
      return {error: "poll is not found"};
    }

    let option = poll.options.find(o => o.text == fields.option);
    if (!option) {
      return {error: "option is not found"};
    }

    let answerData = {
      pollId: poll._id,
      optionId: option._id,
      userId: session.id
    };

    let isAnswered = await this.mongo.answer.findOne(answerData);
    if (isAnswered) {
      return {error: "You can't vote more than once"};
    }

    let answer = new this.mongo.answer(answerData)
    await answer.save();

    await Neo4j.poll.vote({ login: session.login, poll: poll.text, option: option.text });
    return {status: 'save'};
  }

  static async delete(fields) {
    if (!fields.text) {
      return {error: 'text field is required'}
    }
    await Neo4j.poll.delete(fields.text)
    return await this.mongo.poll.deleteOne(fields)
  }

  static async update(json) {
    let results = [];
    for (let poll in json) {
      const { error } = this.validate.poll(json[poll]);
      const target = await this.mongo.poll.findOne({ text: poll });
      if (error) {
        results.push({ error: error.details[0].message })
      } else if (!target) {
        results.push({ error: 'poll is not found' })
      } else {
        // check if poll with new text already exist
        const isTextChanged = poll != json[poll].text;
        const isPollExist = isTextChanged? await this.mongo.poll.findOne({ text: json[poll].text }) : false;

        if (isPollExist) {
          results.push({ error: 'poll with this text already exist' })
        } else {
          results.push(await this.mongo.poll.findOneAndUpdate({ text: poll }, json[poll]));
          await Neo4j.poll.update(poll, json[poll])
        }
      }
    }
    return results;
  }
}

exports.POLL = POLL;