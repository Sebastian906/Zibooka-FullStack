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

    /**
     * Ejecuta la migración completa de MongoDB a MySQL
     */
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
            if (this.mysqlConnection) {
                await this.mysqlConnection.end();
                console.log('[Migration] MySQL connection closed');
            }
        }
    }

    /**
     * Migra la colección users
     */
    private async migrateUsers(): Promise<MigrationStats> {
        const collectionName = 'users';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const users = await this.mongoConnection.collection(collectionName).find({}).toArray();
            stats.total = users.length;

            console.log(`[Migration] Migrating ${stats.total} users...`);

            for (const user of users) {
                try {
                    await this.mysqlConnection!.execute(
                        `INSERT INTO users (id, name, email, password, phone, profile_image, cart_data, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                         name = VALUES(name),
                         phone = VALUES(phone),
                         profile_image = VALUES(profile_image),
                         cart_data = VALUES(cart_data),
                         updated_at = VALUES(updated_at)`,
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
                        ]
                    );
                    stats.migrated++;
                } catch (error) {
                    stats.failed++;
                    stats.errors.push(`User ${user.email}: ${error.message}`);
                }
            }

            console.log(`[Migration] Users: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra la colección products (con normalización de autores, editoriales, categorías)
     */
    private async migrateProducts(): Promise<MigrationStats> {
        const collectionName = 'products';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const products = await this.mongoConnection.collection(collectionName).find({}).toArray();
            stats.total = products.length;

            console.log(`[Migration] Migrating ${stats.total} products...`);

            // Mapas para almacenar IDs de autores, editoriales y categorías
            const authorMap = new Map<string, number>();
            const publisherMap = new Map<string, number>();
            const categoryMap = new Map<string, number>();

            for (const product of products) {
                try {
                    // 1. Obtener o crear autor
                    let authorId: number | null = null;
                    if (product.author) {
                        if (!authorMap.has(product.author)) {
                            const [authorResult] = await this.mysqlConnection!.execute(
                                `INSERT INTO authors (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
                                [product.author]
                            );
                            authorId = (authorResult as any).insertId;
                            if (authorId) {
                                authorMap.set(product.author, authorId);
                            }
                        } else {
                            authorId = authorMap.get(product.author)!;
                        }
                    }

                    // 2. Obtener o crear editorial
                    let publisherId: number | null = null;
                    if (product.publisher) {
                        if (!publisherMap.has(product.publisher)) {
                            const [publisherResult] = await this.mysqlConnection!.execute(
                                `INSERT INTO publishers (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
                                [product.publisher]
                            );
                            publisherId = (publisherResult as any).insertId;
                            if (publisherId) {
                                publisherMap.set(product.publisher, publisherId);
                            }
                        } else {
                            publisherId = publisherMap.get(product.publisher)!;
                        }
                    }

                    // 3. Obtener o crear categoría
                    let categoryId: number | null = null;
                    if (product.category) {
                        if (!categoryMap.has(product.category)) {
                            const [categoryResult] = await this.mysqlConnection!.execute(
                                `INSERT INTO categories (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
                                [product.category]
                            );
                            categoryId = (categoryResult as any).insertId;
                            if (categoryId) {
                                categoryMap.set(product.category, categoryId);
                            }
                        } else {
                            categoryId = categoryMap.get(product.category)!;
                        }
                    }

                    // 4. Insertar producto
                    await this.mysqlConnection!.execute(
                        `INSERT INTO products (
                            id, isbn, name, description, author_id, publisher_id, 
                            category_id, price, offer_price, page_count, publication_year,
                            popular, in_stock, shelf_location, created_at, updated_at
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                         name = VALUES(name),
                         description = VALUES(description),
                         price = VALUES(price),
                         offer_price = VALUES(offer_price),
                         in_stock = VALUES(in_stock),
                         updated_at = VALUES(updated_at)`,
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
                            product.shelfLocation ? product.shelfLocation.toString() : null,
                            product.createdAt || new Date(),
                            product.updatedAt || new Date(),
                        ]
                    );

                    stats.migrated++;
                } catch (error) {
                    stats.failed++;
                    stats.errors.push(`Product ${product.name}: ${error.message}`);
                }
            }

            console.log(`[Migration] Products: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra las imágenes de productos (array → filas)
     */
    private async migrateProductImages(): Promise<MigrationStats> {
        const collectionName = 'product_images';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const products = await this.mongoConnection.collection('products').find({}).toArray();

            console.log(`[Migration] Migrating product images...`);

            for (const product of products) {
                if (product.images && Array.isArray(product.images)) {
                    for (let i = 0; i < product.images.length; i++) {
                        try {
                            stats.total++;
                            await this.mysqlConnection!.execute(
                                `INSERT INTO product_images (product_id, image_url, display_order)
                                 VALUES (?, ?, ?)
                                 ON DUPLICATE KEY UPDATE image_url = VALUES(image_url)`,
                                [product._id.toString(), product.images[i], i + 1]
                            );
                            stats.migrated++;
                        } catch (error) {
                            stats.failed++;
                            stats.errors.push(`Image ${product._id}: ${error.message}`);
                        }
                    }
                }
            }

            console.log(`[Migration] Product images: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra las traducciones de productos (object → filas)
     */
    private async migrateProductTranslations(): Promise<MigrationStats> {
        const collectionName = 'product_translations';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const products = await this.mongoConnection.collection('products').find({}).toArray();

            console.log(`[Migration] Migrating product translations...`);

            for (const product of products) {
                if (product.translations && typeof product.translations === 'object') {
                    for (const [lang, translation] of Object.entries(product.translations as Record<string, any>)) {
                        try {
                            stats.total++;
                            await this.mysqlConnection!.execute(
                                `INSERT INTO product_translations (product_id, language_code, name, description, category)
                                 VALUES (?, ?, ?, ?, ?)
                                 ON DUPLICATE KEY UPDATE
                                 name = VALUES(name),
                                 description = VALUES(description),
                                 category = VALUES(category)`,
                                [
                                    product._id.toString(),
                                    lang,
                                    translation.name || null,
                                    translation.description || null,
                                    translation.category || null,
                                ]
                            );
                            stats.migrated++;
                        } catch (error) {
                            stats.failed++;
                            stats.errors.push(`Translation ${product._id}-${lang}: ${error.message}`);
                        }
                    }
                }
            }

            console.log(`[Migration] Translations: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra la colección addresses
     */
    private async migrateAddresses(): Promise<MigrationStats> {
        const collectionName = 'addresses';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const addresses = await this.mongoConnection.collection(collectionName).find({}).toArray();
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
                         first_name = VALUES(first_name),
                         last_name = VALUES(last_name),
                         street = VALUES(street),
                         city = VALUES(city),
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
                        ]
                    );
                    stats.migrated++;
                } catch (error) {
                    stats.failed++;
                    stats.errors.push(`Address ${address._id}: ${error.message}`);
                }
            }

            console.log(`[Migration] Addresses: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra la colección orders + order_items (normalización del array items)
     */
    private async migrateOrders(): Promise<MigrationStats> {
        const collectionName = 'orders';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const orders = await this.mongoConnection.collection(collectionName).find({}).toArray();
            stats.total = orders.length;

            console.log(`[Migration] Migrating ${stats.total} orders...`);

            for (const order of orders) {
                try {
                    // Insertar orden
                    await this.mysqlConnection!.execute(
                        `INSERT INTO orders (
                            id, user_id, address_id, amount, status, 
                            payment_method, is_paid, stripe_session_id, created_at, updated_at
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                         status = VALUES(status),
                         is_paid = VALUES(is_paid),
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
                        ]
                    );

                    // Insertar items de la orden
                    if (order.items && Array.isArray(order.items)) {
                        for (const item of order.items) {
                            await this.mysqlConnection!.execute(
                                `INSERT INTO order_items (order_id, product_id, quantity)
                                 VALUES (?, ?, ?)
                                 ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
                                [order._id.toString(), item.product.toString(), item.quantity]
                            );
                        }
                    }

                    stats.migrated++;
                } catch (error) {
                    stats.failed++;
                    stats.errors.push(`Order ${order._id}: ${error.message}`);
                }
            }

            console.log(`[Migration] Orders: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra la colección shelves + shelf_books (normalización del array books)
     */
    private async migrateShelves(): Promise<MigrationStats> {
        const collectionName = 'shelves';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const shelves = await this.mongoConnection.collection(collectionName).find({}).toArray();
            stats.total = shelves.length;

            console.log(`[Migration] Migrating ${stats.total} shelves...`);

            // Intentar obtener un branch_id por defecto existente en MySQL
            let defaultBranchId: number | null = null;
            try {
                const [branchRows] = await this.mysqlConnection!.execute(`SELECT id FROM branches LIMIT 1`);
                defaultBranchId = (branchRows as any)[0] ? (branchRows as any)[0].id : null;
            } catch (e) {
                defaultBranchId = null;
            }

            // Si no existe ningún branch, intentar crear uno con INSERT dirigido (campos obligatorios)
            let branchCreationError: string | null = null;
            if (!defaultBranchId) {
                try {
                    const [ins] = await this.mysqlConnection!.execute(
                        `INSERT INTO branches (name, code, address, city, country, is_active)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        ['Migrated branch', 'MIGR', 'Migrated address', 'Unknown', 'Colombia', 1]
                    );
                    defaultBranchId = (ins as any).insertId || null;
                } catch (e) {
                    // Si falla el INSERT directo, intentar la ruta genérica basada en INFORMATION_SCHEMA
                    try {
                        const [cols] = await this.mysqlConnection!.execute(
                            `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, DATA_TYPE, COLUMN_TYPE, EXTRA
                             FROM INFORMATION_SCHEMA.COLUMNS
                             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches'
                             ORDER BY ORDINAL_POSITION`
                        );

                        const columns = (cols as any) as Array<any>;
                        const insertCols: string[] = [];
                        const insertVals: any[] = [];

                        for (const c of columns) {
                            const col = c.COLUMN_NAME;
                            const isAuto = c.EXTRA && c.EXTRA.includes('auto_increment');
                            if (isAuto) continue;
                            if (col === 'id') continue;

                            if (c.COLUMN_DEFAULT !== null) {
                                insertCols.push(col);
                                insertVals.push(c.COLUMN_DEFAULT);
                                continue;
                            }

                            if (c.IS_NULLABLE === 'YES') {
                                insertCols.push(col);
                                insertVals.push(null);
                                continue;
                            }

                            const lower = col.toLowerCase();
                            let val: any = null;

                            if (lower.includes('name')) val = 'Migrated branch';
                            else if (lower.includes('code')) val = 'MB';
                            else if (lower.includes('email')) val = 'branch@example.com';
                            else if (lower.includes('phone')) val = '';
                            else if (c.DATA_TYPE && (c.DATA_TYPE.includes('int') || c.DATA_TYPE === 'bigint')) val = 1;
                            else if (c.DATA_TYPE && (c.DATA_TYPE === 'decimal' || c.DATA_TYPE === 'double' || c.DATA_TYPE === 'float')) val = 0;
                            else if (c.DATA_TYPE && (c.DATA_TYPE === 'timestamp' || c.DATA_TYPE === 'datetime')) {
                                insertCols.push(col);
                                insertVals.push(new Date());
                                continue;
                            } else if (c.DATA_TYPE === 'enum') {
                                const m = (c.COLUMN_TYPE || '').match(/^enum\((.*)\)$/);
                                if (m) {
                                    const opts = m[1].split(',').map((s: string) => s.trim().replace(/^'/, '').replace(/'$/, ''));
                                    val = opts[0];
                                } else {
                                    val = null;
                                }
                            } else {
                                val = '';
                            }

                            insertCols.push(col);
                            insertVals.push(val);
                        }

                        if (insertCols.length > 0) {
                            const placeholders = insertCols.map(() => '?').join(', ');
                            const sql = `INSERT INTO branches (${insertCols.join(',')}) VALUES (${placeholders})`;
                            const [ins2] = await this.mysqlConnection!.execute(sql, insertVals);
                            defaultBranchId = (ins2 as any).insertId || null;
                        } else {
                            defaultBranchId = null;
                        }
                    } catch (e2) {
                        branchCreationError = (e2 as any).message || String(e2);
                        defaultBranchId = null;
                    }
                    // registrar mensaje del primer error si existe
                    if (!branchCreationError) branchCreationError = (e as any).message || String(e);
                }
            }

            for (const shelf of shelves) {
                try {
                    // Insertar estante
                    // Mapear campos al esquema MySQL real: usamos `mongo_id`, `branch_id`, `max_weight_kg`, `current_weight_kg`
                    const mongoId = shelf._id.toString();
                    // Determinar branchId: prefer campo explícito en Mongo, sino usar el default encontrado
                    const branchIdCandidate = shelf.branchId || shelf.branch || null;
                    const branchId = branchIdCandidate || defaultBranchId;

                    // Si no hay branchId válido, registrar error y continuar
                    if (!branchId) {
                        stats.failed++;
                        const reason = typeof branchCreationError !== 'undefined' && branchCreationError ? ` Reason: ${branchCreationError}` : '';
                        stats.errors.push(`Shelf ${shelf.code}: No branch available in MySQL and automatic creation failed.${reason}`);
                        continue;
                    }

                    const [result] = await this.mysqlConnection!.execute(
                        `INSERT INTO shelves (
                            mongo_id, branch_id, code, max_weight_kg, current_weight_kg, current_value,
                            location, status, description, created_at, updated_at
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                         current_weight_kg = VALUES(current_weight_kg),
                         current_value = VALUES(current_value),
                         status = VALUES(status),
                         updated_at = VALUES(updated_at)`,
                        [
                            mongoId,
                            branchId,
                            shelf.code,
                            shelf.maxWeight || 8,
                            shelf.currentWeight || 0,
                            shelf.currentValue || 0,
                            shelf.location,
                            // Normalizar status a los valores permitidos en la tabla MySQL
                            ['safe', 'at-risk', 'overloaded'].includes(shelf.status) ? shelf.status : 'safe',
                            shelf.description || null,
                            shelf.createdAt || new Date(),
                            shelf.updatedAt || new Date(),
                        ]
                    );

                    // Obtener el id MySQL del estante (insertId si fue insertado, sino buscar por mongo_id)
                    let shelfId: number | null = (result as any).insertId || null;
                    if (!shelfId) {
                        const [rows] = await this.mysqlConnection!.execute(`SELECT id FROM shelves WHERE mongo_id = ?`, [mongoId]);
                        shelfId = (rows as any)[0] ? (rows as any)[0].id : null;
                    }

                    // Insertar libros del estante usando el id MySQL (shelf_id)
                    if (shelfId && shelf.books && Array.isArray(shelf.books)) {
                        for (const bookId of shelf.books) {
                            await this.mysqlConnection!.execute(
                                `INSERT IGNORE INTO shelf_books (shelf_id, product_id)
                                 VALUES (?, ?)`,
                                [shelfId, bookId.toString()]
                            );
                        }
                    }

                    stats.migrated++;
                } catch (error) {
                    stats.failed++;
                    stats.errors.push(`Shelf ${shelf.code}: ${error.message}`);
                }
            }

            console.log(`[Migration] Shelves: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra la colección loans
     */
    private async migrateLoans(): Promise<MigrationStats> {
        const collectionName = 'loans';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const loans = await this.mongoConnection.collection(collectionName).find({}).toArray();
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
                         return_date = VALUES(return_date),
                         status = VALUES(status),
                         late_fee = VALUES(late_fee),
                         updated_at = VALUES(updated_at)`,
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
                        ]
                    );
                    stats.migrated++;
                } catch (error) {
                    stats.failed++;
                    stats.errors.push(`Loan ${loan._id}: ${error.message}`);
                }
            }

            console.log(`[Migration] Loans: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Migra la colección reservations
     */
    private async migrateReservations(): Promise<MigrationStats> {
        const collectionName = 'reservations';
        const stats: MigrationStats = {
            collection: collectionName,
            total: 0,
            migrated: 0,
            failed: 0,
            errors: [],
        };

        try {
            const reservations = await this.mongoConnection.collection(collectionName).find({}).toArray();
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
                         status = VALUES(status),
                         priority = VALUES(priority),
                         notified_at = VALUES(notified_at),
                         fulfilled_at = VALUES(fulfilled_at),
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
                        ]
                    );
                    stats.migrated++;
                } catch (error) {
                    stats.failed++;
                    stats.errors.push(`Reservation ${reservation._id}: ${error.message}`);
                }
            }

            console.log(`[Migration] Reservations: ${stats.migrated}/${stats.total} migrated`);
            return stats;
        } catch (error) {
            stats.errors.push(`Collection error: ${error.message}`);
            return stats;
        }
    }

    /**
     * Recalcula multas para préstamos vencidos
     */
    private async recalculateFines(): Promise<void> {
        try {
            console.log('[Migration] Recalculating fines for overdue loans...');

            // Ejecutar query que calcula multas ($0.50 por día de retraso)
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

    /**
     * Re-migra SOLO la colección shelves (útil para correcciones)
     */
    async remigrateShelves(): Promise<{
        success: boolean;
        message: string;
        stats: MigrationStats;
    }> {
        try {
            this.mysqlConnection = await getMySQLConnection(this.configService);
            console.log('[Migration] MySQL connection established for shelves re-migration');

            // Limpiar shelves y shelf_books
            console.log('[Migration] Cleaning existing shelves data...');
            await this.mysqlConnection.execute('DELETE FROM shelf_books');
            await this.mysqlConnection.execute('DELETE FROM shelves');
            console.log('[Migration] Shelves data cleaned successfully');

            // Migrar shelves nuevamente
            const stats = await this.migrateShelves();

            await this.mysqlConnection.end();
            console.log('[Migration] MySQL connection closed');

            return {
                success: true,
                message: 'Shelves re-migrated successfully',
                stats,
            };
        } catch (error) {
            console.error('[Migration] Shelves re-migration error:', error);
            throw new InternalServerErrorException(`Shelves re-migration failed: ${error.message}`);
        }
    }

    /**
     * Verifica el estado de la migración
     */
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
            const mysql: Record<string, number> = {};
            const differences: Record<string, { mongo: number; mysql: number; diff: number }> = {};

            for (const collection of collections) {
                // Contar en MongoDB
                mongo[collection] = await this.mongoConnection.collection(collection).countDocuments();

                // Contar en MySQL
                const [rows] = await this.mysqlConnection!.execute(`SELECT COUNT(*) as count FROM ${collection}`);
                mysql[collection] = (rows as any)[0].count;

                // Calcular diferencia
                differences[collection] = {
                    mongo: mongo[collection],
                    mysql: mysql[collection],
                    diff: mongo[collection] - mysql[collection],
                };
            }

            await this.mysqlConnection.end();

            return { mongo, mysql, differences };
        } catch (error) {
            throw new InternalServerErrorException(`Error checking migration status: ${error.message}`);
        }
    }
}