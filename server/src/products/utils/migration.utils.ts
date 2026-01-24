/**
 * Genera un ISBN-13 válido (formato: 978-X-XXXX-XXXXX-X)
 */
export function generateISBN(): string {
    const prefix = '978'; // Prefijo estándar para libros
    const group = Math.floor(Math.random() * 10); // Grupo (0-9)
    const publisher = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
    const title = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, '0');

    // Calcular dígito verificador (simplificado para demo)
    const digits = `${prefix}${group}${publisher}${title}`;
    const checkDigit = calculateISBNCheckDigit(digits);

    return `${prefix}-${group}-${publisher}-${title}-${checkDigit}`;
}

/**
 * Calcula el dígito verificador de ISBN-13
 */
function calculateISBNCheckDigit(digits: string): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(digits[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Estima número de páginas según categoría
 */
export function estimatePageCount(category: string): number {
    const pageRanges: Record<string, [number, number]> = {
        'Academic': [300, 600],
        'Children': [50, 150],
        'Health': [200, 2000],
        'Horror': [250, 1500],
        'Business': [250, 1450],
        'History': [350, 3000],
        'Adventure': [200, 800],
    };

    const [min, max] = pageRanges[category] || [200, 400];
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Asigna autor por defecto según categoría
 */
export function assignDefaultAuthor(category: string): string {
    const defaultAuthors: Record<string, string> = {
        'Academic': 'Dr. John Smith',
        'Children': 'Mary Johnson',
        'Health': 'Dr. Sarah Williams',
        'Horror': 'Stephen Dark',
        'Business': 'Michael Porter',
        'History': 'David McCullough',
        'Adventure': 'Jack London',
    };

    return defaultAuthors[category] || 'Unknown Author';
}

/**
 * Asigna editorial por defecto según categoría
 */
export function assignDefaultPublisher(category: string): string {
    const publishers: Record<string, string> = {
        'Academic': 'Academic Press',
        'Children': 'Scholastic',
        'Health': 'Health Publishing House',
        'Horror': 'Dark Tales Publishing',
        'Business': 'Business Insights Press',
        'History': 'Historical Books Ltd',
        'Adventure': 'Adventure Reads',
    };

    return publishers[category] || 'Zibooka Editorial';
}

/**
 * Genera año de publicación aleatorio (últimos 10 años)
 */
export function generatePublicationYear(): number {
    const currentYear = new Date().getFullYear();
    const randomYears = Math.floor(Math.random() * 10); // 0-9 años atrás
    return currentYear - randomYears;
}