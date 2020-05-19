const Joi = require('joi');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Neo4j } = require('../models/neo4j');

const { POLL } = require('../models/poll');

class USER {
    static mongo = mongoose.model('User', new mongoose.Schema({
        login: {
            type: String,
            required: true,
            minlength: 1,
            maxlength: 50,
            unique: true
        },
        group: {
            type: String,
            minlength: 1,
            maxlength: 50,
            default: 'user'
        },
        email: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 255,
            unique: true
        },
        password: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 1024
        },
        age: {
            type: Number,
            min: 0,
            max: 120
        },
        name: {
            type: String,
            minlength: 1,
            maxlength: 50
        },
        surname: {
            type: String,
            minlength: 1,
            maxlength: 50
        },
        gender: {
            type: String,
            minlength: 1,
            maxlength: 50
        }
    }));

    static async validate(params = {
        fields: {},
        checkUniqueFields: false,
        customSchema: { login: true, email: true } // add more to limit checks
    }) {
        let { fields, checkUniqueFields, customSchema } = params;

        let user;
        let schema = {
            login: Joi.string().min(1).max(50).required(),
            group: Joi.string().min(1).max(50),
            email: Joi.string().min(5).max(255).required().email(),
            password: Joi.string().min(5).max(255).required(),
            age: Joi.string().min(0).max(120),
            name: Joi.string().min(1).max(50),
            surname: Joi.string().min(1).max(50),
            gender: Joi.string().min(1).max(50)
        };

        if (customSchema) {
            for (let i in customSchema) {
                customSchema[i] = schema[i]
            }
            schema = customSchema;
        }

        if (checkUniqueFields) {
            if (schema.login) {
                user = await this.mongo.findOne({ login: fields.login });
                if (user) {
                    return { error: 'User with this login already exisits' };
                }
            }
            if (schema.email) {
                user = await this.mongo.findOne({ email: fields.email });
                if (user) {
                    return { error: 'User with this email already exisits' };
                }
            }
        }

        let result = Joi.validate(fields, schema)
        return result.error ?
            { error: result.error.details[0].message } :
            false;
    }

    static async create(fields, isInternal) {
        let error = await this.validate({ fields, checkUniqueFields: true });
        if (error) { return error }

        // Insert the new user into mongo
        let user = new this.mongo(fields);

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        await user.save();
        await Neo4j.user.create(user)

        // return password instead of hash to internal calls
        if (isInternal) {
            user.password = fields.password;
        }
        return user
    }

    static async login(fields, session) {
        let error = await this.validate({ fields, customSchema: { login: 1, password: 1 } });
        if (error) { return error }

        let user = await this.mongo.findOne({ login: fields.login });
        if (!user) {
            return { error: 'Incorrect login.' };
        }

        const validPassword = await bcrypt.compare(fields.password, user.password);
        if (!validPassword) { // this is for development only - in production errors for login and erro should be the same to prevent password guessing
            return { error: 'Incorrect password.' };
        }

        session.email = user.email;
        session.group = user.group;
        session.login = fields.login;
        session.mongoId = user._id;

        return { name: user.name, email: user.email, group: user.group, login: fields.login }
    }

    static async delete(fields) {
        let error = await this.validate({ fields, customSchema: { login: 1 } });
        if (error) { return error }

        await Neo4j.user.delete(fields.login)
        return await this.mongo.deleteOne(fields)
    }

    static async loadStats(session) {
        let polls = await POLL.mongo.poll.find({});
        let votes = await Neo4j.user.hasVoted({ login: session.login });
        let allVotes = await Neo4j.poll.allVotes();

        let statistics = {};

        for (let poll of polls) {
            statistics[poll.text] = {
                votes: 0,
                options: {}
            }

            for (let option of poll.options) {
                statistics[poll.text].options[option.text] = {
                    votes: 0,
                    percentage: 0,
                    votedByYou: false
                }
            }
        }

        function calcPercentage(total, current) {
            return current * 100 / total
        }

        for (let record of allVotes.records) {

            let poll = record._fields[0].properties;
            let option = record._fields[1].properties;
            let user = record._fields[2].properties;

            let currentPoll = statistics[poll.text];
            currentPoll.votes += 1;

            let currentOption = currentPoll.options[option.text];
            currentOption.votes += 1;
            if (user.login == session.login) {
                currentOption.votedByYou = true;
            }
        }

        for (let poll in statistics) {
            poll = statistics[poll];
            for (let option in poll.options) {
                option = poll.options[option];
                option.percentage = calcPercentage(poll.votes, option.votes);
            }
        }

        let finished = [];
        if (votes) {
            finished = votes.records.map(poll=>poll._fields[0].properties.text)
        }
        let pending = polls.filter( p => finished.indexOf( p.text ) == -1 ).map( p => p.text );

        return {
            polls: {
                total: polls.length,
                finished,
                pending,
                statistics
            }
        };
    }
}

exports.USER = USER;