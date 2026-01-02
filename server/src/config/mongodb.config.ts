import { ConfigService } from "@nestjs/config";
import { MongooseModuleOptions } from "@nestjs/mongoose";

export const getMongoConfig = (
    configService: ConfigService,
): MongooseModuleOptions => {
    const uri = configService.get<string>('MONGODB_URI');
    if (!uri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    return {
        uri: `${uri}/Zibooka`,
        retryWrites: true,
        w: 'majority',
        onConnectionCreate: (connection) => {
            connection.on('connected', () => {
                console.log('MongoDB connected successfully');
            });
            connection.on('error', (error) => {
                console.error('MongoDB connection error:', error);
            });
        },
    };
};