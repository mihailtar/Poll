# echo "hello";



mongod --config /etc/mongod.conf;

# mongo mongod --replSet my-mongo-set
# mongod --replSet prodRepl;
# mongod --port 20020 --dbpath data --replSet "mongoreplica";
# mongod --replSet replica;
# mongo --eval use admin;
# config = {
# ...       "_id" : "my-mongo-set",
# ...       "members" : [
# ...           {
# ...               "_id" : 0,
# ...               "host" : "mongo1:27017"
# ...           },
# ...           {
# ...               "_id" : 1,
# ...               "host" : "mongo2:27017"
# ...           },
# ...           {
# ...               "_id" : 2,
# ...               "host" : "mongo3:27017"
# ...           }
# ...       ]
# ...   }


# mongo --eval db = (new Mongo('localhost:27017')).getDB('test')
# conf = {_id:"replica", members: [
    # { _id: 0, host: "mongo2:27017" },
    # { _id: 1, host: "mongo:27017" },
# ]}
# mongo --eval rs.initiate(conf);

# mongo --eval rs.conf();

# mongo --eval rs.add('mongodb-node-2:27017');
# mongo --eval rs.add('mongodb-node-3:27017');

# mongo --eval rs.initiate();
# mongo --eval 'rs.status()'

# mongo --eval rs.slaveOk()

# mongo localhost:27017/new_db -u root -p example


# mongod --port 20020 --dbpath data --replSet "prodRepl";