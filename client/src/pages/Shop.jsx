import { useContext, useEffect, useState } from 'react'
import Title from '../components/Title'
import { ShopContext } from '../context/ShopContext'
import Item from '../components/Item';
import { FaChevronDown, FaSearch } from 'react-icons/fa';

const Shop = () => {

    const { books, searchQuery, applyFiltersAndSort, availableCategories } = useContext(ShopContext);
    const [filteredBooks, setFilteredBooks] = useState([])
    const [currPage, setCurrPage] = useState(1)
    const itemsPerPage = 10

    // Filter and sort states
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [authorSearch, setAuthorSearch] = useState('') 
    const [sortBy, setSortBy] = useState('default')

    // Dropdown states
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [showSortDropdown, setShowSortDropdown] = useState(false)

    useEffect(() => {
        // Apply filters and sorting using context function
        const result = applyFiltersAndSort(books, {
            searchQuery,
            category: selectedCategory,
            authorSearch, // usar búsqueda de autor
            sortBy
        });

        setFilteredBooks(result);
        setCurrPage(1); // Reset to first page when filters change
    }, [books, searchQuery, selectedCategory, authorSearch, sortBy, applyFiltersAndSort]);

    const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currPage]);

    // Reset filters
    const handleResetFilters = () => {
        setSelectedCategory('all');
        setAuthorSearch('');
        setSortBy('default');
    };

    // Check if any filter is active
    const hasActiveFilters = selectedCategory !== 'all' ||
        authorSearch !== '' ||
        sortBy !== 'default';

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1={"All"}
                title2={"Books"}
                title1Styles={"pb-2"}
                paraStyles={"pb-6"}
                para={"Explore our collection of books across various genres, carefully curated to ignite your imagination and expand your horizons."}
            />

            {/* FILTERS AND SORTING SECTION */}
            <div className='mb-8'>
                {/* Filter Buttons Row */}
                <div className='flex flex-wrap items-center gap-3 mb-4'>
                    {/* Category Filter */}
                    <div className='relative'>
                        <button
                            onClick={() => {
                                setShowCategoryDropdown(!showCategoryDropdown);
                                setShowSortDropdown(false);
                            }}
                            className={`flexCenter gap-2 px-4 py-2 rounded-full text-xs ${selectedCategory !== 'all'
                                    ? 'bg-secondary text-white'
                                    : 'bg-primary hover:bg-primary/80'
                                } transition-all duration-300`}
                        >
                            <span>Category: {selectedCategory === 'all' ? 'All' : selectedCategory}</span>
                            <FaChevronDown className={`text-xs transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showCategoryDropdown && (
                            <div className='absolute top-12 left-0 bg-white ring-1 ring-slate-900/10 rounded-lg shadow-lg z-50 min-w-40 max-h-60 overflow-y-auto'>
                                <button
                                    onClick={() => {
                                        setSelectedCategory('all');
                                        setShowCategoryDropdown(false);
                                    }}
                                    className='w-full text-left px-4 py-2 text-xs hover:bg-primary transition-all'
                                >
                                    All Categories
                                </button>
                                {availableCategories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            setShowCategoryDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-primary transition-all ${selectedCategory === category ? 'bg-primary font-medium' : ''
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Author Search - NUEVO: Campo de búsqueda */}
                    <div className='relative'>
                        <div className='flexCenter gap-2 px-4 py-2 rounded-full text-xs bg-primary'>
                            <FaSearch className='text-xs text-gray-500' />
                            <input
                                type='text'
                                placeholder='Search by author...'
                                value={authorSearch}
                                onChange={(e) => setAuthorSearch(e.target.value)}
                                className='bg-transparent outline-none placeholder:text-gray-500 w-32'
                            />
                        </div>
                    </div>

                    {/* Sort By - SIMPLIFICADO */}
                    <div className='relative'>
                        <button
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                setShowCategoryDropdown(false);
                            }}
                            className={`flexCenter gap-2 px-4 py-2 rounded-full text-xs ${sortBy !== 'default'
                                    ? 'bg-secondary text-white'
                                    : 'bg-primary hover:bg-primary/80'
                                } transition-all duration-300`}
                        >
                            <span>
                                Sort: {
                                    sortBy === 'default' ? 'Default' :
                                        sortBy === 'price-asc' ? 'Price: Low to High' :
                                            sortBy === 'price-desc' ? 'Price: High to Low' :
                                                sortBy === 'title-asc' ? 'Title: A to Z' :
                                                    'Title: Z to A'
                                }
                            </span>
                            <FaChevronDown className={`text-xs transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showSortDropdown && (
                            <div className='absolute top-12 left-0 bg-white ring-1 ring-slate-900/10 rounded-lg shadow-lg z-50 min-w-52'>
                                <button
                                    onClick={() => {
                                        setSortBy('default');
                                        setShowSortDropdown(false);
                                    }}
                                    className='w-full text-left px-4 py-2 text-xs hover:bg-primary transition-all'
                                >
                                    Default
                                </button>
                                <button
                                    onClick={() => {
                                        setSortBy('price-asc');
                                        setShowSortDropdown(false);
                                    }}
                                    className='w-full text-left px-4 py-2 text-xs hover:bg-primary transition-all'
                                >
                                    Price: Low to High
                                </button>
                                <button
                                    onClick={() => {
                                        setSortBy('price-desc');
                                        setShowSortDropdown(false);
                                    }}
                                    className='w-full text-left px-4 py-2 text-xs hover:bg-primary transition-all'
                                >
                                    Price: High to Low
                                </button>
                                <button
                                    onClick={() => {
                                        setSortBy('title-asc');
                                        setShowSortDropdown(false);
                                    }}
                                    className='w-full text-left px-4 py-2 text-xs hover:bg-primary transition-all'
                                >
                                    Title: A to Z
                                </button>
                                <button
                                    onClick={() => {
                                        setSortBy('title-desc');
                                        setShowSortDropdown(false);
                                    }}
                                    className='w-full text-left px-4 py-2 text-xs hover:bg-primary transition-all'
                                >
                                    Title: Z to A
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Reset Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className='flexCenter gap-2 px-4 py-2 rounded-full text-xs bg-tertiary hover:bg-tertiary/80 transition-all duration-300'
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

                {/* Results Count */}
                <div className='text-xs text-gray-500'>
                    Showing {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
                    {searchQuery && ` for "${searchQuery}"`}
                </div>
            </div>

            {/* BOOKS GRID */}
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-8'>
                {filteredBooks.length > 0 ? (
                    filteredBooks
                        .slice((currPage - 1) * itemsPerPage, currPage * itemsPerPage)
                        .map((book) => (
                            <Item key={book._id} book={book} />
                        ))
                ) : (
                    <div className='col-span-full text-center py-12'>
                        <h4 className='h4 mb-2'>Oops! Nothing matched your search</h4>
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className='btn-secondary mt-4'
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className='flexCenter flex-wrap gap-2 sm:gap-4 mt-14 mb-10'>
                    <button
                        disabled={currPage === 1}
                        onClick={() => setCurrPage(prev => prev - 1)}
                        className={`${currPage === 1 && 'opacity-50 cursor-not-allowed'} btn-dark py-1! px-3!`}
                    >
                        Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => (
                        <button
                            key={index + 1}
                            onClick={() => setCurrPage(index + 1)}
                            className={`${currPage === index + 1 && 'bg-secondary text-white!'} btn-light py-1! px-3!`}
                        >
                            {index + 1}
                        </button>
                    ))}
                    <button
                        disabled={currPage === totalPages}
                        onClick={() => setCurrPage(prev => prev + 1)}
                        className={`${currPage === totalPages && 'opacity-50 cursor-not-allowed'} btn-white bg-tertiary py-1! px-3!`}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}

export default Shop