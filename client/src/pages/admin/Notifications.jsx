import { useContext, useEffect, useState, useCallback } from 'react'
import { ShopContext } from '../../context/ShopContext'
import Title from '../../components/Title'
import { FaBell, FaSearch, FaPaperPlane, FaHistory, FaCheckCircle, FaExclamationTriangle, FaClock, FaSpinner, FaSync } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

const Notifications = () => {
    const { t } = useTranslation()
    const { axios } = useContext(ShopContext)

    // States
    const [activeTab, setActiveTab] = useState('pending')
    const [pendingLoans, setPendingLoans] = useState([])
    const [pendingReservations, setPendingReservations] = useState([])
    const [history, setHistory] = useState([])
    const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [stats, setStats] = useState({ totalSent: 0, sentToday: 0, failedCount: 0, pendingCount: 0 })
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(null)
    const [processing, setProcessing] = useState(false)

    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [modalData, setModalData] = useState(null)
    const [customSubject, setCustomSubject] = useState('')
    const [customMessage, setCustomMessage] = useState('')

    // Filters for history
    const [historyFilter, setHistoryFilter] = useState('all')

    // Load pending notifications
    const loadPending = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/notifications/admin/pending')
            if (data.success) {
                setPendingLoans(data.loans || [])
                setPendingReservations(data.reservations || [])
            }
        } catch (error) {
            console.error('Error loading pending notifications:', error)
        }
    }, [axios])

    // Load notification history
    const loadHistory = useCallback(async (page = 1) => {
        try {
            const params = { page, limit: 20 }
            if (historyFilter !== 'all') params.type = historyFilter

            const { data } = await axios.get('/api/notifications/admin/history', { params })
            if (data.success) {
                setHistory(data.notifications || [])
                setHistoryPagination(data.pagination)
            }
        } catch (error) {
            console.error('Error loading notification history:', error)
        }
    }, [axios, historyFilter])

    // Load statistics
    const loadStats = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/notifications/admin/stats')
            if (data.success) {
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Error loading stats:', error)
        }
    }, [axios])

    // Initial load
    useEffect(() => {
        const loadAll = async () => {
            setLoading(true)
            await Promise.all([loadPending(), loadStats()])
            setLoading(false)
        }
        loadAll()
    }, [loadPending, loadStats])

    // Load history when tab changes
    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory(1)
        }
    }, [activeTab, loadHistory])

    // Calculate days remaining
    const getDaysRemaining = (date) => {
        const now = new Date()
        const target = new Date(date)
        const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
        return Math.max(0, diff)
    }

    // Open send notification modal
    const openSendModal = (item, type) => {
        const isLoan = type === 'loan'
        const bookName = isLoan
            ? (item.bookId?.name || 'Unknown Book')
            : (item.bookId?.name || 'Unknown Book')
        const userName = isLoan
            ? (item.userId?.name || 'Unknown')
            : (item.userId?.name || 'Unknown')
        const dueDate = isLoan ? item.dueDate : item.expiresAt
        const days = getDaysRemaining(dueDate)

        setModalData({
            ...item,
            type,
            bookName,
            userName,
            daysRemaining: days,
        })
        setCustomSubject(
            isLoan
                ? t('notifications.loanReminderSubject', { bookName })
                : t('notifications.reservationReminderSubject', { bookName })
        )
        setCustomMessage('')
        setShowModal(true)
    }

    // Send notification
    const handleSend = async () => {
        if (!modalData) return

        const notifId = modalData._id
        setSending(notifId)

        try {
            const { data } = await axios.post('/api/notifications/admin/send', {
                recipientId: modalData.userId._id || modalData.userId,
                subject: customSubject,
                message: customMessage,
                relatedId: notifId,
                relatedModel: modalData.type === 'loan' ? 'Loan' : 'Reservation',
            })

            if (data.success) {
                toast.success(t('notifications.notificationSent'))
                setShowModal(false)
                setModalData(null)
                // Reload pending and stats
                await Promise.all([loadPending(), loadStats()])
            } else {
                toast.error(data.message || t('notifications.notificationFailed'))
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('notifications.notificationFailed'))
        } finally {
            setSending(null)
        }
    }

    // Manually trigger notification processing
    const handleProcessNow = async () => {
        setProcessing(true)
        try {
            const { data } = await axios.post('/api/notifications/admin/process')
            if (data.success) {
                const r = data.result
                toast.success(
                    t('notifications.processResult', { loans: r.loansProcessed, reservations: r.reservationsProcessed, errors: r.errors })
                )
                await Promise.all([loadPending(), loadStats()])
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('notifications.processError'))
        } finally {
            setProcessing(false)
        }
    }

    // Format date
    const formatDate = (date) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // Format datetime
    const formatDateTime = (date) => {
        if (!date) return '-'
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // Get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'sent':
                return 'bg-green-100 text-green-700'
            case 'failed':
                return 'bg-red-100 text-red-700'
            case 'pending':
                return 'bg-yellow-100 text-yellow-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    // Get type badge
    const getTypeBadge = (type) => {
        switch (type) {
            case 'loan_reminder':
                return 'bg-blue-100 text-blue-700'
            case 'reservation_reminder':
                return 'bg-purple-100 text-purple-700'
            case 'manual':
                return 'bg-orange-100 text-orange-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

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
                title1={t('notifications.title1')}
                title2={t('notifications.title2')}
                title1Styles="pb-4"
                paraStyles="mb-8"
                para={t('notifications.description')}
            />

            {/* STATISTICS */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                <div className='bg-primary p-4 rounded-xl text-center'>
                    <FaBell className='text-3xl mx-auto mb-2 text-secondary' />
                    <h3 className='h3'>{stats.totalSent}</h3>
                    <p className='text-sm text-gray-600'>{t('notifications.totalSent')}</p>
                </div>
                <div className='bg-green-50 p-4 rounded-xl text-center border border-green-200'>
                    <FaCheckCircle className='text-3xl mx-auto mb-2 text-green-600' />
                    <h3 className='h3 text-green-700'>{stats.sentToday}</h3>
                    <p className='text-sm text-green-600'>{t('notifications.sentToday')}</p>
                </div>
                <div className='bg-red-50 p-4 rounded-xl text-center border border-red-200'>
                    <FaExclamationTriangle className='text-3xl mx-auto mb-2 text-red-600' />
                    <h3 className='h3 text-red-700'>{stats.failedCount}</h3>
                    <p className='text-sm text-red-600'>{t('notifications.failed')}</p>
                </div>
                <div className='bg-blue-50 p-4 rounded-xl text-center border border-blue-200 cursor-pointer'
                    onClick={() => setActiveTab('pending')}>
                    <FaClock className='text-3xl mx-auto mb-2 text-blue-600' />
                    <h3 className='h3 text-blue-700'>{pendingLoans.length + pendingReservations.length}</h3>
                    <p className='text-sm text-blue-600'>{t('notifications.pending')}</p>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className='flex flex-col sm:flex-row gap-3 mb-6'>
                <button
                    onClick={handleProcessNow}
                    disabled={processing}
                    className='flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50'
                >
                    {processing ? (
                        <FaSpinner className='animate-spin' />
                    ) : (
                        <FaSync />
                    )}
                    {processing ? t('notifications.processing') : t('notifications.processNow')}
                </button>
            </div>

            {/* TABS */}
            <div className='flex gap-2 mb-6'>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'pending'
                            ? 'bg-secondary text-white'
                            : 'bg-primary text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <FaBell />
                    {t('notifications.pending')} ({pendingLoans.length + pendingReservations.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'history'
                            ? 'bg-secondary text-white'
                            : 'bg-primary text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <FaHistory />
                    {t('notifications.history')}
                </button>
            </div>

            {/* PENDING TAB */}
            {activeTab === 'pending' && (
                <div className='space-y-6'>
                    {/* Pending Loans */}
                    <div>
                        <h3 className='h4 mb-3'>{t('notifications.expiringLoans')} ({pendingLoans.length})</h3>
                        {pendingLoans.length === 0 ? (
                            <div className='bg-white p-8 rounded-xl text-center ring-1 ring-slate-900/5'>
                                <FaCheckCircle className='text-4xl text-green-400 mx-auto mb-3' />
                                <p className='text-gray-500'>{t('notifications.noLoansExpiring')}</p>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {pendingLoans.map((loan) => {
                                    const days = getDaysRemaining(loan.dueDate)
                                    const book = loan.bookId
                                    const user = loan.userId

                                    return (
                                        <div
                                            key={loan._id}
                                            className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 hover:shadow-md transition-all'
                                        >
                                            <div className='flex flex-col md:flex-row gap-4 items-start'>
                                                {/* Book Image */}
                                                <div className='w-full md:w-16 shrink-0'>
                                                    <img
                                                        src={book?.images?.[0] || '/placeholder-book.png'}
                                                        alt={book?.name || 'Book'}
                                                        className='w-full h-20 object-cover rounded-lg'
                                                    />
                                                </div>

                                                {/* Info */}
                                                <div className='flex-1'>
                                                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2'>
                                                        <div>
                                                            <h4 className='font-semibold line-clamp-1'>{book?.name || 'Unknown Book'}</h4>
                                                            <p className='text-sm text-gray-600'>
                                                                {user?.name || 'Unknown'} ({user?.email || '-'})
                                                            </p>
                                                        </div>
                                                        <div className='flex items-center gap-2'>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                                days <= 1 ? 'bg-red-100 text-red-700' :
                                                                days <= 2 ? 'bg-orange-100 text-orange-700' :
                                                                'bg-blue-100 text-blue-700'
                                                             }`}>
                                                                 {t('notifications.daysLeft', { count: days })}
                                                             </span>
                                                         </div>
                                                     </div>
                                                     <div className='flex items-center justify-between'>
                                                         <p className='text-xs text-gray-500'>
                                                             {t('notifications.dueDate')} {formatDate(loan.dueDate)}
                                                        </p>
                                                        <button
                                                            onClick={() => openSendModal(loan, 'loan')}
                                                            disabled={sending === loan._id}
                                                            className='flex items-center gap-1 px-3 py-1.5 bg-secondary text-white text-sm rounded-lg hover:bg-opacity-90 disabled:opacity-50'
                                                        >
                                                            {sending === loan._id ? (
                                                                <FaSpinner className='animate-spin' />
                                                            ) : (
                                                                <FaPaperPlane />
                                                            )}
                                                             {t('notifications.sendReminder')}
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                         )}
                     </div>

                     {/* Pending Reservations */}
                     <div>
                         <h3 className='h4 mb-3'>{t('notifications.expiringReservations')} ({pendingReservations.length})</h3>
                        {pendingReservations.length === 0 ? (
                            <div className='bg-white p-8 rounded-xl text-center ring-1 ring-slate-900/5'>
                                <FaCheckCircle className='text-4xl text-green-400 mx-auto mb-3' />
                                <p className='text-gray-500'>{t('notifications.noReservationsExpiring')}</p>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {pendingReservations.map((reservation) => {
                                    const days = getDaysRemaining(reservation.expiresAt)
                                    const book = reservation.bookId
                                    const user = reservation.userId

                                    return (
                                        <div
                                            key={reservation._id}
                                            className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 hover:shadow-md transition-all'
                                        >
                                            <div className='flex flex-col md:flex-row gap-4 items-start'>
                                                {/* Book Image */}
                                                <div className='w-full md:w-16 shrink-0'>
                                                    <img
                                                        src={book?.images?.[0] || '/placeholder-book.png'}
                                                        alt={book?.name || 'Book'}
                                                        className='w-full h-20 object-cover rounded-lg'
                                                    />
                                                </div>

                                                {/* Info */}
                                                <div className='flex-1'>
                                                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2'>
                                                        <div>
                                                            <h4 className='font-semibold line-clamp-1'>{book?.name || 'Unknown Book'}</h4>
                                                            <p className='text-sm text-gray-600'>
                                                                {user?.name || 'Unknown'} ({user?.email || '-'})
                                                            </p>
                                                        </div>
                                                        <div className='flex items-center gap-2'>
                                                             <span className='px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700'>
                                                                 {t('notifications.position', { position: reservation.priority })}
                                                             </span>
                                                             <span className={`px-2 py-1 text-xs rounded-full ${
                                                                 days <= 1 ? 'bg-red-100 text-red-700' :
                                                                 days <= 2 ? 'bg-orange-100 text-orange-700' :
                                                                 'bg-blue-100 text-blue-700'
                                                             }`}>
                                                                 {t('notifications.daysLeft', { count: days })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center justify-between'>
                                                        <p className='text-xs text-gray-500'>
                                                             {t('notifications.expiresDate')} {formatDate(reservation.expiresAt)}
                                                        </p>
                                                        <button
                                                            onClick={() => openSendModal(reservation, 'reservation')}
                                                            disabled={sending === reservation._id}
                                                            className='flex items-center gap-1 px-3 py-1.5 bg-secondary text-white text-sm rounded-lg hover:bg-opacity-90 disabled:opacity-50'
                                                        >
                                                            {sending === reservation._id ? (
                                                                <FaSpinner className='animate-spin' />
                                                            ) : (
                                                                <FaPaperPlane />
                                                            )}
                                                             {t('notifications.sendReminder')}
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                         )}
                     </div>
                 </div>
             )}

             {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div>
                    {/* Filter */}
                    <div className='flex gap-2 mb-4'>
                        <select
                            value={historyFilter}
                            onChange={(e) => {
                                setHistoryFilter(e.target.value)
                                loadHistory(1)
                            }}
                            className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary'
                        >
                            <option value='all'>{t('notifications.allTypes')}</option>
                            <option value='loan_reminder'>{t('notifications.loanReminders')}</option>
                            <option value='reservation_reminder'>{t('notifications.reservationReminders')}</option>
                            <option value='manual'>{t('notifications.manual')}</option>
                        </select>
                    </div>

                    {history.length === 0 ? (
                        <div className='bg-white p-12 rounded-xl text-center ring-1 ring-slate-900/5'>
                            <FaHistory className='text-6xl text-gray-300 mx-auto mb-4' />
                            <h3 className='h3 text-gray-600 mb-2'>{t('notifications.noHistory')}</h3>
                            <p className='text-gray-500'>{t('notifications.noHistoryDesc')}</p>
                        </div>
                    ) : (
                        <>
                            <div className='space-y-3'>
                                {history.map((notif) => (
                                    <div
                                        key={notif._id}
                                        className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5'
                                    >
                                        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                                            <div className='flex-1'>
                                                <div className='flex items-center gap-2 mb-1'>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeBadge(notif.type)}`}>
                                                     {notif.type === 'loan_reminder' ? t('notifications.typeLoan') :
                                                          notif.type === 'reservation_reminder' ? t('notifications.typeReservation') : t('notifications.typeManual')}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(notif.status)}`}>
                                                        {notif.status}
                                                    </span>
                                                </div>
                                                <p className='font-medium text-sm line-clamp-1'>{notif.subject}</p>
                                                 <p className='text-xs text-gray-500'>
                                                     {t('notifications.to')} {notif.userId?.name || 'Unknown'} ({notif.userId?.email || '-'})
                                                    {notif.message && ` | ${notif.message}`}
                                                </p>
                                            </div>
                                            <div className='text-right shrink-0'>
                                                <p className='text-xs text-gray-500'>{formatDateTime(notif.sentAt)}</p>
                                                 <p className='text-xs text-gray-400'>{t('notifications.by')} {notif.sentBy}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {historyPagination.totalPages > 1 && (
                                <div className='flex justify-center gap-2 mt-6'>
                                    {Array.from({ length: historyPagination.totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            const current = historyPagination.page
                                            return page === 1 || page === historyPagination.totalPages ||
                                                Math.abs(page - current) <= 2
                                        })
                                        .map((page, idx, arr) => (
                                            <span key={page} className='flex items-center'>
                                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                    <span className='px-2 text-gray-400'>...</span>
                                                )}
                                                <button
                                                    onClick={() => loadHistory(page)}
                                                    className={`px-3 py-1 rounded-lg text-sm ${
                                                        page === historyPagination.page
                                                            ? 'bg-secondary text-white'
                                                            : 'bg-primary text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            </span>
                                        ))
                                    }
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* SEND NOTIFICATION MODAL */}
            {showModal && modalData && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
                    <div className='bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl'>
                        <h3 className='text-lg font-bold mb-4'>{t('notifications.send')}</h3>

                        {/* Recipient info */}
                        <div className='bg-white p-3 rounded-lg mb-4'>
                            <p className='text-sm'>
                                <strong>{t('notifications.to')}</strong> {modalData.userName}
                            </p>
                            <p className='text-sm text-gray-600'>
                                <strong>{t('notifications.bookLabel')}</strong> {modalData.bookName}
                            </p>
                            <p className='text-sm text-gray-600'>
                                <strong>
                                    {modalData.type === 'loan' ? t('notifications.dueDate') : t('notifications.expiresDate')}
                                </strong>{' '}
                                {formatDate(modalData.type === 'loan' ? modalData.dueDate : modalData.expiresAt)}
                                {' '}({t('notifications.dayRemaining', { count: modalData.daysRemaining })})
                            </p>
                        </div>

                        {/* Subject */}
                        <div className='mb-4'>
                            <label className='block text-sm font-medium mb-1'>{t('notifications.subject')}</label>
                            <input
                                type='text'
                                value={customSubject}
                                onChange={(e) => setCustomSubject(e.target.value)}
                                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary'
                                placeholder={t('notifications.subjectPlaceholder')}
                            />
                        </div>

                        {/* Message */}
                        <div className='mb-6'>
                            <label className='block text-sm font-medium mb-1'>
                                {t('notifications.customMessage')}
                            </label>
                            <textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={4}
                                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary resize-none'
                                placeholder={t('notifications.messagePlaceholder')}
                            />
                        </div>

                        {/* Actions */}
                        <div className='flex gap-3 justify-end'>
                            <button
                                onClick={() => {
                                    setShowModal(false)
                                    setModalData(null)
                                }}
                                className='px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50'
                            >
                                {t('notifications.cancel')}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending !== null || !customSubject.trim()}
                                className='flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50'
                            >
                                {sending ? (
                                    <FaSpinner className='animate-spin' />
                                ) : (
                                    <FaPaperPlane />
                                )}
                                {sending ? t('notifications.sending') : t('notifications.send')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INFO */}
            <div className='mt-8 bg-linear-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200'>
                <p className='text-sm text-gray-700'>
                    <strong>{t('notifications.howItWorks')}</strong> {t('notifications.howItWorksDesc')}
                </p>
            </div>
        </div>
    )
}

export default Notifications
