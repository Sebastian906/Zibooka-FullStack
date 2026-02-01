import { useState, useContext, useEffect } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MdClose, MdTranslate, MdSave } from 'react-icons/md';

const TranslationModal = ({ product, isOpen, onClose, onSave }) => {
    const { axios } = useContext(ShopContext);
    const { t } = useTranslation();
    
    const [translations, setTranslations] = useState({
        es: {
            name: '',
            description: '',
            category: ''
        }
    });
    const [loading, setLoading] = useState(false);
    const [loadingTranslations, setLoadingTranslations] = useState(false);

    // Cargar traducciones existentes cuando se abre el modal
    useEffect(() => {
        if (isOpen && product?._id) {
            loadExistingTranslations();
        }
    }, [isOpen, product]);

    const loadExistingTranslations = async () => {
        try {
            setLoadingTranslations(true);
            const { data } = await axios.get(`/api/product/translations/${product._id}`);
            
            if (data.success && data.translations) {
                setTranslations({
                    es: {
                        name: data.translations.es?.name || '',
                        description: data.translations.es?.description || '',
                        category: data.translations.es?.category || ''
                    }
                });
            }
        } catch (error) {
            console.error('Error loading translations:', error);
        } finally {
            setLoadingTranslations(false);
        }
    };

    const handleChange = (lang, field, value) => {
        setTranslations(prev => ({
            ...prev,
            [lang]: {
                ...prev[lang],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            
            const { data } = await axios.post(
                `/api/product/translation/${product._id}/es`,
                translations.es
            );

            if (data.success) {
                toast.success('Traducción guardada exitosamente');
                onSave && onSave();
                onClose();
            } else {
                toast.error(data.message || 'Error al guardar traducción');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar traducción');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-primary rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <MdTranslate className="text-2xl text-secondary" />
                        <h2 className="text-lg font-semibold">
                            {t('common.edit')} - Traducciones
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <MdClose className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loadingTranslations ? (
                        <div className="text-center py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full mx-auto"></div>
                            <p className="mt-2 text-gray-500">{t('common.loading')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Original (English) */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-medium mb-3 flex items-center gap-2">
                                    <span className="text-lg">🇺🇸</span> Original (English)
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p><strong>Name:</strong> {product?.name}</p>
                                    <p><strong>Category:</strong> {product?.category}</p>
                                    <p><strong>Description:</strong> {product?.description?.substring(0, 150)}...</p>
                                </div>
                            </div>

                            {/* Spanish Translation */}
                            <div className="p-4 border-2 border-secondary/20 rounded-lg">
                                <h3 className="font-medium mb-4 flex items-center gap-2">
                                    <span className="text-lg">🇪🇸</span> Español
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Nombre del Libro
                                        </label>
                                        <input
                                            type="text"
                                            value={translations.es.name}
                                            onChange={(e) => handleChange('es', 'name', e.target.value)}
                                            placeholder={product?.name}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Categoría
                                        </label>
                                        <input
                                            type="text"
                                            value={translations.es.category}
                                            onChange={(e) => handleChange('es', 'category', e.target.value)}
                                            placeholder={product?.category}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Descripción
                                        </label>
                                        <textarea
                                            value={translations.es.description}
                                            onChange={(e) => handleChange('es', 'description', e.target.value)}
                                            placeholder={product?.description}
                                            rows={5}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <MdSave />
                                {t('common.save')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TranslationModal;
