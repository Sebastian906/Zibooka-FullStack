import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import { FaBook, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa'

const MyLoans = () => {
    const { user, navigate, getUserLoans, getUserLoanStats, returnBook } = useContext(ShopContext)
    const [loans, setLoans] = useState([])
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
    })
    const [loading, setLoading] = useState(true)
    const [returningLoanId, setReturningLoanId] = useState(null)

    const loadLoans = async () => {
        if (!user) {
            navigate('/')
            return
        }

        try {
            setLoading(true)
            const [loansData, statsData] = await Promise.all([
                getUserLoans(),
                getUserLoanStats()
            ])

            setLoans(loansData)
            setStats(statsData)
        } catch (error) {
            console.error('Error loading loans:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleReturnBook = async (loanId) => {
        if (!confirm('Are you sure you want to return this book?')) return

        setReturningLoanId(loanId)
        try {
            await returnBook(loanId)
            await loadLoans()
        } catch (error) {
            console.error('Error returning book:', error)
        } finally {
            setReturningLoanId(null)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-blue-100 text-blue-700'
            case 'completed':
                return 'bg-green-100 text-green-700'
            case 'overdue':
                return 'bg-red-100 text-red-700'
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

    const getDaysRemaining = (dueDate) => {
        if (!dueDate) return null
        const today = new Date()
        const due = new Date(dueDate)
        const diffTime = due - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    useEffect(() => {
        loadLoans()
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
                title1="My"
                title2="Loans"
                title1Styles="pb-4"
                paraStyles="mb-8"
                para="Your book loans managed with LIFO (Last In, First Out) stack"
            />

            {/* STATISTICS */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                <div className='bg-primary p-4 rounded-xl text-center'>
                    <FaBook className='text-3xl mx-auto mb-2 text-secondary' />
                    <h3 className='h3'>{stats.total}</h3>
                    <p className='text-sm text-gray-600'>Total Loans</p>
                </div>
                <div className='bg-blue-50 p-4 rounded-xl text-center border border-blue-200'>
                    <FaClock className='text-3xl mx-auto mb-2 text-blue-600' />
                    <h3 className='h3 text-blue-700'>{stats.active}</h3>
                    <p className='text-sm text-blue-600'>Active</p>
                </div>
                <div className='bg-green-50 p-4 rounded-xl text-center border border-green-200'>
                    <FaCheckCircle className='text-3xl mx-auto mb-2 text-green-600' />
                    <h3 className='h3 text-green-700'>{stats.completed}</h3>
                    <p className='text-sm text-green-600'>Completed</p>
                </div>
                <div className='bg-red-50 p-4 rounded-xl text-center border border-red-200'>
                    <FaExclamationTriangle className='text-3xl mx-auto mb-2 text-red-600' />
                    <h3 className='h3 text-red-700'>{stats.overdue}</h3>
                    <p className='text-sm text-red-600'>Overdue</p>
                </div>
            </div>

            {/* LOAN LIST (Stack - LIFO) */}
            {loans.length === 0 ? (
                <div className='bg-white p-12 rounded-xl text-center ring-1 ring-slate-900/5'>
                    <FaBook className='text-6xl text-gray-300 mx-auto mb-4' />
                    <h3 className='h3 text-gray-600 mb-2'>No loans yet</h3>
                    <p className='text-gray-500 mb-4'>Start borrowing books from our collection</p>
                    <button
                        onClick={() => navigate('/shop')}
                        className='btn-secondary'
                    >
                        Browse Books
                    </button>
                </div>
            ) : (
                <div className='space-y-4'>
                    {loans.map((loan, index) => {
                        const book = loan.bookId
                        const daysRemaining = getDaysRemaining(loan.dueDate)

                        return (
                            <div
                                key={loan._id}
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

                                    {/* LOAN INFO */}
                                    <div className='flex-1'>
                                        <div className='flexBetween mb-2'>
                                            <h4 className='h4 line-clamp-1'>{book?.name || 'Unknown Book'}</h4>
                                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(loan.status)}`}>
                                                {loan.status}
                                            </span>
                                        </div>

                                        <div className='grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-3'>
                                            <div>
                                                <p className='text-gray-500'>Loan Date:</p>
                                                <p className='font-medium'>{formatDate(loan.loanDate)}</p>
                                            </div>
                                            <div>
                                                <p className='text-gray-500'>Due Date:</p>
                                                <p className='font-medium'>{formatDate(loan.dueDate)}</p>
                                            </div>
                                            <div>
                                                <p className='text-gray-500'>Return Date:</p>
                                                <p className='font-medium'>{formatDate(loan.returnDate)}</p>
                                            </div>
                                        </div>

                                        {loan.status === 'active' && daysRemaining !== null && (
                                            <div className={`${daysRemaining < 0
                                                    ? 'bg-red-50 border-red-200'
                                                    : daysRemaining <= 3
                                                        ? 'bg-yellow-50 border-yellow-200'
                                                        : 'bg-blue-50 border-blue-200'
                                                } border p-2 rounded-lg mb-3`}>
                                                <p className={`text-sm ${daysRemaining < 0
                                                        ? 'text-red-700'
                                                        : daysRemaining <= 3
                                                            ? 'text-yellow-700'
                                                            : 'text-blue-700'
                                                    }`}>
                                                    {daysRemaining < 0 ? (
                                                        <strong>⚠️ Overdue by {Math.abs(daysRemaining)} days</strong>
                                                    ) : daysRemaining === 0 ? (
                                                        <strong>⏰ Due today!</strong>
                                                    ) : (
                                                        <strong>{daysRemaining} days remaining</strong>
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {/* ACTIONS */}
                                        {loan.status === 'active' && (
                                            <button
                                                onClick={() => handleReturnBook(loan._id)}
                                                disabled={returningLoanId === loan._id}
                                                className='btn-dark py-1! px-4! text-sm rounded-md disabled:opacity-50'
                                            >
                                                {returningLoanId === loan._id ? 'Returning...' : 'Return Book'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* STACK INDICATOR */}
                                {index === 0 && loans.length > 1 && (
                                    <div className='mt-3 pt-3 border-t border-gray-200'>
                                        <p className='text-xs text-gray-500'>
                                            <strong>Stack (LIFO):</strong> Showing most recent loan first
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* INFO BOX */}
            <div className='mt-8 bg-linear-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200'>
                <h5 className='h5 mb-3'>How Loans Work (Stack - LIFO)</h5>
                <ul className='space-y-2 text-sm'>
                    <li className='flex items-start gap-2'>
                        <span className='text-blue-600'>•</span>
                        <p>Loans are managed as a <strong>Stack (LIFO)</strong> - Last In, First Out</p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-blue-600'>•</span>
                        <p>Your most recent loan appears first in the list</p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-blue-600'>•</span>
                        <p>Each loan has a <strong>14-day</strong> due date from the loan date</p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-blue-600'>•</span>
                        <p>When you return a book, our system uses <strong>Binary Search</strong> to verify the loan and update stock</p>
                    </li>
                    <li className='flex items-start gap-2'>
                        <span className='text-blue-600'>•</span>
                        <p>Overdue books may incur late fees</p>
                    </li>
                </ul>
            </div>
        </div>
    )
}

export default MyLoans