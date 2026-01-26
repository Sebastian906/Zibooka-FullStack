import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../../context/ShopContext'
import toast from 'react-hot-toast'
import Title from '../../components/Title'
import { FaPlus, FaBook, FaExclamationTriangle, FaChartLine, FaGlobe } from 'react-icons/fa'

const Shelves = () => {
    const context = useContext(ShopContext)

    if (!context) {
        return (
            <div className='px-2 sm:px-6 py-12 mt-2 h-[97vh] bg-primary overflow-y-scroll lg:w-4/5 rounded-xl'>
                <div className='flexCenter h-full'>
                    <p className='text-red-600'>Error: Context not available</p>
                </div>
            </div>
        )
    }

    const {
        shelves = [],
        books = [],
        currency = '$',
        fetchShelves,
        createShelf,
        assignBookToShelf,
        removeBookFromShelf,
        findDangerousCombinations,
        optimizeShelf
    } = context

    const [selectedShelf, setSelectedShelf] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [showDangerousModal, setShowDangerousModal] = useState(false)
    const [showOptimizeModal, setShowOptimizeModal] = useState(false)
    const [dangerousCombinations, setDangerousCombinations] = useState([])
    const [optimizedResult, setOptimizedResult] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // NUEVOS ESTADOS para modos de análisis
    const [analyzeAllDangerous, setAnalyzeAllDangerous] = useState(false)
    const [analyzeAllOptimize, setAnalyzeAllOptimize] = useState(false)
    const [groupedByCategory, setGroupedByCategory] = useState(null)

    const [newShelf, setNewShelf] = useState({
        code: '',
        location: '',
        maxWeight: 8,
        description: ''
    })
    const [selectedBookId, setSelectedBookId] = useState('')

    useEffect(() => {
        const loadShelves = async () => {
            try {
                setIsLoading(true)
                if (fetchShelves) {
                    await fetchShelves()
                }
            } catch (error) {
                console.error('Error loading shelves:', error)
                toast.error('Error loading shelves')
            } finally {
                setIsLoading(false)
            }
        }

        loadShelves()
    }, [])

    const handleCreateShelf = async () => {
        if (!newShelf.code || !newShelf.location) {
            toast.error('Please fill required fields')
            return
        }

        setIsLoading(true)
        const result = await createShelf(newShelf)
        setIsLoading(false)

        if (result.success) {
            toast.success(result.message)
            setShowCreateModal(false)
            setNewShelf({ code: '', location: '', maxWeight: 8, description: '' })
        } else {
            toast.error(result.message)
        }
    }

    const handleAssignBook = async () => {
        if (!selectedBookId) {
            toast.error('Please select a book')
            return
        }

        setIsLoading(true)
        const result = await assignBookToShelf(selectedShelf._id, selectedBookId)
        setIsLoading(false)

        if (result.success) {
            toast.success(result.message)
            setShowAssignModal(false)
            setSelectedBookId('')
        } else {
            toast.error(result.message)
        }
    }

    const handleRemoveBook = async (shelfId, bookId) => {
        const result = await removeBookFromShelf(shelfId, bookId)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    // FUNCIÓN MEJORADA - Fuerza Bruta
    const handleFindDangerous = async (shelf) => {
        setSelectedShelf(shelf)
        setAnalyzeAllDangerous(false) // Resetear modo
        setShowDangerousModal(true)
    }

    const executeDangerousSearch = async () => {
        toast.loading('Searching dangerous combinations...')
        const result = await findDangerousCombinations(selectedShelf._id, analyzeAllDangerous)
        toast.dismiss()

        if (result.success) {
            setDangerousCombinations(result.combinations)
            setGroupedByCategory(result.groupedByCategory)

            if (result.count === 0) {
                toast.info('No dangerous combinations found')
            } else {
                toast.success(`Found ${result.count} dangerous combinations`)
            }
        } else {
            toast.error(result.message)
        }
    }

    // FUNCIÓN MEJORADA - Backtracking
    const handleOptimize = async (shelf) => {
        setSelectedShelf(shelf)
        setAnalyzeAllOptimize(false) // Resetear modo
        setShowOptimizeModal(true)
    }

    const executeOptimization = async () => {
        toast.loading('Optimizing shelf...')
        const result = await optimizeShelf(selectedShelf._id, analyzeAllOptimize)
        toast.dismiss()

        if (result.success) {
            setOptimizedResult(result)
            toast.success('Optimization completed')
        } else {
            toast.error(result.message)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'safe': return 'bg-green-100 text-green-700'
            case 'at-risk': return 'bg-yellow-100 text-yellow-700'
            case 'overloaded': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const availableBooks = books.filter(book =>
        !book.shelfLocation && book.pageCount
    )

    const locationCategories = [
        'Fiction Section',
        'Non-Fiction Section',
        'Academic Section',
        'Children Section',
        'History Section',
        'Science Section',
        'Adventure Section',
        'Business Section',
        'Health Section',
        'Horror Section'
    ]

    // Renderizar categorías agrupadas
    const renderGroupedCategories = () => {
        if (!groupedByCategory) return null

        return (
            <div className='bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4'>
                <h5 className='h5 mb-3 text-blue-800'>Combinations by Category:</h5>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                    {Object.entries(groupedByCategory).map(([category, count]) => (
                        <div key={category} className='bg-white p-3 rounded-lg border border-blue-100'>
                            <p className='font-semibold text-sm'>{category}</p>
                            <p className='text-blue-600 text-lg font-bold'>{count} combinations</p>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className='px-2 sm:px-6 py-12 mt-2 h-[97vh] bg-primary overflow-y-scroll lg:w-4/5 rounded-xl'>
            <div className='flexBetween mb-6'>
                <Title
                    title1="Shelf"
                    title2="Management"
                    title1Styles="pb-2"
                    paraStyles="hidden"
                />
                <button
                    onClick={() => setShowCreateModal(true)}
                    className='btn-secondary flexCenter gap-2'
                >
                    <FaPlus /> Create Shelf
                </button>
            </div>

            {isLoading && shelves.length === 0 ? (
                <div className='flexCenter h-64'>
                    <div className='animate-spin h-12 w-12 border-4 border-gray-300 border-t-secondary rounded-full' />
                </div>
            ) : shelves.length === 0 ? (
                <div className='flexCenter flex-col h-64 bg-white rounded-xl ring-1 ring-slate-900/5'>
                    <FaBook className='text-6xl text-gray-300 mb-4' />
                    <h3 className='h3 text-gray-600 mb-2'>No shelves yet</h3>
                    <p className='text-gray-500 mb-4'>Create your first shelf to start organizing books</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className='btn-secondary flexCenter gap-2'
                    >
                        <FaPlus /> Create First Shelf
                    </button>
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {shelves.map((shelf) => (
                        <div key={shelf._id} className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5'>
                            <div className='flexBetween mb-3'>
                                <div>
                                    <h3 className='h3 text-secondary'>{shelf.code}</h3>
                                    <p className='text-sm text-gray-600'>{shelf.location}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(shelf.status)}`}>
                                    {shelf.status || 'available'}
                                </span>
                            </div>

                            <div className='space-y-2 mb-4'>
                                <div className='flexBetween text-sm'>
                                    <span>Weight:</span>
                                    <span className='font-semibold'>
                                        {(shelf.currentWeight || 0).toFixed(2)} / {shelf.maxWeight} Kg
                                    </span>
                                </div>
                                <div className='w-full bg-gray-200 rounded-full h-2'>
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${(shelf.currentWeight || 0) / shelf.maxWeight > 0.8
                                            ? 'bg-red-500'
                                            : (shelf.currentWeight || 0) / shelf.maxWeight > 0.6
                                                ? 'bg-yellow-500'
                                                : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(((shelf.currentWeight || 0) / shelf.maxWeight) * 100, 100)}%` }}
                                    />
                                </div>
                                <div className='flexBetween text-sm'>
                                    <span>Value:</span>
                                    <span className='font-semibold'>{currency}{shelf.currentValue || 0}</span>
                                </div>
                                <div className='flexBetween text-sm'>
                                    <span>Books:</span>
                                    <span className='font-semibold'>{shelf.books?.length || 0}</span>
                                </div>
                            </div>

                            <div className='flex flex-wrap gap-2'>
                                <button
                                    onClick={() => {
                                        setSelectedShelf(shelf)
                                        setShowAssignModal(true)
                                    }}
                                    className='btn-light py-1! px-3! text-xs flexCenter gap-1'
                                >
                                    <FaBook /> Assign
                                </button>
                                <button
                                    onClick={() => handleFindDangerous(shelf)}
                                    className='btn-white py-1! px-3! text-xs flexCenter gap-1'
                                >
                                    <FaExclamationTriangle /> Dangerous
                                </button>
                                <button
                                    onClick={() => handleOptimize(shelf)}
                                    className='btn-secondary py-1! px-3! text-xs flexCenter gap-1'
                                >
                                    <FaChartLine /> Optimize
                                </button>
                            </div>

                            {shelf.books && shelf.books.length > 0 && (
                                <div className='mt-4 pt-4 border-t border-gray-300'>
                                    <h5 className='h5 mb-2'>Books on shelf:</h5>
                                    <div className='space-y-2 max-h-40 overflow-y-auto'>
                                        {shelf.books.map((book) => (
                                            <div key={book._id} className='flexBetween text-xs bg-primary p-2 rounded'>
                                                <div className='flex-1'>
                                                    <p className='font-medium line-clamp-1'>{book.name}</p>
                                                    <p className='text-gray-600'>
                                                        {book.pageCount} pages • {((book.pageCount || 0) * 0.005).toFixed(2)} Kg
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveBook(shelf._id, book._id)}
                                                    className='text-red-500 hover:text-red-700 ml-2 medium-14'
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Shelf Modal */}
            {showCreateModal && (
                <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flexCenter bg-black/50'>
                    <div className='bg-white p-6 rounded-xl max-w-md w-full mx-4'>
                        <h3 className='h3 mb-4'>Create New Shelf</h3>
                        <div className='space-y-4'>
                            <div>
                                <label className='block medium-14 mb-1'>Code *</label>
                                <input
                                    type="text"
                                    value={newShelf.code}
                                    onChange={(e) => setNewShelf({ ...newShelf, code: e.target.value.toUpperCase() })}
                                    placeholder='e.g., A1, B2, C3'
                                    className='w-full border border-gray-200 rounded p-2 outline-black/80'
                                />
                            </div>
                            <div>
                                <label className='block medium-14 mb-1'>Location/Category *</label>
                                <select
                                    value={newShelf.location}
                                    onChange={(e) => setNewShelf({ ...newShelf, location: e.target.value })}
                                    className='w-full border border-gray-200 rounded p-2 outline-black/80'
                                >
                                    <option value="">Select a category...</option>
                                    {locationCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <p className='text-xs text-gray-500 mt-1'>
                                    This represents the book category this shelf will hold
                                </p>
                            </div>
                            <div>
                                <label className='block medium-14 mb-1'>Max Weight (Kg)</label>
                                <input
                                    type="number"
                                    value={newShelf.maxWeight}
                                    onChange={(e) => setNewShelf({ ...newShelf, maxWeight: Number(e.target.value) })}
                                    className='w-full border border-gray-200 rounded p-2 outline-black/80'
                                    min="1"
                                    max="20"
                                />
                            </div>
                            <div>
                                <label className='block medium-14 mb-1'>Description</label>
                                <textarea
                                    value={newShelf.description}
                                    onChange={(e) => setNewShelf({ ...newShelf, description: e.target.value })}
                                    className='w-full border border-gray-200 rounded p-2 outline-black/80'
                                    rows="2"
                                    placeholder='Optional notes about this shelf...'
                                />
                            </div>
                            <div className='flex gap-2 mt-6'>
                                <button
                                    onClick={handleCreateShelf}
                                    disabled={isLoading}
                                    className='btn-secondary flex-1 rounded-md!'
                                >
                                    {isLoading ? 'Creating...' : 'Create'}
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className='btn-white flex-1 rounded-md!'
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Book Modal */}
            {showAssignModal && selectedShelf && (
                <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flexCenter bg-black/50'>
                    <div className='bg-white p-6 rounded-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto'>
                        <h3 className='h3 mb-4'>Assign Book to {selectedShelf.code}</h3>
                        <div className='space-y-4'>
                            <div>
                                <label className='block medium-14 mb-2'>Select Book</label>
                                <select
                                    value={selectedBookId}
                                    onChange={(e) => setSelectedBookId(e.target.value)}
                                    className='w-full border border-gray-200 rounded p-2 outline-black/80'
                                >
                                    <option value="">Choose a book...</option>
                                    {availableBooks.map((book) => (
                                        <option key={book._id} value={book._id}>
                                            {book.name} ({((book.pageCount || 0) * 0.005).toFixed(2)} Kg)
                                        </option>
                                    ))}
                                </select>
                                <p className='text-xs text-gray-500 mt-1'>
                                    {availableBooks.length} books available (not assigned to any shelf)
                                </p>
                            </div>
                            <div className='flex gap-2 mt-6'>
                                <button
                                    onClick={handleAssignBook}
                                    disabled={isLoading}
                                    className='btn-secondary flex-1 rounded-md!'
                                >
                                    {isLoading ? 'Assigning...' : 'Assign'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAssignModal(false)
                                        setSelectedBookId('')
                                    }}
                                    className='btn-white flex-1 rounded-md!'
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MEJORADO - Dangerous Combinations */}
            {showDangerousModal && selectedShelf && (
                <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flexCenter bg-black/50 p-4'>
                    <div className='bg-white p-6 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto'>
                        <h3 className='h3 mb-2 flexCenter gap-2'>
                            <FaExclamationTriangle className='text-red-500' />
                            Dangerous Combinations (Brute Force)
                        </h3>
                        <p className='text-sm text-gray-600 mb-4'>
                            Combinations of 4 books exceeding 8 Kg weight limit
                        </p>

                        {/* NUEVO: Selector de modo */}
                        <div className='bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4'>
                            <label className='flex items-center gap-3 cursor-pointer'>
                                <input
                                    type="checkbox"
                                    checked={analyzeAllDangerous}
                                    onChange={(e) => setAnalyzeAllDangerous(e.target.checked)}
                                    className='w-4 h-4 cursor-pointer'
                                />
                                <div className='flex items-center gap-2'>
                                    <FaGlobe className='text-blue-600' />
                                    <div>
                                        <p className='font-semibold text-sm'>Analyze ALL books in system</p>
                                        <p className='text-xs text-gray-600'>
                                            {analyzeAllDangerous
                                                ? 'Will analyze all books grouped by category'
                                                : `Currently analyzing only books on shelf ${selectedShelf.code}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </label>
                            <button
                                onClick={executeDangerousSearch}
                                className='btn-secondary w-full mt-3 rounded-md!'
                            >
                                {analyzeAllDangerous ? 'Analyze All Books' : 'Analyze This Shelf'}
                            </button>
                        </div>

                        {/* Mostrar agrupación por categoría */}
                        {renderGroupedCategories()}

                        {/* Resultados */}
                        <div className='space-y-4'>
                            {dangerousCombinations.length > 0 ? (
                                dangerousCombinations.map((combo, index) => (
                                    <div key={index} className='border border-red-200 bg-red-50 p-4 rounded-xl'>
                                        <div className='flexBetween mb-2'>
                                            <div>
                                                <h5 className='font-semibold text-red-700'>Combination #{index + 1}</h5>
                                                {combo.category && (
                                                    <p className='text-xs text-red-600'>Category: {combo.category}</p>
                                                )}
                                            </div>
                                            <span className='text-red-700 font-bold'>
                                                Total: {combo.totalWeight} Kg
                                            </span>
                                        </div>
                                        <div className='grid grid-cols-2 gap-2'>
                                            {combo.books.map((book, i) => (
                                                <div key={i} className='text-sm bg-white p-2 rounded'>
                                                    <p className='font-medium line-clamp-1'>{book.name}</p>
                                                    <p className='text-gray-600'>{book.weight} Kg • {book.category}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className='text-center text-gray-500 py-8'>
                                    {dangerousCombinations.length === 0 && groupedByCategory === null
                                        ? 'Click "Analyze" button to search for dangerous combinations'
                                        : 'No dangerous combinations found'
                                    }
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setShowDangerousModal(false)
                                setDangerousCombinations([])
                                setGroupedByCategory(null)
                            }}
                            className='btn-white w-full mt-4 rounded-md'
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL MEJORADO - Optimize */}
            {showOptimizeModal && selectedShelf && (
                <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flexCenter bg-black/50 p-4'>
                    <div className='bg-white p-6 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto'>
                        <h3 className='h3 mb-4 flexCenter gap-2'>
                            <FaChartLine className='text-green-500' />
                            Optimized Shelf (Backtracking)
                        </h3>

                        {/* NUEVO: Selector de modo */}
                        <div className='bg-green-50 border border-green-200 p-4 rounded-xl mb-4'>
                            <label className='flex items-center gap-3 cursor-pointer'>
                                <input
                                    type="checkbox"
                                    checked={analyzeAllOptimize}
                                    onChange={(e) => setAnalyzeAllOptimize(e.target.checked)}
                                    className='w-4 h-4 cursor-pointer'
                                />
                                <div className='flex items-center gap-2'>
                                    <FaGlobe className='text-green-600' />
                                    <div>
                                        <p className='font-semibold text-sm'>Analyze ALL available books</p>
                                        <p className='text-xs text-gray-600'>
                                            {analyzeAllOptimize
                                                ? 'Will recommend best books from unassigned inventory'
                                                : `Will optimize current selection on shelf ${selectedShelf.code}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </label>
                            <button
                                onClick={executeOptimization}
                                className='btn-secondary w-full mt-3 rounded-md!'
                            >
                                {analyzeAllOptimize ? 'Find Best Available Books' : 'Optimize Current Shelf'}
                            </button>
                        </div>

                        {/* Resultados */}
                        {(optimizedResult && (
                            <>
                                {/* Recomendación */}
                                {optimizedResult.recommendation && (
                                    <div className='bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4'>
                                        <p className='text-sm font-medium text-blue-800'>
                                            {optimizedResult.recommendation}
                                        </p>
                                    </div>
                                )}

                                {/* Comparación actual vs óptimo */}
                                {optimizedResult.currentVsOptimal && (
                                    <div className='bg-linear-to-r from-yellow-50 to-green-50 border border-green-200 p-4 rounded-xl mb-4'>
                                        <h5 className='h5 mb-3'>Current vs Optimal Comparison:</h5>
                                        <div className='grid grid-cols-2 gap-4'>
                                            <div className='bg-white p-3 rounded-lg border'>
                                                <p className='text-xs text-gray-600 mb-1'>Current State</p>
                                                <p className='text-lg font-bold'>{currency}{optimizedResult.currentVsOptimal.current.value}</p>
                                                <p className='text-xs text-gray-600'>
                                                    {optimizedResult.currentVsOptimal.current.books} books • {optimizedResult.currentVsOptimal.current.weight} Kg
                                                </p>
                                            </div>
                                            <div className='bg-green-100 p-3 rounded-lg border border-green-300'>
                                                <p className='text-xs text-green-800 mb-1'>Optimal State</p>
                                                <p className='text-lg font-bold text-green-700'>{currency}{optimizedResult.currentVsOptimal.optimal.value}</p>
                                                <p className='text-xs text-green-700'>
                                                    {optimizedResult.currentVsOptimal.optimal.books} books • {optimizedResult.currentVsOptimal.optimal.weight} Kg
                                                </p>
                                            </div>
                                        </div>
                                        <div className='text-center mt-3 p-2 bg-green-600 text-white rounded-lg'>
                                            <p className='font-bold'>Potential Improvement: {optimizedResult.currentVsOptimal.improvement}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Estadísticas principales */}
                                <div className='bg-green-50 border border-green-200 p-4 rounded-xl mb-4'>
                                    <div className='grid grid-cols-3 gap-4 text-center'>
                                        <div>
                                            <p className='text-sm text-gray-600'>Total Weight</p>
                                            <p className='text-2xl font-bold text-green-700'>
                                                {optimizedResult.bestCombination.totalWeight} Kg
                                            </p>
                                            <p className='text-xs text-gray-500'>
                                                Max: {optimizedResult.maxWeight} Kg
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-sm text-gray-600'>Total Value</p>
                                            <p className='text-2xl font-bold text-green-700'>
                                                {currency}{optimizedResult.bestCombination.totalValue}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-sm text-gray-600'>Books</p>
                                            <p className='text-2xl font-bold text-green-700'>
                                                {optimizedResult.bestCombination.books.length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de libros */}
                                <h5 className='h5 mb-2'>
                                    {analyzeAllOptimize ? 'Recommended Books:' : 'Optimal Book Selection:'}
                                </h5>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                    {optimizedResult.bestCombination.books.map((book, i) => (
                                        <div key={i} className='bg-white border p-3 rounded-lg'>
                                            <p className='font-medium line-clamp-1'>{book.name}</p>
                                            <div className='flexBetween text-sm text-gray-600 mt-1'>
                                                <span>{book.weight} Kg • {book.category}</span>
                                                <span className='font-bold text-green-600'>{currency}{book.offerPrice}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )) || (
                                <p className='text-center text-gray-500 py-8'>
                                    Click "Optimize" button to find the best book combination
                                </p>
                            )}
                        <button
                            onClick={() => {
                                setShowOptimizeModal(false)
                                setOptimizedResult(null)
                            }}
                            className='btn-white w-full mt-4 rounded-md!'
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Shelves