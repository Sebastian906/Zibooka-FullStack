import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import { FaBookmark, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa'

const MyReservations = () => {
    const { t } = useTranslation()
    const { user, navigate, getUserReservationStats, getUserReservationList, cancelReservation } = useContext(ShopContext)
    const [reservations, setReservations] = useState([])
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        fulfilled: 0,
        cancelled: 0,
        expired: 0,
    })
    const [loading, setLoading] = useState(true)
    const [cancellingId, setCancellingId] = useState(null)

    const loadReservations = async () => {
        if (!user) {
            navigate('/')
            return
        }

        try {
            setLoading(true)
            const [statsData, listData] = await Promise.all([
                getUserReservationStats(),
                getUserReservationList()
            ])

            setStats(statsData)
            setReservations(listData)
        } catch (error) {
            console.error('Error loading reservations:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCancelReservation = async (reservationId) => {
        if (!confirm(t('reservations.confirmCancel'))) return

        setCancellingId(reservationId)
        try {
            await cancelReservation(reservationId)
            await loadReservations()
        } catch (error) {
            console.error('Error cancelling reservation:', error)
        } finally {
            setCancellingId(null)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-700'
            case 'fulfilled':
                return 'bg-green-100 text-green-700'
            case 'cancelled':
                return 'bg-red-100 text-red-700'
            case 'expired':
                return 'bg-gray-100 text-gray-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    const formatDate = (date) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    useEffect(() => {
        loadReservations()
    }, [user])

    if (loading) {
        return (
            <div className='max-padd-container py-16 pt-28'>
                <div className='flexCenter h-64'>
                    <div className='animate-spin h-12 w-12 border-4 border-gray-300 border-t-secondary rounded-full' />
                </div>
            </div>
        )
    }

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1={t('reservations.my')}
                title2={t('reservations.title')}
                title1Styles="pb-4"
                paraStyles="mb-8"
                para={t('reservations.description')}
            />

            {/* STATISTICS */}
            <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
                <div className='bg-primary p-4 rounded-xl text-center'>
                    <FaBookmark className='text-3xl mx-auto mb-2 text-secondary' />
                    <h3 className='h3'>{stats.total}</h3>
                    <p className='text-sm text-gray-600'>{t('reservations.total')}</p>
                </div>
                <div className='bg-yellow-50 p-4 rounded-xl text-center border border-yellow-200'>
                    <FaHourglassHalf className='text-3xl mx-auto mb-2 text-yellow-600' />
                    <h3 className='h3 text-yellow-700'>{stats.pending}</h3>
                    <p className='text-sm text-yellow-600'>{t('reservations.pending')}</p>
                </div>
                <div className='bg-green-50 p-4 rounded-xl text-center border border-green-200'>
                    <FaCheckCircle className='text-3xl mx-auto mb-2 text-green-600' />
                    <h3 className='h3 text-green-700'>{stats.fulfilled}</h3>
                    <p className='text-sm text-green-600'>{t('reservations.fulfilled')}</p>
                </div>
                <div className='bg-red-50 p-4 rounded-xl text-center border border-red-200'>
                    <FaTimesCircle className='text-3xl mx-auto mb-2 text-red-600' />
                    <h3 className='h3 text-red-700'>{stats.cancelled}</h3>
                    <p className='text-sm text-red-600'>{t('reservations.cancelled')}</p>
                </div>
                <div className='bg-gray-50 p-4 rounded-xl text-center border border-gray-200'>
                    <FaClock className='text-3xl mx-auto mb-2 text-gray-600' />
                    <h3 className='h3 text-gray-700'>{stats.expired}</h3>
                    <p className='text-sm text-gray-600'>{t('reservations.expired')}</p>
                </div>
            </div>

            {/* RESERVATION LIST (Queue - FIFO) */}
            {reservations.length === 0 ? (
                <div className='bg-white p-12 rounded-xl text-center ring-1 ring-slate-900/5'>
                    <FaBookmark className='text-6xl text-gray-300 mx-auto mb-4' />
                    <h3 className='h3 text-gray-600 mb-2'>{t('reservations.noReservations')}</h3>
                    <p className='text-gray-500 mb-4'>{t('reservations.startReserving')}</p>
                    <button
                        onClick={() => navigate('/shop')}
                        className='btn-secondary'
                    >
                        {t('loans.browseBooks')}
                    </button>
                </div>
            ) : (
                <div className='space-y-4'>
                    {reservations.map((reservation, index) => {
                        const book = reservation.bookId

                        return (
                            <div
                                key={reservation._id}
                                className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 hover:shadow-md transition-all'
                            >
                                <div className='flex flex-col md:flex-row gap-4'>
                                    {/* BOOK IMAGE */}
                                    <div className='w-full md:w-24 shrink-0'>
                                        <img
                                            src={book?.images?.[0] || '/placeholder-book.png'}
                                            alt={book?.name || 'Book'}
                                            className='w-full h-32 md:h-32 object-cover rounded-lg'
                                        />
                                    </div>

                                    {/* RESERVATION INFO */}
                                    <div className='flex-1'>
                                        <div className='flexBetween mb-2'>
                                            <h4 className='h4 line-clamp-1'>{book?.name || 'Unknown Book'}</h4>
                                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(reservation.status)}`}>
                                                {reservation.status}
                                            </span>
                                        </div>

                                        <div className='grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-3'>
                                            <div>
                                                <p className='text-gray-500'>{t('reservations.reservationDate')}:</p>
                                                <p className='font-medium'>{formatDate(reservation.requestDate)}</p>
                                            </div>
                                            <div>
                                                <p className='text-gray-500'>{t('reservations.priority')}:</p>
                                                <p className='font-medium'>
                                                    {reservation.status === 'pending' ? (
                                                        <span className='text-blue-600'>{t('reservations.position')} #{reservation.priority}</span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-gray-500'>{t('reservations.expiryDate')}:</p>
                                                <p className='font-medium'>{formatDate(reservation.expiresAt)}</p>
                                            </div>
                                        </div>

                                        {reservation.status === 'fulfilled' && reservation.fulfilledAt && (
                                            <div className='bg-green-50 border border-green-200 p-2 rounded-lg mb-3'>
                                                <p className='text-sm text-green-700'>
                                                    <strong>{t('reservations.fulfilled')}:</strong> {formatDate(reservation.fulfilledAt)}
                                                </p>
                                            </div>
                                        )}

                                        {reservation.notes && (
                                            <div className='bg-blue-50 border border-blue-200 p-2 rounded-lg mb-3'>
                                                <p className='text-sm text-blue-700'>
                                                    <strong>{t('reservations.notes')}:</strong> {reservation.notes}
                                                </p>
                                            </div>
                                        )}

                                        {/* ACTIONS */}
                                        {reservation.status === 'pending' && (
                                            <button
                                                onClick={() => handleCancelReservation(reservation._id)}
                                                disabled={cancellingId === reservation._id}
                                                className='btn-white py-1! px-4! text-sm rounded-md disabled:opacity-50'
                                            >
                                                {cancellingId === reservation._id ? t('reservations.cancelling') : t('reservations.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* QUEUE INDICATOR */}
                                {index === 0 && reservations.length > 1 && (
                                    <div className='mt-3 pt-3 border-t border-gray-200'>
                                        <p className='text-xs text-gray-500'>
                                            <strong>{t('reservations.queueFifo')}:</strong> {t('reservations.showingRecent')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* INFO BOX */}
            <div className='mt-8 bg-linear-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200'>
                <h5 className='h5 mb-3'>{t('reservations.howItWorks')}</h5>
                <ul className='space-y-2 text-sm'>
                    <li className='flex items-start gap-2'>
                        <span className='text-purple-600'>•</span>
                        <p dangerouslySetInnerHTML={{ __html: t('reservations.fifoInfo1') }}></p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-purple-600'>•</span>
                        <p dangerouslySetInnerHTML={{ __html: t('reservations.fifoInfo2') }}></p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-purple-600'>•</span>
                        <p dangerouslySetInnerHTML={{ __html: t('reservations.fifoInfo3') }}></p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-purple-600'>•</span>
                        <p dangerouslySetInnerHTML={{ __html: t('reservations.fifoInfo4') }}></p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-purple-600'>•</span>
                        <p dangerouslySetInnerHTML={{ __html: t('reservations.fifoInfo5') }}></p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-purple-600'>•</span>
                        <p dangerouslySetInnerHTML={{ __html: t('reservations.fifoInfo6') }}></p>
                    </li>
                </ul>
            </div>
        </div>
    )
}

export default MyReservations