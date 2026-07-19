import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TranslationFields {
    name?: string;
    description?: string;
    category?: string;
}

// Simple in-memory cache with TTL
class TranslationCache {
    private cache = new Map<string, { value: string; expiresAt: number }>();
    private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

    get(key: string): string | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    set(key: string, value: string, ttlMs?: number): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs || this.defaultTTL),
        });
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }
}

@Injectable()
export class TranslationService {
    private readonly logger = new Logger(TranslationService.name);
    private readonly provider: string;
    private readonly apiKey: string;
    private readonly apiUrl: string;
    private readonly cache = new TranslationCache();
    private lastCallTime = 0;
    private readonly minIntervalMs = 500; // Rate limit: max 10 calls/sec

    constructor(private configService: ConfigService) {
        this.provider = this.configService.get<string>('TRANSLATION_PROVIDER', 'libre');
        this.apiKey = this.configService.get<string>('TRANSLATION_API_KEY', '');
        this.apiUrl = this.configService.get<string>(
            'TRANSLATION_API_URL',
            'http://localhost:5000',
        );

        this.logger.log(`TranslationService initialized with provider: ${this.provider}`);
    }

    /**
     * Translate a single text string between languages
     */
    async translateText(text: string, from: string, to: string): Promise<string> {
        if (!text || text.trim().length === 0) return text;
        if (from === to) return text;

        // Check cache
        const cacheKey = `${from}:${to}:${text}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for translation: "${text.substring(0, 30)}..."`);
            return cached;
        }

        // Rate limiting
        await this.enforceRateLimit();

        let translated: string;

        switch (this.provider) {
            case 'google':
                translated = await this.translateWithGoogle(text, from, to);
                break;
            case 'gemini':
                translated = await this.translateWithGemini(text, from, to);
                break;
            case 'deepl':
                translated = await this.translateWithDeepL(text, from, to);
                break;
            case 'libre':
            default:
                translated = await this.translateWithLibre(text, from, to);
                break;
        }

        // Store in cache
        this.cache.set(cacheKey, translated);

        return translated;
    }

    /**
     * Translate product fields (name, description, category)
     */
    async translateProduct(
        product: TranslationFields,
        from: string,
        to: string,
    ): Promise<TranslationFields> {
        const results: TranslationFields = {};

        if (product.name) {
            results.name = await this.translateText(product.name, from, to);
        }

        if (product.description) {
            // Translate description in chunks if too long (API limit ~5000 chars)
            results.description = await this.translateLongText(product.description, from, to);
        }

        if (product.category) {
            results.category = await this.translateText(product.category, from, to);
        }

        return results;
    }

    /**
     * Translate long text by splitting into chunks
     */
    private async translateLongText(text: string, from: string, to: string): Promise<string> {
        const maxChunkSize = 4500; // Safe limit under 5000

        if (text.length <= maxChunkSize) {
            return this.translateText(text, from, to);
        }

        // Split by paragraphs first, then by sentences if needed
        const chunks = this.splitTextIntoChunks(text, maxChunkSize);
        const translatedChunks: string[] = [];

        for (const chunk of chunks) {
            const translated = await this.translateText(chunk, from, to);
            translatedChunks.push(translated);
        }

        return translatedChunks.join('\n');
    }

    /**
     * Split text into chunks respecting sentence boundaries
     */
    private splitTextIntoChunks(text: string, maxLen: number): string[] {
        const chunks: string[] = [];
        let remaining = text;

        while (remaining.length > 0) {
            if (remaining.length <= maxLen) {
                chunks.push(remaining);
                break;
            }

            // Try to split at a sentence boundary
            let splitIndex = remaining.lastIndexOf('. ', maxLen);
            if (splitIndex < maxLen * 0.3) {
                // No good sentence boundary, split at space
                splitIndex = remaining.lastIndexOf(' ', maxLen);
            }
            if (splitIndex < maxLen * 0.3) {
                // No space found, force split
                splitIndex = maxLen;
            } else {
                splitIndex += 1; // Include the period/space
            }

            chunks.push(remaining.substring(0, splitIndex));
            remaining = remaining.substring(splitIndex).trimStart();
        }

        return chunks;
    }

    /**
     * Rate limiting: enforce minimum interval between API calls
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastCallTime;
        if (elapsed < this.minIntervalMs) {
            await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - elapsed));
        }
        this.lastCallTime = Date.now();
    }

    // === PROVIDER IMPLEMENTATIONS ===

    /**
     * LibreTranslate (self-hosted, free)
     */
    private async translateWithLibre(text: string, from: string, to: string): Promise<string> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.apiUrl}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: from,
                    target: to,
                    format: 'text',
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`LibreTranslate returned ${response.status}`);
            }

            const data = await response.json();
            return data.translatedText || text;
        } catch (error: any) {
            this.logger.warn(`LibreTranslate failed, returning original text: ${error.message}`);
            return text; // Fallback to original
        }
    }

    /**
     * Google Cloud Translation API (v2)
     */
    private async translateWithGoogle(text: string, from: string, to: string): Promise<string> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: from,
                    target: to,
                    format: 'text',
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Google Translate returned ${response.status}`);
            }

            const data = await response.json();
            return data.data.translations[0].translatedText || text;
        } catch (error: any) {
            this.logger.warn(`Google Translate failed, returning original text: ${error.message}`);
            return text;
        }
    }

    /**
     * Google Gemini API (via AI Studio) — free tier
     */
    private async translateWithGemini(text: string, from: string, to: string): Promise<string> {
        try {
            const langNames: Record<string, string> = {
                en: 'English',
                es: 'Spanish',
            };

            const sourceLang = langNames[from] || from;
            const targetLang = langNames[to] || to;

            const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text, nothing else. Do not add quotes, explanations, or any extra text.\n\nText to translate:\n${text}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 2048,
                        },
                    }),
                    signal: controller.signal,
                },
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Gemini API returned ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (!translated) {
                throw new Error('Gemini returned empty translation');
            }

            return translated;
        } catch (error: any) {
            this.logger.warn(`Gemini translation failed, returning original text: ${error.message}`);
            return text;
        }
    }

    /**
     * DeepL API
     */
    private async translateWithDeepL(text: string, from: string, to: string): Promise<string> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // DeepL uses 'EN-US' or 'EN-GB' for English
            const deeplFrom = from === 'en' ? 'EN' : from.toUpperCase();
            const deeplTo = to === 'en' ? 'EN-US' : to.toUpperCase();

            const baseUrl = this.apiKey.endsWith(':fx')
                ? 'https://api-free.deepl.com/v2/translate'
                : 'https://api.deepl.com/v2/translate';

            const params = new URLSearchParams();
            params.append('auth_key', this.apiKey);
            params.append('text', text);
            params.append('source_lang', deeplFrom);
            params.append('target_lang', deeplTo);

            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`DeepL returned ${response.status}`);
            }

            const data = await response.json();
            return data.translations[0].text || text;
        } catch (error: any) {
            this.logger.warn(`DeepL failed, returning original text: ${error.message}`);
            return text;
        }
    }
}