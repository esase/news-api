import fastify from 'fastify';
import { MongoClient, ObjectId } from 'mongodb';
import config from './config';

const mongoClient = new MongoClient(config.mongoHost);
const newsCollection = mongoClient.db().collection('news');

const server = fastify();

interface News {
    _id: string;
    title: string;
    body: string;
}

server.get('/', async () =>  newsCollection.find({}).toArray());

server.get('/ping', async () =>  'pong');

server.post<{ Body: News, Reply: News }>('/', async (request) => {
    const result = await newsCollection.insertOne({
        title: request.body.title,
        body: request.body.body
    });

    return await newsCollection.findOne({
        _id: result.insertedId
    }) as unknown as News;
});

server.put<{ Params: { id: string }, Body: News, Reply: News }>('/:id', async (request) => {
    await newsCollection.updateOne({
        _id: new ObjectId(request.params.id).valueOf()
    }, {
        $set: {
            title: request.body.title,
            body: request.body.body
        }
    });

    return await newsCollection.findOne({
        _id: new ObjectId(request.params.id).valueOf()
    }) as unknown as News;
});

server.delete('/', async () => {
    await newsCollection.deleteMany({});

    return {};
});

server.delete<{ Params: { id: string } }>('/:id', async (request) => {
    await newsCollection.deleteOne({
        _id: new ObjectId(request.params.id).valueOf()
    });

    return {};
});

server.listen({ port: 8080 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
