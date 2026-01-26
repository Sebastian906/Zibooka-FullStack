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
    async findDangerousCombinations(shelfId: string, analyzeAll: boolean = false): Promise<{
        combinations: Array<{
            books: any[];
            totalWeight: number;
            shelfCode: string;
            category?: string;
        }>;
        count: number;
        groupedByCategory?: Record<string, number>;
    }> {
        try {
            const shelf = await this.shelfModel
                .findById(shelfId)
                .populate('books')
                .exec();

            if (!shelf) {
                throw new NotFoundException('Shelf not found');
            }

            const RISK_THRESHOLD = 8; // Kg
            let booksToAnalyze: Product[];
            let dangerousCombinations: Array<{
                books: any[];
                totalWeight: number;
                shelfCode: string;
                category?: string;
            }> = [];

            if (analyzeAll) {
                // MODO NUEVO: Analizar TODOS los libros del sistema
                const allBooks = await this.productModel
                    .find({ pageCount: { $exists: true, $ne: null } })
                    .exec();

                console.log(`[ShelfService] Analyzing ALL books in system: ${allBooks.length} books`);

                // Agrupar por categoría para reducir complejidad
                const booksByCategory = allBooks.reduce((acc, book) => {
                    if (!acc[book.category]) {
                        acc[book.category] = [];
                    }
                    acc[book.category].push(book);
                    return acc;
                }, {} as Record<string, Product[]>);

                // Analizar cada categoría por separado
                Object.entries(booksByCategory).forEach(([category, books]) => {
                    if (books.length < 4) return; // Necesitamos al menos 4 libros

                    const categoryCombinations = this.findCombinationsInArray(
                        books,
                        RISK_THRESHOLD,
                        shelf.code,
                        category
                    );

                    dangerousCombinations.push(...categoryCombinations);
                });

                // Agrupar resultados por categoría
                const groupedByCategory = dangerousCombinations.reduce((acc, combo) => {
                    if (combo.category) {
                        acc[combo.category] = (acc[combo.category] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);

                return {
                    combinations: dangerousCombinations,
                    count: dangerousCombinations.length,
                    groupedByCategory,
                };

            } else {
                // MODO ORIGINAL: Solo libros del estante
                booksToAnalyze = shelf.books as unknown as Product[];

                if (booksToAnalyze.length < 4) {
                    console.log(`[ShelfService] Shelf ${shelf.code} has only ${booksToAnalyze.length} books. Need at least 4.`);
                    return {
                        combinations: [],
                        count: 0,
                    };
                }

                console.log(`[ShelfService] Analyzing shelf ${shelf.code}: ${booksToAnalyze.length} books`);

                dangerousCombinations = this.findCombinationsInArray(
                    booksToAnalyze,
                    RISK_THRESHOLD,
                    shelf.code
                );
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
     * Función auxiliar para encontrar combinaciones en un array de libros
     */
    private findCombinationsInArray(
        books: Product[],
        threshold: number,
        shelfCode: string,
        category?: string
    ): Array<{
        books: any[];
        totalWeight: number;
        shelfCode: string;
        category?: string;
    }> {
        const combinations: Array<{
            books: any[];
            totalWeight: number;
            shelfCode: string;
            category?: string;
        }> = [];
        const n = books.length;

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
                        if (totalWeight > threshold) {
                            combinations.push({
                                books: combo.map(b => ({
                                    _id: (b as any)._id,
                                    name: b.name,
                                    category: b.category,
                                    pageCount: b.pageCount,
                                    weight: ((b.pageCount || 0) * 0.005).toFixed(2),
                                })),
                                totalWeight: parseFloat(totalWeight.toFixed(2)),
                                shelfCode,
                                category,
                            });
                        }
                    }
                }
            }
        }

        return combinations;
    }

    /**
     * BACKTRACKING: Encuentra la combinación óptima (máximo valor sin exceder peso)
     * Problema de la Mochila (Knapsack Problem)
     */
    async optimizeShelf(shelfId: string, analyzeAll: boolean = false): Promise<{
        bestCombination: {
            books: any[];
            totalWeight: number;
            totalValue: number;
        };
        maxWeight: number;
        recommendation?: string;
        currentVsOptimal?: {
            current: { weight: number; value: number; books: number };
            optimal: { weight: number; value: number; books: number };
            improvement: string;
        };
    }> {
        try {
            const shelf = await this.shelfModel
                .findById(shelfId)
                .populate('books')
                .exec();

            if (!shelf) {
                throw new NotFoundException('Shelf not found');
            }

            const maxWeight = shelf.maxWeight;
            let booksToAnalyze: Product[];

            if (analyzeAll) {
                // Analizar todos los libros disponibles (no asignados)
                booksToAnalyze = await this.productModel
                    .find({
                        pageCount: { $exists: true, $ne: null },
                        $or: [
                            { shelfLocation: null },
                            { shelfLocation: { $exists: false } }
                        ]
                    })
                    .exec();

                console.log(`[ShelfService] Optimizing from ALL available books: ${booksToAnalyze.length} books`);
            } else {
                // Solo libros del estante
                booksToAnalyze = shelf.books as unknown as Product[];

                if (booksToAnalyze.length === 0) {
                    throw new BadRequestException('Shelf has no books to optimize');
                }

                console.log(`[ShelfService] Optimizing shelf ${shelf.code}: ${booksToAnalyze.length} books`);
            }

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
                if (index >= booksToAnalyze.length) {
                    return;
                }

                // Calcular peso del libro actual
                const book = booksToAnalyze[index];
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

            // Generar recomendación
            let recommendation = '';
            let currentVsOptimal;

            if (!analyzeAll && shelf.books.length > 0) {
                // Comparar estado actual vs óptimo
                const currentWeight = shelf.currentWeight || 0;
                const currentValue = shelf.currentValue || 0;
                const improvement = ((bestValue - currentValue) / currentValue * 100).toFixed(1);

                currentVsOptimal = {
                    current: {
                        weight: parseFloat(currentWeight.toFixed(2)),
                        value: currentValue,
                        books: shelf.books.length
                    },
                    optimal: {
                        weight: parseFloat(bestWeight.toFixed(2)),
                        value: bestValue,
                        books: bestCombination.length
                    },
                    improvement: `${improvement}%`
                };

                if (bestValue > currentValue) {
                    recommendation = `Consider reorganizing: You could increase value by ${improvement}% by adjusting book selection.`;
                } else {
                    recommendation = 'Current selection is already optimal!';
                }
            } else if (analyzeAll) {
                recommendation = `Recommended ${bestCombination.length} books from available inventory to maximize shelf value.`;
            }

            return {
                bestCombination: {
                    books: bestCombination.map(b => ({
                        _id: (b as any)._id,
                        name: b.name,
                        category: b.category,
                        pageCount: b.pageCount,
                        offerPrice: b.offerPrice,
                        weight: ((b.pageCount || 0) * 0.005).toFixed(2),
                    })),
                    totalWeight: parseFloat(bestWeight.toFixed(2)),
                    totalValue: bestValue,
                },
                maxWeight,
                recommendation,
                currentVsOptimal,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
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