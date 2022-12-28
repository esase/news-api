import pkg from '../package.json';

export default {
    serviceName: pkg.name,
    mongoHost: process.env.MONGO_HOST ?? '',
    rabbitUrl: process.env.RABBITMQ_URL ?? 'amqp://localhost'
};

