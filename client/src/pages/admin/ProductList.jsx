import { useContext, useState } from 'react'
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

    return (
        <div className='px-2 sm:px-6 py-12 mt-2 h-[97vh] bg-primary overflow-y-scroll lg:w-4/5 rounded-xl'>
            <div className='flex flex-col gap-2'>
                <div className='grid grid-cols-[1fr_3fr_1fr_1fr_1fr_0.5fr] items-center py-1 px-2 bg-white bold-14 sm:bold-15 mb-1 rounded'>
                    <h5>{t('product.category') === 'Category' ? 'Image' : 'Imagen'}</h5>
                    <h5>{t('profile.name')}</h5>
                    <h5>{t('product.category')}</h5>
                    <h5>{t('product.price')}</h5>
                    <h5>{t('product.inStock')}</h5>
                    <h5><MdTranslate /></h5>
                </div>
                { /* LISTA DE PRODUCTOS */ }
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
                        <h5 className="text-sm font-semibold">{book.name}</h5>
                        <p className='text-sm font-semibold'>{book.category}</p>
                        <div className='text-sm font-semibold'>{currency}{book.offerPrice}</div>
                        <div>
                            <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                                <input 
                                    onClick={()=>toggleStock(book._id, !book.inStock)}
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
                            title='Traducir'
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
                onSave={() => fetchBooks()}
            />
        </div>
    )
}

export default ProductList