const neo4j = require('neo4j-driver')

let neo4jDriver = neo4j.driver(
  'neo4j://192.168.99.100',
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);


const Neo4j = {
    user: {
        async create(user) {
            return await Neo4j.query(`
            CREATE (result:Person { name: "${user.name||user.login}", login: "${user.login}", email: "${user.email}" })
            RETURN result
            `)
        },
        async delete(login) {
            return await Neo4j.query(`
              MATCH (n:Person { login: '${login}' })
              DETACH DELETE n
            `)
        },
        async hasVoted(params = { login: '', poll: '' }) {
            let poll = params.poll ? `poll {text: "${params.poll}"}` : 'poll';

          return await Neo4j.query(`
          MATCH result=(person {login: "${params.login}"})-[:Answers]->()-[:Belongs]->(${poll}) RETURN poll
            `)
        },
    },
    poll: {
        async create(poll) {
            let { options, text } = poll;
            await Neo4j.query(`CREATE (ee:Poll { text: "${text}" })`)

            for (let option of options) {
                await Neo4j.poll.createOption(option, text)
            }
        },
        async createOption(option, poll) {
            return await Neo4j.query(`
            MATCH(po:Poll) WHERE po.text = "${poll}"
            CREATE (op:Option { text: "${option.text}" }),
            (op)-[:Belongs]->(po)
            `)
        },
        async delete(text) {
            return await Neo4j.query(`
              MATCH p=()-[r:Belongs]->({text:"${text}"})
              DETACH DELETE p
            `)
        },
        async vote(params = { login: '', poll:'', option:'' }) {
            return await Neo4j.query(`
                MATCH (option {text: "${params.option}"})-[:Belongs]->(poll {text: '${params.poll}'})
                MATCH (person:Person) WHERE person.login="${params.login}"
                CREATE result=(person)-[:Answers]->(option)
                RETURN result LIMIT 1
            `)
        },
        async update(text, poll) {
            await Neo4j.poll.delete(text);
            return await Neo4j.poll.create(poll)
        },

        async allVotes() {
            return await Neo4j.query(`
          MATCH result=(person)-[:Answers]->(option)-[:Belongs]->(poll) RETURN poll, option, person
            `);
        }
    },

  async session() {
      return neo4jDriver.session({
          database: 'tests',
          defaultAccessMode: neo4j.session.WRITE
      })
  },

  async query(query) {
      let session = await Neo4j.session();
      return await session
          .run(query)
          .catch(error => console.error(error))
  }

}

exports.Neo4j = Neo4j;