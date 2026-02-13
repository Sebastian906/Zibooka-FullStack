import { ConfigService } from "@nestjs/config";
import * as mysql from 'mysql2/promise';

export const getMySQLConnection = async (
    configService: ConfigService,
): Promise<mysql.Connection> => {
    const connection = await mysql.createConnection({
        host: configService.get<string>('MYSQL_HOST') || 'localhost',
        port: configService.get<number>('MYSQL_PORT') || 3306,
        user: configService.get<string>('MYSQL_USER') || 'root',
        password: configService.get<string>('MYSQL_PASSWORD'),
        database: configService.get<string>('MYSQL_DATABASE') || 'zibooka_db',
        timezone: 'Z',
    });

    console.log('[MySQL] Connection established successfully');
    return connection;
};