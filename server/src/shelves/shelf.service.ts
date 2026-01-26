import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Shelf, ShelfDocument } from './schemas/shelf.schema';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from 'src/products/schemas/product.schema';
import { CreateShelfDto } from './dtos/create-shelf.dto';

@Injectable()
export class ShelfService {
    constructor(
        @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>
    ) { }

    /**
     * Crear una nueva estantería
     */
    async createShelf(createShelfDto: CreateShelfDto): Promise<Shelf> {
        try {
            const existingShelf = await this.shelfModel.findOne({
                code: createShelfDto.code.toUpperCase()
            });

            if (existingShelf) {
                throw new BadRequestException(`Shelf with code ${createShelfDto.code} already exists`);
            }

            const shelf = await this.shelfModel.create({
                ...createShelfDto,
                code: createShelfDto.code.toUpperCase(),
                maxWeight: createShelfDto.maxWeight || 8,
            });

            console.log(`[ShelfService] Shelf created: ${shelf.code}`);
            return shelf;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Listar todas las estanterías
     */
    async listShelves(): Promise<Shelf[]> {
        try {
            const shelves = await this.shelfModel
                .find()
                .populate('books')
                .sort({ code: 1 })
                .exec();

            return shelves;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Asignar un libro a una estantería
     */
    async assignBook(shelfId: string, bookId: string): Promise<{
        shelf: Shelf;
        message: string;
    }> {
        try {
            const shelf = await this.shelfModel.findById(shelfId);
            if (!shelf) {
                throw new NotFoundException('Shelf not found');
            }

            const book = await this.productModel.findById(bookId);
            if (!book) {
                throw new NotFoundException('Book not found');
            }

            if (!book.pageCount) {
                throw new BadRequestException('Book does not have pageCount (weight estimation)');
            }

            // Calcular peso del libro (estimación: 1 página ≈ 0.005 Kg)
            const bookWeight = (book.pageCount * 0.005);

            // Verificar si el libro ya está en otra estantería
            if (book.shelfLocation) {
                throw new BadRequestException('Book is already assigned to a shelf');
            }

            // Verificar si agregar el libro excede el peso máximo
            const newWeight = shelf.currentWeight + bookWeight;
            if (newWeight > shelf.maxWeight) {
                throw new BadRequestException(
                    `Adding this book would exceed shelf capacity (${newWeight.toFixed(2)} Kg > ${shelf.maxWeight} Kg)`
                );
            }

            // Asignar libro
            shelf.books.push(new Types.ObjectId(bookId));
            shelf.currentWeight = newWeight;
            shelf.currentValue += book.offerPrice;

            // Actualizar status
            if (shelf.currentWeight > shelf.maxWeight * 0.8) {
                shelf.status = 'at-risk';
            } else if (shelf.currentWeight > shelf.maxWeight) {
                shelf.status = 'overloaded';
            } else {
                shelf.status = 'safe';
            }

            await shelf.save();

            // Actualizar libro
            book.shelfLocation = new Types.ObjectId(shelfId);
            await book.save();

            console.log(`[ShelfService] Book ${bookId} assigned to shelf ${shelf.code}`);

            return {
                shelf,
                message: `Book assigned successfully to shelf ${shelf.code}`,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * FUERZA BRUTA: Encuentra todas las combinaciones de 4 libros que superen 8 Kg
     * Complejidad: O(n^4) - Muy ineficiente pero exhaustivo
     */
    async findDangerousCombinations(shelfId: string): Promise<{
        combinations: Array<{
            books: any[];
            totalWeight: number;
            shelfCode: string;
        }>;
        count: number;
    }> {
        try {
            const shelf = await this.shelfModel
                .findById(shelfId)
                .populate('books')
                .exec();

            if (!shelf) {
                throw new NotFoundException('Shelf not found');
            }

            const books = shelf.books as unknown as Product[];
            const dangerousCombinations: Array<{
                books: any[];
                totalWeight: number;
                shelfCode: string;
            }> = [];

            const RISK_THRESHOLD = 8; // Kg
            const n = books.length;

            console.log(`[ShelfService] Starting brute force search for dangerous combinations...`);
            console.log(`[ShelfService] Total books on shelf ${shelf.code}: ${n}`);

            // Fuerza bruta: Probar TODAS las combinaciones de 4 libros
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    for (let k = j + 1; k < n; k++) {
                        for (let l = k + 1; l < n; l++) {
                            const combo = [books[i], books[j], books[k], books[l]];

                            // Calcular peso total
                            const totalWeight = combo.reduce((sum, book) => {
                                const weight = (book.pageCount || 0) * 0.005;
                                return sum + weight;
                            }, 0);

                            // Si supera el umbral, guardar
                            if (totalWeight > RISK_THRESHOLD) {
                                dangerousCombinations.push({
                                    books: combo.map(b => ({
                                        _id: (b as any)._id,
                                        name: b.name,
                                        pageCount: b.pageCount,
                                        weight: ((b.pageCount || 0) * 0.005).toFixed(2),
                                    })),
                                    totalWeight: parseFloat(totalWeight.toFixed(2)),
                                    shelfCode: shelf.code,
                                });
                            }
                        }
                    }
                }
            }

            console.log(`[ShelfService] Brute force completed: ${dangerousCombinations.length} dangerous combinations found`);

            return {
                combinations: dangerousCombinations,
                count: dangerousCombinations.length,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * BACKTRACKING: Encuentra la combinación óptima (máximo valor sin exceder peso)
     * Problema de la Mochila (Knapsack Problem)
     */
    async optimizeShelf(shelfId: string): Promise<{
        bestCombination: {
            books: any[];
            totalWeight: number;
            totalValue: number;
        };
        maxWeight: number;
    }> {
        try {
            const shelf = await this.shelfModel
                .findById(shelfId)
                .populate('books')
                .exec();

            if (!shelf) {
                throw new NotFoundException('Shelf not found');
            }

            const books = shelf.books as unknown as Product[];
            const maxWeight = shelf.maxWeight;

            console.log(`[ShelfService] Starting backtracking optimization for shelf ${shelf.code}...`);
            console.log(`[ShelfService] Max weight: ${maxWeight} Kg, Books available: ${books.length}`);

            let bestValue = 0;
            let bestCombination: Product[] = [];
            let bestWeight = 0;

            // Función recursiva de backtracking
            const backtrack = (
                index: number,
                currentBooks: Product[],
                currentWeight: number,
                currentValue: number
            ) => {
                // Si encontramos una mejor solución
                if (currentValue > bestValue) {
                    bestValue = currentValue;
                    bestCombination = [...currentBooks];
                    bestWeight = currentWeight;
                    console.log(`[Backtracking] New best: Value=${currentValue} COP, Weight=${currentWeight.toFixed(2)} Kg, Books=${currentBooks.length}`);
                }

                // Caso base: llegamos al final de los libros
                if (index >= books.length) {
                    return;
                }

                // Calcular peso del libro actual
                const book = books[index];
                const bookWeight = (book.pageCount || 0) * 0.005;
                const bookValue = book.offerPrice;

                // Opción 1: INCLUIR el libro (si cabe)
                if (currentWeight + bookWeight <= maxWeight) {
                    currentBooks.push(book);
                    backtrack(
                        index + 1,
                        currentBooks,
                        currentWeight + bookWeight,
                        currentValue + bookValue
                    );
                    currentBooks.pop(); // Backtrack
                }

                // Opción 2: NO INCLUIR el libro
                backtrack(index + 1, currentBooks, currentWeight, currentValue);
            };

            // Iniciar backtracking
            backtrack(0, [], 0, 0);

            console.log(`[ShelfService] Backtracking completed: Best value = ${bestValue} COP, Weight = ${bestWeight.toFixed(2)} Kg`);

            return {
                bestCombination: {
                    books: bestCombination.map(b => ({
                        _id: (b as any)._id,
                        name: b.name,
                        pageCount: b.pageCount,
                        offerPrice: b.offerPrice,
                        weight: ((b.pageCount || 0) * 0.005).toFixed(2),
                    })),
                    totalWeight: parseFloat(bestWeight.toFixed(2)),
                    totalValue: bestValue,
                },
                maxWeight,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Eliminar un libro de una estantería
     */
    async removeBook(shelfId: string, bookId: string): Promise<{
        shelf: Shelf;
        message: string;
    }> {
        try {
            const shelf = await this.shelfModel.findById(shelfId);
            if (!shelf) {
                throw new NotFoundException('Shelf not found');
            }

            const book = await this.productModel.findById(bookId);
            if (!book) {
                throw new NotFoundException('Book not found');
            }

            const bookWeight = (book.pageCount || 0) * 0.005;

            // Remover libro
            shelf.books = shelf.books.filter(
                (id) => id.toString() !== bookId
            );
            shelf.currentWeight -= bookWeight;
            shelf.currentValue -= book.offerPrice;

            // Actualizar status
            if (shelf.currentWeight > shelf.maxWeight * 0.8) {
                shelf.status = 'at-risk';
            } else {
                shelf.status = 'safe';
            }

            await shelf.save();

            // Actualizar libro
            book.shelfLocation = null as any;
            await book.save();

            console.log(`[ShelfService] Book ${bookId} removed from shelf ${shelf.code}`);

            return {
                shelf,
                message: `Book removed successfully from shelf ${shelf.code}`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }
}