import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../../context/ShopContext'
import Title from '../../components/Title'
import { FaBook, FaCheckCircle, FaClock, FaExclamationTriangle, FaSearch } from 'react-icons/fa'

const AdminLoans = () => {
    const { user, navigate, getAllLoans } = useContext(ShopContext)
    const [loans, setLoans] = useState([])
    const [filteredLoans, setFilteredLoans] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')

    const loadAllLoans = async () => {
        try {
            setLoading(true)
            const loansData = await getAllLoans()
            setLoans(loansData)
            setFilteredLoans(loansData)
        } catch (error) {
            console.error('Error loading loans:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAllLoans()
    }, [user])

    useEffect(() => {
        let filtered = loans

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(loan => loan.status === filterStatus)
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(loan => {
                const bookName = loan.bookId?.name?.toLowerCase() || ''
                const userName = loan.userId?.name?.toLowerCase() || ''
                const userEmail = loan.userId?.email?.toLowerCase() || ''
                const search = searchTerm.toLowerCase()

                return bookName.includes(search) || userName.includes(search) || userEmail.includes(search)
            })
        }

        setFilteredLoans(filtered)
    }, [searchTerm, filterStatus, loans])

    const getStats = () => {
        return {
            total: loans.length,
            active: loans.filter(l => l.status === 'active').length,
            completed: loans.filter(l => l.status === 'completed').length,
            overdue: loans.filter(l => l.status === 'overdue').length,
        }
    }

    const stats = getStats()

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
                title1="All"
                title2="Loans"
                title1Styles="pb-4"
                paraStyles="mb-8"
                para="Manage all book loans in the system (Admin Panel)"
            />

            {/* STATISTICS */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                <div className='bg-primary p-4 rounded-xl text-center'>
                    <FaBook className='text-3xl mx-auto mb-2 text-secondary' />
                    <h3 className='h3'>{stats.total}</h3>
                    <p className='text-sm text-gray-600'>Total Loans</p>
                </div>
                <div className='bg-blue-50 p-4 rounded-xl text-center border border-blue-200 cursor-pointer'
                    onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}>
                    <FaClock className='text-3xl mx-auto mb-2 text-blue-600' />
                    <h3 className='h3 text-blue-700'>{stats.active}</h3>
                    <p className='text-sm text-blue-600'>Active</p>
                </div>
                <div className='bg-green-50 p-4 rounded-xl text-center border border-green-200 cursor-pointer'
                    onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}>
                    <FaCheckCircle className='text-3xl mx-auto mb-2 text-green-600' />
                    <h3 className='h3 text-green-700'>{stats.completed}</h3>
                    <p className='text-sm text-green-600'>Completed</p>
                </div>
                <div className='bg-red-50 p-4 rounded-xl text-center border border-red-200 cursor-pointer'
                    onClick={() => setFilterStatus(filterStatus === 'overdue' ? 'all' : 'overdue')}>
                    <FaExclamationTriangle className='text-3xl mx-auto mb-2 text-red-600' />
                    <h3 className='h3 text-red-700'>{stats.overdue}</h3>
                    <p className='text-sm text-red-600'>Overdue</p>
                </div>
            </div>

            {/* SEARCH AND FILTER */}
            <div className='flex flex-col md:flex-row gap-4 mb-6'>
                <div className='flex-1 relative'>
                    <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                    <input
                        type='text'
                        placeholder='Search by book, user name, or email...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary'
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary'
                >
                    <option value='all'>All Status</option>
                    <option value='active'>Active</option>
                    <option value='completed'>Completed</option>
                    <option value='overdue'>Overdue</option>
                </select>
            </div>

            {/* LOANS LIST */}
            {filteredLoans.length === 0 ? (
                <div className='bg-white p-12 rounded-xl text-center ring-1 ring-slate-900/5'>
                    <FaBook className='text-6xl text-gray-300 mx-auto mb-4' />
                    <h3 className='h3 text-gray-600 mb-2'>No loans found</h3>
                    <p className='text-gray-500'>
                        {searchTerm || filterStatus !== 'all'
                            ? 'Try adjusting your filters'
                            : 'No loans in the system yet'}
                    </p>
                </div>
            ) : (
                <div className='space-y-4'>
                    {filteredLoans.map((loan) => {
                        const book = loan.bookId
                        const borrower = loan.userId

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
                                            <div>
                                                <h4 className='h4 line-clamp-1'>{book?.name || 'Unknown Book'}</h4>
                                                <p className='text-sm text-gray-600'>
                                                    Borrowed by: <strong>{borrower?.name || 'Unknown'}</strong> ({borrower?.email || '-'})
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(loan.status)}`}>
                                                {loan.status}
                                            </span>
                                        </div>

                                        <div className='grid grid-cols-1 md:grid-cols-4 gap-2 text-sm'>
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
                                            <div>
                                                <p className='text-gray-500'>Loan ID:</p>
                                                <p className='font-medium text-xs'>{loan._id.slice(-8)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* INFO */}
            <div className='mt-8 bg-linear-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200'>
                <p className='text-sm text-gray-700'>
                    <strong>Admin Panel:</strong> Showing all loans sorted by most recent first (Stack - LIFO).
                    Click on status cards to filter results.
                </p>
            </div>
        </div>
    )
}

export default AdminLoans