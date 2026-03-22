import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection as MongoConnection } from 'mongoose';
import * as mysql from 'mysql2/promise';
import { getMySQLConnection } from '../config/mysql.config';

interface MigrationStats {
    collection: string;
    total: number;
    migrated: number;
    failed: number;
    errors: string[];
}

@Injectable()
export class MigrationService {
    private mysqlConnection: mysql.Connection | null = null;

    constructor(
        @InjectConnection() private mongoConnection: MongoConnection,
        private configService: ConfigService,
    ) { }

    // Ejecuta la migración completa de MongoDB a MySQL
    async runFullMigration(): Promise<{
        success: boolean;
        message: string;
        stats: MigrationStats[];
        totalTime: string;
    }> {
        const startTime = Date.now();
        const stats: MigrationStats[] = [];

        try {
            // 1. Conectar a MySQL
            this.mysqlConnection = await getMySQLConnection(this.configService);
            console.log('[Migration] MySQL connection established');

            // 2. Migrar en orden (respetando las foreign keys)
            stats.push(await this.migrateUsers());
            stats.push(await this.migrateProducts());
            stats.push(await this.migrateProductImages());
            stats.push(await this.migrateProductTranslations());
            stats.push(await this.migrateAddresses());
            stats.push(await this.migrateOrders());
            stats.push(await this.migrateShelves());
            stats.push(await this.migrateLoans());
            stats.push(await this.migrateReservations());

            // 3. Recalcular multas
            await this.recalculateFines();

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

            return {
                success: true,
                message: 'Migration completed successfully',
                stats,
                totalTime: `${totalTime} seconds`,
            };
        } catch (error) {
            console.error('[Migration] Error:', error);
            throw new InternalServerErrorException(`Migration failed: ${error.message}`);
        } finally {
            // Cerrar conexión MySQL
            await this.closeMySQL();
        }
    }

    // Re-migra SOLO la colección shelves (útil para correcciones)
    async remigrateShelves(): Promise<{
        success: boolean;
        message: string;
        stats: MigrationStats;
    }> {
        try {
            this.mysqlConnection = await getMySQLConnection(this.configService);
            console.log(
                '[Migration] MySQL connection established for shelves re-migration',
            );

            console.log('[Migration] Cleaning existing shelves data...');
            await this.mysqlConnection.execute('DELETE FROM shelf_books');
            await this.mysqlConnection.execute('DELETE FROM shelves');
            console.log('[Migration] Shelves data cleaned successfully');

            const stats = await this.migrateShelves();

            await this.closeMySQL();

            return {
                success: true,
                message: 'Shelves re-migrated successfully',
                stats,
            };
        } catch (error) {
            console.error('[Migration] Shelves re-migration error:', error);
            throw new InternalServerErrorException(
                `Shelves re-migration failed: ${error.message}`,
            );
        }
    }

    // Verifica el estado de la migración
    async getMigrationStatus(): Promise<{
        mongo: Record<string, number>;
        mysql: Record<string, number>;
        differences: Record<string, { mongo: number; mysql: number; diff: number }>;
    }> {
        try {
            this.mysqlConnection = await getMySQLConnection(this.configService);

            const collections = [
                'users',
                'products',
                'addresses',
                'orders',
                'shelves',
                'loans',
                'reservations',
            ];

            const mongo: Record<string, number> = {};
            const mysqlCounts: Record<string, number> = {};
            const differences: Record<
                string,
                { mongo: number; mysql: number; diff: number }
            > = {};

            for (const collection of collections) {
                mongo[collection] = await this.mongoConnection
                    .collection(collection)
                    .countDocuments();

                const [rows] = await this.mysqlConnection!.execute(
                    `SELECT COUNT(*) as count FROM ${collection}`,
                );
                mysqlCounts[collection] = (rows as any)[0].count;

                differences[collection] = {
                    mongo: mongo[collection],
                    mysql: mysqlCounts[collection],
                    diff: mongo[collection] - mysqlCounts[collection],
                };
            }

            await this.closeMySQL();

            return { mongo, mysql: mysqlCounts, differences };
        } catch (error) {
            throw new InternalServerErrorException(
                `Error checking migration status: ${error.message}`,
            );
        }
    }

    // Migra la colección users
    private async migrateUsers(): Promise<MigrationStats> {
        const stats = this.emptyStats('users');

        try {
            const users = await this.mongoConnection
                .collection('users')
                .find({})
                .toArray();
            stats.total = users.length;
            console.log(`[Migration] Migrating ${stats.total} users...`);

            for (const user of users) {
                try {
                    await this.mysqlConnection!.execute(
                        `INSERT INTO users
               (id, name, email, password, phone, profile_image, cart_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name), phone = VALUES(phone),
               profile_image = VALUES(profile_image),
               cart_data = VALUES(cart_data), updated_at = VALUES(updated_at)`,
                        [
                            user._id.toString(),
                            user.name,
                            user.email,
                            user.password,
                            user.phone || null,
                            user.profileImage || null,
                            JSON.stringify(user.cartData || {}),
                            user.createdAt || new Date(),
                            user.updatedAt || new Date(),
                        ],
                    );
                    stats.migrated++;
                } catch (error) {
                    this.recordError(stats, `User ${user.email}`, error);
                }
            }

            console.log(
                `[Migration] Users: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Migra la colección products (con normalización de autores, editoriales, categorías)
    private async migrateProducts(): Promise<MigrationStats> {
        const stats = this.emptyStats('products');

        try {
            const products = await this.mongoConnection
                .collection('products')
                .find({})
                .toArray();
            stats.total = products.length;
            console.log(`[Migration] Migrating ${stats.total} products...`);

            const authorMap = new Map<string, number>();
            const publisherMap = new Map<string, number>();
            const categoryMap = new Map<string, number>();

            for (const product of products) {
                try {
                    const authorId = await this.upsertNamedEntity(
                        'authors',
                        product.author,
                        authorMap,
                    );
                    const publisherId = await this.upsertNamedEntity(
                        'publishers',
                        product.publisher,
                        publisherMap,
                    );
                    const categoryId = await this.upsertNamedEntity(
                        'categories',
                        product.category,
                        categoryMap,
                    );

                    await this.mysqlConnection!.execute(
                        `INSERT INTO products (
               id, isbn, name, description, author_id, publisher_id,
               category_id, price, offer_price, page_count, publication_year,
               popular, in_stock, shelf_location, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name), description = VALUES(description),
               price = VALUES(price), offer_price = VALUES(offer_price),
               in_stock = VALUES(in_stock), updated_at = VALUES(updated_at)`,
                        [
                            product._id.toString(),
                            product.isbn || null,
                            product.name,
                            product.description || null,
                            authorId,
                            publisherId,
                            categoryId,
                            product.price,
                            product.offerPrice,
                            product.pageCount || null,
                            product.publicationYear || null,
                            product.popular ? 1 : 0,
                            product.inStock ? 1 : 0,
                            product.shelfLocation
                                ? product.shelfLocation.toString()
                                : null,
                            product.createdAt || new Date(),
                            product.updatedAt || new Date(),
                        ],
                    );

                    stats.migrated++;
                } catch (error) {
                    this.recordError(stats, `Product ${product.name}`, error);
                }
            }

            console.log(
                `[Migration] Products: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Migra las imágenes de productos (array → filas)
    private async migrateProductImages(): Promise<MigrationStats> {
        const stats = this.emptyStats('product_images');

        try {
            const products = await this.mongoConnection
                .collection('products')
                .find({})
                .toArray();
            console.log(`[Migration] Migrating product images...`);

            for (const product of products) {
                if (!Array.isArray(product.images)) continue;

                for (let i = 0; i < product.images.length; i++) {
                    try {
                        stats.total++;
                        await this.mysqlConnection!.execute(
                            `INSERT INTO product_images (product_id, image_url, display_order)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE image_url = VALUES(image_url)`,
                            [product._id.toString(), product.images[i], i + 1],
                        );
                        stats.migrated++;
                    } catch (error) {
                        this.recordError(stats, `Image ${product._id}`, error);
                    }
                }
            }

            console.log(
                `[Migration] Product images: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Migra las traducciones de productos (object → filas)
    private async migrateProductTranslations(): Promise<MigrationStats> {
        const stats = this.emptyStats('product_translations');

        try {
            const products = await this.mongoConnection
                .collection('products')
                .find({})
                .toArray();
            console.log(`[Migration] Migrating product translations...`);

            for (const product of products) {
                if (!product.translations || typeof product.translations !== 'object')
                    continue;

                for (const [lang, translation] of Object.entries(
                    product.translations as Record<string, any>,
                )) {
                    try {
                        stats.total++;
                        await this.mysqlConnection!.execute(
                            `INSERT INTO product_translations
                 (product_id, language_code, name, description, category)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 name = VALUES(name), description = VALUES(description),
                 category = VALUES(category)`,
                            [
                                product._id.toString(),
                                lang,
                                translation.name || null,
                                translation.description || null,
                                translation.category || null,
                            ],
                        );
                        stats.migrated++;
                    } catch (error) {
                        this.recordError(
                            stats,
                            `Translation ${product._id}-${lang}`,
                            error,
                        );
                    }
                }
            }

            console.log(
                `[Migration] Translations: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Migra la colección addresses
    private async migrateAddresses(): Promise<MigrationStats> {
        const stats = this.emptyStats('addresses');

        try {
            const addresses = await this.mongoConnection
                .collection('addresses')
                .find({})
                .toArray();
            stats.total = addresses.length;
            console.log(`[Migration] Migrating ${stats.total} addresses...`);

            for (const address of addresses) {
                try {
                    await this.mysqlConnection!.execute(
                        `INSERT INTO addresses (
               id, user_id, first_name, last_name, email, street,
               city, state, country, zipcode, phone, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               first_name = VALUES(first_name), last_name = VALUES(last_name),
               street = VALUES(street), city = VALUES(city),
               updated_at = VALUES(updated_at)`,
                        [
                            address._id.toString(),
                            address.userId.toString(),
                            address.firstName,
                            address.lastName,
                            address.email,
                            address.street,
                            address.city,
                            address.state,
                            address.country,
                            address.zipcode,
                            address.phone,
                            address.createdAt || new Date(),
                            address.updatedAt || new Date(),
                        ],
                    );
                    stats.migrated++;
                } catch (error) {
                    this.recordError(stats, `Address ${address._id}`, error);
                }
            }

            console.log(
                `[Migration] Addresses: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Migra la colección orders + order_items (normalización del array items)
    private async migrateOrders(): Promise<MigrationStats> {
        const stats = this.emptyStats('orders');

        try {
            const orders = await this.mongoConnection
                .collection('orders')
                .find({})
                .toArray();
            stats.total = orders.length;
            console.log(`[Migration] Migrating ${stats.total} orders...`);

            for (const order of orders) {
                try {
                    await this.mysqlConnection!.execute(
                        `INSERT INTO orders (
               id, user_id, address_id, amount, status,
               payment_method, is_paid, stripe_session_id, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               status = VALUES(status), is_paid = VALUES(is_paid),
               updated_at = VALUES(updated_at)`,
                        [
                            order._id.toString(),
                            order.userId.toString(),
                            order.address.toString(),
                            order.amount,
                            order.status || 'Pending',
                            order.paymentMethod,
                            order.isPaid ? 1 : 0,
                            order.stripeSessionId || null,
                            order.createdAt || new Date(),
                            order.updatedAt || new Date(),
                        ],
                    );

                    await this.migrateOrderItems(order);
                    stats.migrated++;
                } catch (error) {
                    this.recordError(stats, `Order ${order._id}`, error);
                }
            }

            console.log(
                `[Migration] Orders: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Extracted from migrateOrders to reduce its complexity
    private async migrateOrderItems(order: any): Promise<void> {
        if (!Array.isArray(order.items)) return;

        for (const item of order.items) {
            await this.mysqlConnection!.execute(
                `INSERT INTO order_items (order_id, product_id, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
                [order._id.toString(), item.product.toString(), item.quantity],
            );
        }
    }

    // Migra la colección shelves + shelf_books (normalización del array books)
    private async migrateShelves(): Promise<MigrationStats> {
        const stats = this.emptyStats('shelves');

        try {
            const shelves = await this.mongoConnection
                .collection('shelves')
                .find({})
                .toArray();
            stats.total = shelves.length;
            console.log(`[Migration] Migrating ${stats.total} shelves...`);

            const { branchId, errorMsg } = await this.resolveBranchId();

            for (const shelf of shelves) {
                try {
                    await this.migrateShelfRow(shelf, branchId, errorMsg, stats);
                } catch (error) {
                    this.recordError(stats, `Shelf ${shelf.code}`, error);
                }
            }

            console.log(
                `[Migration] Shelves: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Resolves the MySQL branch id to use for shelf rows.
    private async resolveBranchId(): Promise<{
        branchId: number | null;
        errorMsg: string | null;
    }> {
        // 1. Look for an existing branch
        try {
            const [rows] = await this.mysqlConnection!.execute(
                `SELECT id FROM branches LIMIT 1`,
            );
            const id = (rows as any)[0]?.id ?? null;
            if (id) return { branchId: id, errorMsg: null };
        } catch {
            // table might not exist yet; fall through to creation
        }

        // 2. Try a direct INSERT with known columns
        try {
            const [ins] = await this.mysqlConnection!.execute(
                `INSERT INTO branches (name, code, address, city, country, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
                ['Migrated branch', 'MIGR', 'Migrated address', 'Unknown', 'Colombia', 1],
            );
            const id = (ins as any).insertId ?? null;
            if (id) return { branchId: id, errorMsg: null };
        } catch (directErr) {
            // fall through to introspection
        }

        // 3. Introspect schema and build a generic INSERT
        const { branchId, errorMsg } = await this.createFallbackBranch();
        return { branchId, errorMsg };
    }

    // Uses INFORMATION_SCHEMA to create a branch row without knowing columns a-priori.
    private async createFallbackBranch(): Promise<{
        branchId: number | null;
        errorMsg: string | null;
    }> {
        try {
            const [cols] = await this.mysqlConnection!.execute(
                `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, DATA_TYPE, COLUMN_TYPE, EXTRA
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches'
         ORDER BY ORDINAL_POSITION`,
            );

            const insertCols: string[] = [];
            const insertVals: any[] = [];

            for (const c of cols as any[]) {
                const col: string = c.COLUMN_NAME;
                if (col === 'id' || (c.EXTRA ?? '').includes('auto_increment')) continue;

                insertCols.push(col);
                insertVals.push(this.defaultValueForColumn(col, c));
            }

            if (insertCols.length === 0) {
                return { branchId: null, errorMsg: 'No insertable columns found' };
            }

            const placeholders = insertCols.map(() => '?').join(', ');
            const sql = `INSERT INTO branches (${insertCols.join(',')}) VALUES (${placeholders})`;
            const [ins2] = await this.mysqlConnection!.execute(sql, insertVals);
            return { branchId: (ins2 as any).insertId ?? null, errorMsg: null };
        } catch (err) {
            return { branchId: null, errorMsg: (err as Error).message };
        }
    }

    // Returns a sensible default value for a single column descriptor row.
    private defaultValueForColumn(col: string, meta: any): any {
        if (meta.COLUMN_DEFAULT !== null) return meta.COLUMN_DEFAULT;
        if (meta.IS_NULLABLE === 'YES') return null;

        const lower = col.toLowerCase();
        const dtype: string = meta.DATA_TYPE ?? '';

        if (lower.includes('name')) return 'Migrated branch';
        if (lower.includes('code')) return 'MB';
        if (lower.includes('email')) return 'branch@example.com';
        if (lower.includes('phone')) return '';
        if (/int|bigint/.test(dtype)) return 1;
        if (/decimal|double|float/.test(dtype)) return 0;
        if (/timestamp|datetime/.test(dtype)) return new Date();
        if (dtype === 'enum') {
            const m = (meta.COLUMN_TYPE ?? '').match(/^enum\((.*)\)$/);
            if (m) {
                const opts = m[1]
                    .split(',')
                    .map((s: string) => s.trim().replace(/^'|'$/g, ''));
                return opts[0] ?? null;
            }
        }
        return '';
    }

    // Inserts a single shelf document and its associated books.
    private async migrateShelfRow(
        shelf: any,
        defaultBranchId: number | null,
        branchError: string | null,
        stats: MigrationStats,
    ): Promise<void> {
        const mongoId = shelf._id.toString();
        const branchId =
            shelf.branchId ?? shelf.branch ?? defaultBranchId ?? null;

        if (!branchId) {
            stats.failed++;
            const reason = branchError ? ` Reason: ${branchError}` : '';
            stats.errors.push(
                `Shelf ${shelf.code}: No branch available and automatic creation failed.${reason}`,
            );
            return;
        }

        const validStatuses = ['safe', 'at-risk', 'overloaded'];
        const status = validStatuses.includes(shelf.status) ? shelf.status : 'safe';

        const [result] = await this.mysqlConnection!.execute(
            `INSERT INTO shelves (
         mongo_id, branch_id, code, max_weight_kg, current_weight_kg, current_value,
         location, status, description, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_weight_kg = VALUES(current_weight_kg),
         current_value = VALUES(current_value),
         status = VALUES(status), updated_at = VALUES(updated_at)`,
            [
                mongoId,
                branchId,
                shelf.code,
                shelf.maxWeight || 8,
                shelf.currentWeight || 0,
                shelf.currentValue || 0,
                shelf.location,
                status,
                shelf.description || null,
                shelf.createdAt || new Date(),
                shelf.updatedAt || new Date(),
            ],
        );

        let shelfId: number | null = (result as any).insertId || null;
        if (!shelfId) {
            const [rows] = await this.mysqlConnection!.execute(
                `SELECT id FROM shelves WHERE mongo_id = ?`,
                [mongoId],
            );
            shelfId = (rows as any)[0]?.id ?? null;
        }

        if (shelfId && Array.isArray(shelf.books)) {
            for (const bookId of shelf.books) {
                await this.mysqlConnection!.execute(
                    `INSERT IGNORE INTO shelf_books (shelf_id, product_id) VALUES (?, ?)`,
                    [shelfId, bookId.toString()],
                );
            }
        }

        stats.migrated++;
    }

    // Migra la colección loans
    private async migrateLoans(): Promise<MigrationStats> {
        const stats = this.emptyStats('loans');

        try {
            const loans = await this.mongoConnection
                .collection('loans')
                .find({})
                .toArray();
            stats.total = loans.length;
            console.log(`[Migration] Migrating ${stats.total} loans...`);

            for (const loan of loans) {
                try {
                    await this.mysqlConnection!.execute(
                        `INSERT INTO loans (
               id, user_id, book_id, loan_date, due_date, return_date,
               status, late_fee, notes, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               return_date = VALUES(return_date), status = VALUES(status),
               late_fee = VALUES(late_fee), updated_at = VALUES(updated_at)`,
                        [
                            loan._id.toString(),
                            loan.userId.toString(),
                            loan.bookId.toString(),
                            loan.loanDate,
                            loan.dueDate,
                            loan.returnDate || null,
                            loan.status,
                            loan.lateFee || 0,
                            loan.notes || null,
                            loan.createdAt || new Date(),
                            loan.updatedAt || new Date(),
                        ],
                    );
                    stats.migrated++;
                } catch (error) {
                    this.recordError(stats, `Loan ${loan._id}`, error);
                }
            }

            console.log(
                `[Migration] Loans: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Migra la colección reservations
    private async migrateReservations(): Promise<MigrationStats> {
        const stats = this.emptyStats('reservations');

        try {
            const reservations = await this.mongoConnection
                .collection('reservations')
                .find({})
                .toArray();
            stats.total = reservations.length;
            console.log(`[Migration] Migrating ${stats.total} reservations...`);

            for (const reservation of reservations) {
                try {
                    await this.mysqlConnection!.execute(
                        `INSERT INTO reservations (
               id, user_id, book_id, request_date, status, priority,
               notified_at, fulfilled_at, expires_at, notes, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               status = VALUES(status), priority = VALUES(priority),
               notified_at = VALUES(notified_at), fulfilled_at = VALUES(fulfilled_at),
               updated_at = VALUES(updated_at)`,
                        [
                            reservation._id.toString(),
                            reservation.userId.toString(),
                            reservation.bookId.toString(),
                            reservation.requestDate || reservation.createdAt,
                            reservation.status,
                            reservation.priority,
                            reservation.notifiedAt || null,
                            reservation.fulfilledAt || null,
                            reservation.expiresAt,
                            reservation.notes || null,
                            reservation.createdAt || new Date(),
                            reservation.updatedAt || new Date(),
                        ],
                    );
                    stats.migrated++;
                } catch (error) {
                    this.recordError(stats, `Reservation ${reservation._id}`, error);
                }
            }

            console.log(
                `[Migration] Reservations: ${stats.migrated}/${stats.total} migrated`,
            );
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
        }

        return stats;
    }

    // Recalcula multas para préstamos vencidos
    private async recalculateFines(): Promise<void> {
        try {
            console.log('[Migration] Recalculating fines for overdue loans...');
            await this.mysqlConnection!.execute(`
        INSERT INTO fines (loan_id, amount, status, created_at, updated_at)
        SELECT
          l.id,
          GREATEST(0, DATEDIFF(COALESCE(l.return_date, CURDATE()), l.due_date) * 0.50) AS amount,
          'pending',
          NOW(),
          NOW()
        FROM loans l
        WHERE l.status IN ('overdue', 'returned')
          AND (l.return_date IS NULL OR l.return_date > l.due_date)
          AND NOT EXISTS (SELECT 1 FROM fines f WHERE f.loan_id = l.id)
      `);
            console.log('[Migration] Fines recalculated successfully');
        } catch (error) {
            console.error('[Migration] Error recalculating fines:', error);
        }
    }

    // PRIVATE UTILITIES
    // Upserts a named entity (author / publisher / category) and returns its id.
    private async upsertNamedEntity(
        table: string,
        name: string | undefined,
        cache: Map<string, number>,
    ): Promise<number | null> {
        if (!name) return null;
        if (cache.has(name)) return cache.get(name)!;

        const [result] = await this.mysqlConnection!.execute(
            `INSERT INTO ${table} (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
            [name],
        );
        const id = (result as any).insertId as number;
        if (id) cache.set(name, id);
        return id || null;
    }

    // Creates an empty MigrationStats object for a collection name. 
    private emptyStats(collection: string): MigrationStats {
        return { collection, total: 0, migrated: 0, failed: 0, errors: [] };
    }

    // Records a failure entry in stats without throwing. 
    private recordError(stats: MigrationStats, label: string, error: any): void {
        stats.failed++;
        stats.errors.push(`${label}: ${error.message}`);
    }

    private async closeMySQL(): Promise<void> {
        if (this.mysqlConnection) {
            await this.mysqlConnection.end();
            this.mysqlConnection = null;
            console.log('[Migration] MySQL connection closed');
        }
    }
}