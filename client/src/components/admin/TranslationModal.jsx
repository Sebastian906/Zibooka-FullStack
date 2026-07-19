import { useState, useContext, useEffect } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MdClose, MdTranslate, MdSave, MdAutoFixHigh } from 'react-icons/md';

const TranslationModal = ({ product, isOpen, onClose, onSave }) => {
    const { axios } = useContext(ShopContext);
    const { t } = useTranslation();

    const [translations, setTranslations] = useState({
        es: { name: '', description: '', category: '' },
        en: { name: '', description: '', category: '' },
    });
    const [activeTab, setActiveTab] = useState('es');
    const [loading, setLoading] = useState(false);
    const [loadingAuto, setLoadingAuto] = useState(false);
    const [loadingTranslations, setLoadingTranslations] = useState(false);

    // Load existing translations when modal opens
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
                        category: data.translations.es?.category || '',
                        translatedAt: data.translations.es?.translatedAt,
                        translatedBy: data.translations.es?.translatedBy,
                    },
                    en: {
                        name: data.translations.en?.name || '',
                        description: data.translations.en?.description || '',
                        category: data.translations.en?.category || '',
                        translatedAt: data.translations.en?.translatedAt,
                        translatedBy: data.translations.en?.translatedBy,
                    },
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
                [field]: value,
            },
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            const { data } = await axios.post(
                `/api/product/translation/${product._id}/${activeTab}`,
                {
                    name: translations[activeTab].name,
                    description: translations[activeTab].description,
                    category: translations[activeTab].category,
                }
            );

            if (data.success) {
                toast.success('Translation saved successfully');
                onSave && onSave();
                onClose();
            } else {
                toast.error(data.message || 'Error saving translation');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving translation');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoTranslate = async () => {
        try {
            setLoadingAuto(true);

            const { data } = await axios.post(
                `/api/product/translate/${product._id}/${activeTab}`
            );

            if (data.success) {
                toast.success(`Product translated to ${activeTab === 'es' ? 'Spanish' : 'English'}`);
                // Reload translations to show the new ones
                await loadExistingTranslations();
                onSave && onSave();
            } else {
                toast.error(data.message || 'Auto-translation failed');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Auto-translation failed');
        } finally {
            setLoadingAuto(false);
        }
    };

    if (!isOpen) return null;

    const otherLang = activeTab === 'es' ? 'en' : 'es';
    const originalLang = 'en'; // Products are originally in English
    const originalData = {
        name: product?.name,
        category: product?.category,
        description: product?.description,
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-primary rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <MdTranslate className="text-2xl text-secondary" />
                        <h2 className="text-lg font-semibold">
                            {t('common.edit')} - {t('productTranslations.title')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <MdClose className="text-xl" />
                    </button>
                </div>

                {/* Language Tabs */}
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('es')}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'es'
                                ? 'text-secondary border-b-2 border-secondary bg-secondary/5'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🇪🇸 Español
                    </button>
                    <button
                        onClick={() => setActiveTab('en')}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'en'
                                ? 'text-secondary border-b-2 border-secondary bg-secondary/5'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🇺🇸 English
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
                                    <span className="text-lg">🇺🇸</span> Original ({originalLang})
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p><strong>Name:</strong> {originalData.name}</p>
                                    <p><strong>Category:</strong> {originalData.category}</p>
                                    <p><strong>Description:</strong> {originalData.description?.substring(0, 150)}...</p>
                                </div>
                            </div>

                            {/* Translation metadata */}
                            {translations[activeTab]?.translatedAt && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                                    <span className="text-green-700">
                                        ✅ {t('productTranslations.translated')} •
                                        {t('productTranslations.translatedBy')}: {translations[activeTab].translatedBy} •
                                        {new Date(translations[activeTab].translatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            )}

                            {/* Auto-translate button */}
                            <div className="mb-4">
                                <button
                                    onClick={handleAutoTranslate}
                                    disabled={loadingAuto}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                    {loadingAuto ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                            Translating...
                                        </>
                                    ) : (
                                        <>
                                            <MdAutoFixHigh />
                                            {t('productTranslations.autoTranslate')}
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Translation fields */}
                            <div className="p-4 border-2 border-secondary/20 rounded-lg">
                                <h3 className="font-medium mb-4 flex items-center gap-2">
                                    <span className="text-lg">{activeTab === 'es' ? '🇪🇸' : '🇺🇸'}</span>
                                    {activeTab === 'es' ? 'Español' : 'English'}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('productTranslations.bookName')}
                                        </label>
                                        <input
                                            type="text"
                                            value={translations[activeTab].name}
                                            onChange={(e) => handleChange(activeTab, 'name', e.target.value)}
                                            placeholder={originalData.name}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('productTranslations.category')}
                                        </label>
                                        <input
                                            type="text"
                                            value={translations[activeTab].category}
                                            onChange={(e) => handleChange(activeTab, 'category', e.target.value)}
                                            placeholder={originalData.category}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('productTranslations.description')}
                                        </label>
                                        <textarea
                                            value={translations[activeTab].description}
                                            onChange={(e) => handleChange(activeTab, 'description', e.target.value)}
                                            placeholder={originalData.description}
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
                                {t('productTranslations.saving')}
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