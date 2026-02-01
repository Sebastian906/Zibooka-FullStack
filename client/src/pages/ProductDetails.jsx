import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import { Link, useParams } from 'react-router-dom';
import { TbHeart, TbShoppingBag, TbStarFilled, TbStarHalfFilled } from 'react-icons/tb';
import { FaTruckFast } from 'react-icons/fa6';
import ProductDescription from '../components/ProductDescription';
import ProductFeatures from '../components/ProductFeatures';
import RelatedBooks from '../components/RelatedBooks';
import { FaBook, FaClock } from 'react-icons/fa';

const ProductDetails = () => {

    const { t } = useTranslation();
    const { books, currency, addToCart, user, setShowUserLogin, getWaitingList, createReservation, createLoan } = useContext(ShopContext)
    const { id } = useParams()
    const book = books.find((b) => b._id === id)
    const [image, setImage] = useState(null)
    const [waitingList, setWaitingList] = useState([])
    const [showWaitingList, setShowWaitingList] = useState(false)
    const [isReserving, setIsReserving] = useState(false)
    const [isCreatingLoan, setIsCreatingLoan] = useState(false)

    useEffect(() => {
        if (book) {
            setImage(book.images[0])
            // Cargar lista de espera si el libro está agotado
            if (!book.inStock) {
                loadWaitingList()
            }
        }
    }, [book])

    const loadWaitingList = async () => {
        const list = await getWaitingList(id)
        setWaitingList(list)
    }

    const handleReserveBook = async () => {
        if (!user) {
            setShowUserLogin(true)
            return
        }

        setIsReserving(true)
        try {
            await createReservation(id)
            await loadWaitingList()
        } catch (error) {
            console.error('Error creating reservation:', error)
        } finally {
            setIsReserving(false)
        }
    }

    const handleCreateLoan = async () => {
        if (!user) {
            setShowUserLogin(true)
            return
        }

        setIsCreatingLoan(true)
        try {
            await createLoan(id)
            // Refresh the page to update book stock
            window.location.reload()
        } catch (error) {
            console.error('Error creating loan:', error)
        } finally {
            setIsCreatingLoan(false)
        }
    }

    return (
        book && (
            <div className='max-padd-container py-16 pt-28'>
                <p>
                    <Link to={'/'}>{t('nav.home')}</Link> /
                    <Link to={'/shop'}> {t('nav.shop')}</Link> /
                    <Link to={`/shop/${book.category}`}> {book.category}</Link> /
                    <span className='medium-14 text-secondary'> {book.name}</span>
                </p>
                {/* DATOS DEL LIBRO */}
                <div className='flex gap-10 flex-col xl:flex-row my-6'>
                    {/* IMAGEN */}
                    <div className='flex gap-x-2 max-w-108.25'>
                        <div className='flex-1 flexCenter flex-col gap-1.75 flex-wrap'>
                            {book.images.map((item, index) => (
                                <div key={index}>
                                    <img
                                        onClick={() => setImage(item)}
                                        src={item}
                                        alt='bookImg'
                                        className='rounded-lg overflow-hidden'
                                    />
                                </div>
                            ))}
                        </div>
                        <div className='flex flex-4'>
                            <img
                                src={image}
                                alt="bookImg"
                                className='rounded-lg overflow-hidden'
                            />
                        </div>
                    </div>
                    {/* INFORMACIÓN */}
                    <div className='px-5 py-3 w-full bg-primary rounded-xl pt-8'>
                        <h3 className='h3 leading-none'>{book.name}</h3>
                        <div className='flex items-center gap-x-2 pt-2'>
                            <div className='flex gap-x-2 text-yellow-400'>
                                <TbStarFilled />
                                <TbStarFilled />
                                <TbStarFilled />
                                <TbStarFilled />
                                <TbStarHalfFilled />
                            </div>
                            <p className='medium-12'>(22)</p>
                        </div>
                        <div className='h4 flex items-baseline gap-4 my-2'>
                            <h3 className='h3 line-through text-secondary'>{currency}{book.price}.00</h3>
                            <h4 className='h4'>{currency}{book.offerPrice}.00</h4>
                        </div>

                        {/* STOCK STATUS */}
                        <div className='flex items-center gap-2 my-3'>
                            {book.inStock ? (
                                <span className='px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full'>
                                    {t('product.inStock')}
                                </span>
                            ) : (
                                <span className='px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full'>
                                    {t('product.outOfStock')}
                                </span>
                            )}
                        </div>

                        <p className='max-w-138.75'>{book.description}</p>

                        {/* BOOK DETAILS */}
                        {(book.author || book.pageCount || book.isbn) && (
                            <div className='mt-4 p-4 bg-white rounded-lg space-y-2'>
                                {book.author && (
                                    <p className='text-sm'>
                                        <span className='font-medium'>{t('product.author')}:</span> {book.author}
                                    </p>
                                )}
                                {book.pageCount && (
                                    <p className='text-sm'>
                                        <span className='font-medium'>{t('product.pages')}:</span> {book.pageCount}
                                    </p>
                                )}
                                {book.publisher && (
                                    <p className='text-sm'>
                                        <span className='font-medium'>{t('product.publisher')}:</span> {book.publisher}
                                    </p>
                                )}
                                {book.publicationYear && (
                                    <p className='text-sm'>
                                        <span className='font-medium'>{t('product.year')}:</span> {book.publicationYear}
                                    </p>
                                )}
                                {book.isbn && (
                                    <p className='text-sm'>
                                        <span className='font-medium'>{t('product.isbn')}:</span> {book.isbn}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ACTION BUTTONS */}
                        <div className='flex flex-wrap items-center gap-x-4 mt-6'>
                            {book.inStock ? (
                                <>
                                    <button
                                        onClick={() => addToCart(book._id)}
                                        className='btn-dark sm:w-auto flexCenter gap-x-2 capitalize rounded-md!'
                                    >
                                        {t('product.addToCart')}<TbShoppingBag />
                                    </button>
                                    <button
                                        onClick={handleCreateLoan}
                                        disabled={isCreatingLoan}
                                        className='btn-secondary sm:w-auto flexCenter gap-x-2 capitalize rounded-md! disabled:opacity-50'
                                    >
                                        {isCreatingLoan ? t('product.processing') : (
                                            <>{t('product.borrowBook')}<FaBook /></>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleReserveBook}
                                    disabled={isReserving}
                                    className='btn-dark sm:w-auto flexCenter gap-x-2 capitalize rounded-md! disabled:opacity-50'
                                >
                                    {isReserving ? t('product.reserving') : (
                                        <>{t('product.reserveBook')}<FaBook /></>
                                    )}
                                </button>
                            )}
                            <button className='btn-secondary rounded-md!'>
                                <TbHeart className='text-xl' />
                            </button>
                        </div>

                        {/* WAITING LIST */}
                        {!book.inStock && waitingList.length > 0 && (
                            <div className='mt-4'>
                                <button
                                    onClick={() => setShowWaitingList(!showWaitingList)}
                                    className='flex items-center gap-2 text-sm text-gray-600 hover:text-secondary transition-colors'
                                >
                                    <FaClock />
                                    <span>{waitingList.length} {waitingList.length === 1 ? t('product.personWaiting') : t('product.peopleWaiting')}</span>
                                </button>

                                {showWaitingList && (
                                    <div className='mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200'>
                                        <h5 className='font-medium text-sm mb-2'>{t('product.waitingList')}</h5>
                                        <div className='space-y-2 max-h-40 overflow-y-auto'>
                                            {waitingList.map((reservation) => (
                                                <div key={reservation._id} className='flex items-center gap-2 text-xs'>
                                                    <span className='font-medium'>#{reservation.priority}</span>
                                                    <span className='text-gray-600'>
                                                        {t('product.reservedOn')} {new Date(reservation.requestDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className='flex items-center gap-x-2 mt-3'>
                            <FaTruckFast />
                            <span className='medium-14'>{t('product.freeDelivery')}</span>
                        </div>
                        <hr className='my-3 w-2/3' />
                        <div className='mt-2 flex flex-col gap-1 text-gray-300 text-[14px]'>
                            <p>{t('product.authenticity')}</p>
                            <p>{t('product.cashOnDelivery')}</p>
                            <p>{t('product.easyReturns')}</p>
                        </div>
                    </div>
                </div>
                <ProductDescription />
                <ProductFeatures />
                <RelatedBooks book={book} id={id} />
            </div>
        )
    )
}

export default ProductDetails