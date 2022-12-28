import fastify from 'fastify';
import { MongoClient, ObjectId } from 'mongodb';
import config from './config';
import client from 'prom-client';
import { connect } from 'amqplib';

interface News {
    _id: string;
    title: string;
    body: string;
}

const app = async () => {
    const mongoClient = new MongoClient(config.mongoHost);
    const newsCollection = mongoClient.db().collection('news');

    const rabbitMqConnection = await connect(config.rabbitUrl);
    const rabbitMq = await rabbitMqConnection.createChannel();

    const server = fastify();

    const register = new client.Registry();

    client.collectDefaultMetrics({
        prefix: 'node_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        register,
        labels: { NODE_APP_INSTANCE: config.serviceName }
    });

    server.get('/metrics', async (request, result) =>  {
        result.header('Content-Type', register.contentType);
        result.send(await register.metrics());
    });

    server.get('/ping', async () =>  'pong');

    server.get('/', async () =>  newsCollection.find({}).toArray());

    server.post<{ Body: News, Reply: News }>('/', async (request) => {
        const result = await newsCollection.insertOne({
            title: request.body.title,
            body: request.body.body
        });

        rabbitMq.publish('amq.topic', 'news-api.news.created', Buffer.from(JSON.stringify({
            id: result.insertedId
        })));

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

        rabbitMq.publish('amq.topic', 'news-api.news.updated', Buffer.from(JSON.stringify({
            id: request.params.id
        })));

        return await newsCollection.findOne({
            _id: new ObjectId(request.params.id).valueOf()
        }) as unknown as News;
    });

    server.delete<{ Params: { id: string } }>('/:id', async (request) => {
        await newsCollection.deleteOne({
            _id: new ObjectId(request.params.id).valueOf()
        });

        rabbitMq.publish('amq.topic', 'news-api.news.deleted', Buffer.from(JSON.stringify({
            id: request.params.id
        })));

        return {};
    });

    server.listen({ port: 8080 }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Server listening at ${address}`);
    });
};

app();