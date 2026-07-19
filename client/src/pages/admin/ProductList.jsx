import { useContext, useState, useEffect } from 'react'
import { ShopContext } from '../../context/ShopContext'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { MdTranslate } from 'react-icons/md'
import TranslationModal from '../../components/admin/TranslationModal'

const ProductList = () => {

    const { books, currency, axios, fetchBooks } = useContext(ShopContext)
    const { t } = useTranslation()
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showTranslationModal, setShowTranslationModal] = useState(false)
    const [translationStats, setTranslationStats] = useState(null)
    
    const fetchTranslationStats = async () => {
        try {
            const { data } = await axios.get('/api/product/translation-stats')
            if (data.success) {
                setTranslationStats(data.stats)
            }
        } catch (error) {
            console.error('Error loading translation stats:', error)
        }
    }

    useEffect(() => {
        fetchTranslationStats()
    }, [])

    const toggleStock = async (productId, inStock) => {
        try {
            const { data } = await axios.post('/api/product/stock', { productId, inStock })
            if (data.success) {
                fetchBooks()
                toast.success(data.message)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const openTranslationModal = (product) => {
        setSelectedProduct(product)
        setShowTranslationModal(true)
    }

    const handleTranslateAll = async (toLanguage) => {
        try {
            const productIds = books.map(book => book._id)
            const { data } = await axios.post('/api/product/translate-batch', {
                productIds,
                toLanguage,
            })
            if (data.success) {
                toast.success(data.message)
                fetchBooks()
                fetchTranslationStats()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error translating products')
        }
    }

    const hasTranslation = (book, lang) => {
        return book.translations && book.translations[lang] && book.translations[lang].name
    }

    return (
        <div className='px-2 sm:px-6 py-12 mt-2 h-[97vh] bg-primary overflow-y-scroll lg:w-4/5 rounded-xl'>
            <div className='flex flex-col gap-2'>
                {/* Translation Stats Bar */}
                {translationStats && (
                    <div className='flex items-center justify-between p-3 bg-white rounded-lg mb-2'>
                        <div className='flex items-center gap-4 text-sm'>
                            <span className='font-medium'>
                                {t('productTranslations.translationProgress')}:
                            </span>
                            <span className='text-green-600'>
                                🇪🇸 {translationStats.translatedEs}/{translationStats.total} {t('productTranslations.translated')}
                            </span>
                            <span className='text-blue-600'>
                                🇺🇸 {translationStats.translatedEn}/{translationStats.total} {t('productTranslations.translated')}
                            </span>
                        </div>
                        <div className='flex gap-2'>
                            <button
                                onClick={() => handleTranslateAll('es')}
                                className='px-3 py-1 text-xs bg-secondary text-white rounded hover:bg-secondary/90 transition-colors'
                            >
                                {t('productTranslations.translateAll')} → ES
                            </button>
                            <button
                                onClick={() => handleTranslateAll('en')}
                                className='px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
                            >
                                {t('productTranslations.translateAll')} → EN
                            </button>
                        </div>
                    </div>
                )}

                <div className='grid grid-cols-[1fr_3fr_1fr_1fr_1fr_0.5fr] items-center py-1 px-2 bg-white bold-14 sm:bold-15 mb-1 rounded'>
                    <h5>{t('product.category') === 'Category' ? 'Image' : 'Imagen'}</h5>
                    <h5>{t('profile.name')}</h5>
                    <h5>{t('product.category')}</h5>
                    <h5>{t('product.price')}</h5>
                    <h5>{t('product.inStock')}</h5>
                    <h5><MdTranslate /></h5>
                </div>
                { /* LISTA DE PRODUCTOS */}
                {books.map((book) => (
                    <div
                        key={book._id}
                        className='grid grid-cols-[1fr_3fr_1fr_1fr_1fr_0.5fr] items-center gap-2 p-2 bg-white rounded-lg'
                    >
                        <img
                            src={book.images[0]}
                            alt={book.name}
                            className='w-12 bg-primary rounded'
                        />
                        <div className="flex flex-col">
                            <h5 className="text-sm font-semibold">{book.name}</h5>
                            <div className="flex gap-1 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${hasTranslation(book, 'es') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                    ES
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${hasTranslation(book, 'en') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                    EN
                                </span>
                            </div>
                        </div>
                        <p className='text-sm font-semibold'>{book.category}</p>
                        <div className='text-sm font-semibold'>{currency}{book.offerPrice}</div>
                        <div>
                            <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                                <input
                                    onClick={() => toggleStock(book._id, !book.inStock)}
                                    type="checkbox"
                                    className="sr-only peer"
                                    defaultChecked={book.inStock}
                                />
                                <div className='w-10 h-6 bg-slate-300 rounded-full peer peer-checked:bg-secondary transition-colors duration-200' />
                                <span className='absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4' />
                            </label>
                        </div>
                        <button
                            onClick={() => openTranslationModal(book)}
                            className='p-2 hover:bg-primary rounded-lg transition-colors'
                            title={t('productTranslations.translate')}
                        >
                            <MdTranslate className='text-lg text-secondary' />
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal de traducción */}
            <TranslationModal
                product={selectedProduct}
                isOpen={showTranslationModal}
                onClose={() => setShowTranslationModal(false)}
                onSave={() => { fetchBooks(); fetchTranslationStats(); }}
            />
        </div>
    )
}

export default ProductList