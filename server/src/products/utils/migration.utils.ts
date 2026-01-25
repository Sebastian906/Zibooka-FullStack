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
 * Asigna autor por defecto según categoría (con variedad)
 */
export function assignDefaultAuthor(category: string): string {
    const authorsByCategory: Record<string, string[]> = {
        'Academic': [
            'Dr. John Smith',
            'Dr. Sarah Mitchell',
            'Prof. Robert Chen',
            'Dr. Emily Watson',
            'Prof. Michael Brown'
        ],
        'Children': [
            'Mary Johnson',
            'Emma Davis',
            'Sophie Williams',
            'Olivia Martinez',
            'Isabella Garcia'
        ],
        'Health': [
            'Dr. Sarah Williams',
            'Dr. James Anderson',
            'Dr. Lisa Taylor',
            'Dr. David Moore',
            'Dr. Jennifer Brown'
        ],
        'Horror': [
            'Stephen Dark',
            'Edgar Nightshade',
            'Mary Shelley Jr.',
            'H.P. Lovecraft II',
            'Anne Shadow'
        ],
        'Business': [
            'Michael Porter',
            'Peter Drucker Jr.',
            'Jim Collins',
            'Tom Peters',
            'Clayton Christensen'
        ],
        'History': [
            'David McCullough',
            'Doris Kearns Goodwin',
            'Ron Chernow',
            'Walter Isaacson',
            'Barbara Tuchman'
        ],
        'Adventure': [
            'Jack London',
            'Jules Verne Jr.',
            'Ernest Hemingway II',
            'Mark Twain III',
            'Robert Louis Stevenson'
        ],
    };

    const authors = authorsByCategory[category] || ['Unknown Author'];

    // Seleccionar un autor aleatorio de la lista
    const randomIndex = Math.floor(Math.random() * authors.length);
    return authors[randomIndex];
}

/**
 * Asigna editorial por defecto según categoría (con variedad)
 */
export function assignDefaultPublisher(category: string): string {
    const publishersByCategory: Record<string, string[]> = {
        'Academic': [
            'Academic Press',
            'Oxford University Press',
            'Cambridge University Press',
            'MIT Press',
            'Springer'
        ],
        'Children': [
            'Scholastic',
            'Penguin Random House Kids',
            'HarperCollins Children',
            'Simon & Schuster Kids',
            'Disney Publishing'
        ],
        'Health': [
            'Health Publishing House',
            'Wellness Press',
            'Medical Books Ltd',
            'Healthy Living Publishing',
            'Fitness & Health Press'
        ],
        'Horror': [
            'Dark Tales Publishing',
            'Nightmare Press',
            'Gothic Books Ltd',
            'Horror House Publishing',
            'Shadow & Fear Press'
        ],
        'Business': [
            'Business Insights Press',
            'Harvard Business Review Press',
            'McGraw-Hill Professional',
            'Wiley Business',
            'Portfolio Penguin'
        ],
        'History': [
            'Historical Books Ltd',
            'History Press',
            'Chronicle Books',
            'Vintage History',
            'Oxford Historical Press'
        ],
        'Adventure': [
            'Adventure Reads',
            'Explorer Publishing',
            'Wild Books Press',
            'Journey Publishing House',
            'Outdoor Adventures Press'
        ],
    };

    const publishers = publishersByCategory[category] || ['Zibooka Editorial'];
    const randomIndex = Math.floor(Math.random() * publishers.length);
    return publishers[randomIndex];
}

/**
 * Genera año de publicación aleatorio basado en categoría
 */
export function generatePublicationYear(category?: string): number {
    const currentYear = new Date().getFullYear();

    // Categorías con libros más antiguos
    const vintageCategories = ['History', 'Adventure'];

    if (category && vintageCategories.includes(category)) {
        // Para historia y aventura: entre 1950 y año actual
        const minYear = 1950;
        const yearRange = currentYear - minYear;
        return minYear + Math.floor(Math.random() * yearRange);
    }

    // Para otras categorías: últimos 20 años
    const randomYears = Math.floor(Math.random() * 20);
    return currentYear - randomYears;
}