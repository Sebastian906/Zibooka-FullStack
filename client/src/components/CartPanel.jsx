import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ShopContext } from '../context/ShopContext';
import { useContext } from 'react';
import { IoBulbOutline } from "react-icons/io5";

const CartPanel = () => {
    const { t } = useTranslation();
    const { cartItems, axios } = useContext(ShopContext);
    const [optimization, setOptimization] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const [lastItemCount, setLastItemCount] = useState(0);

    const CACHE_DURATION_MS = 30000; // 30 segundos de caché

    const loadOptimization = useCallback(async (forceRefresh = false) => {
        const itemCount = Object.keys(cartItems).length;

        if (itemCount === 0) {
            setOptimization(null);
            return;
        }

        // Cache: no refetch si no ha pasado el tiempo o el conteo no cambió
        const now = Date.now();
        if (
            !forceRefresh &&
            optimization &&
            now - lastFetchTime < CACHE_DURATION_MS &&
            itemCount === lastItemCount
        ) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post('/api/cart/optimize');
            if (data.success) {
                setOptimization(data);
                setLastFetchTime(Date.now());
                setLastItemCount(itemCount);
            }
        } catch (error) {
            // El panel es opcional: silenciar errores
            console.debug('Cart optimization unavailable:', error.message);
            setOptimization(null);
        } finally {
            setLoading(false);
        }
    }, [cartItems, axios, optimization, lastFetchTime, lastItemCount]);

    useEffect(() => {
        loadOptimization();
    }, [Object.keys(cartItems).length]);

    // No renderizar si no hay items o no hay sugerencias
    if (!optimization || optimization.suggestions.length === 0) return null;

    const hasSuggestions = optimization.suggestions.some(s => s.suggestion === 'loan');
    if (!hasSuggestions) return null;

    const labels = {
        title: t('cartOptimization.title', 'Ahorra dinero con préstamos'),
        subtitle: t('cartOptimization.subtitle', 'Algunos libros están disponibles para préstamo'),
        savings: t('cartOptimization.savings', 'Podrías ahorrar'),
        loanOption: t('cartOptimization.loanOption', 'Disponible para préstamo'),
        buyOption: t('cartOptimization.buyOption', 'Comprar'),
        loanFee: t('cartOptimization.loanFee', 'Costo de préstamo'),
        totalIfAllBuy: t('cartOptimization.totalIfAllBuy', 'Total comprando todo'),
        optimizedTotal: t('cartOptimization.optimizedTotal', 'Total con préstamos'),
        acceptButton: t('cartOptimization.acceptButton', 'Aceptar sugerencia'),
        perBook: t('cartOptimization.perBook', 'por libro'),
        note: t('cartOptimization.note', 'Los préstamos están sujetos a disponibilidad'),
        detailsHidden: t('cartOptimization.detailsHidden', 'Ver detalles'),
        detailsShown: t('cartOptimization.detailsShown', 'Ocultar detalles'),
    };

    return (
        <div className="mt-4 mb-4 border border-blue-200 rounded-xl bg-linear-to-r from-blue-50 to-green-50 p-5 shadow-sm">
            {/* Header amigable */}
            <div className="flex items-start gap-3 mb-4">
                <div className="text-3xl"><IoBulbOutline /></div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">
                        {labels.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {labels.subtitle}
                    </p>
                </div>
            </div>

            {/* Badge de ahorro destacado */}
            <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4 text-center">
                <p className="text-sm text-green-700">{labels.savings}</p>
                <p className="text-2xl font-bold text-green-800">
                    ${optimization.estimatedSavings.toFixed(2)}
                </p>
            </div>

            {/* Toggle para ver detalles */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
                {showPanel ? `▲ ${labels.detailsShown}` : `▼ ${labels.detailsHidden}`}
            </button>

            {/* Lista de sugerencias - collapsible */}
            {showPanel && (
                <div className="mt-3 space-y-2">
                    {optimization.suggestions.map((item) => (
                        <div
                            key={item.productId}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${item.suggestion === 'loan'
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'bg-gray-50 border border-gray-200'
                                }`}
                        >
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{item.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    x{item.quantity}
                                </p>
                            </div>

                            <div className="text-right">
                                {item.suggestion === 'loan' ? (
                                    <div>
                                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                            {labels.loanOption}
                                        </span>
                                        <p className="text-xs text-blue-600 mt-1">
                                            ${item.loanFee}/{labels.perBook}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                                            {labels.buyOption}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            ${item.price}/{labels.perBook}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Resumen de costos */}
                    <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>{labels.totalIfAllBuy}</span>
                            <span>${optimization.totalIfAllBuy.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-green-700">
                            <span>{labels.optimizedTotal}</span>
                            <span>${optimization.totalOptimized.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Nota aclaratoria */}
                    <p className="text-xs text-gray-400 mt-3 italic">
                        * {labels.note}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CartPanel;