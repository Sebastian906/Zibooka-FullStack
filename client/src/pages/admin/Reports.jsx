import { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../../context/ShopContext';
import Title from '../../components/Title';
import { FaFilePdf, FaFileExcel, FaBook, FaFilter, FaCalendar } from 'react-icons/fa';
import { TbPackage } from 'react-icons/tb';
import { BiTrendingUp } from 'react-icons/bi';

const Reports = () => {
    const {
        reportLoading,
        downloadInventoryPDF,
        downloadInventoryXLSX,
        downloadLoansPDF,
        downloadLoansXLSX,
        getRecursionPreview
    } = useContext(ShopContext);

    // Filter states
    const [inventoryCategory, setInventoryCategory] = useState('');
    const [loansDateFrom, setLoansDateFrom] = useState('');
    const [loansDateTo, setLoansDateTo] = useState('');
    const [recursionData, setRecursionData] = useState([]);
    const [loadingRecursion, setLoadingRecursion] = useState(false);

    // Available categories
    const categories = ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'];

    // Load recursion data on mount
    useEffect(() => {
        loadRecursionData();
    }, []);

    const loadRecursionData = async () => {
        setLoadingRecursion(true);
        const data = await getRecursionPreview();
        setRecursionData(data);
        setLoadingRecursion(false);
    };

    // Inventory report handlers
    const handleDownloadInventoryPDF = () => {
        downloadInventoryPDF(inventoryCategory);
    };

    const handleDownloadInventoryXLSX = () => {
        downloadInventoryXLSX(inventoryCategory);
    };

    // Loan report handlers
    const handleDownloadLoansPDF = () => {
        downloadLoansPDF(loansDateFrom, loansDateTo);
    };

    const handleDownloadLoansXLSX = () => {
        downloadLoansXLSX(loansDateFrom, loansDateTo);
    };

    // Reset filters
    const resetInventoryFilters = () => {
        setInventoryCategory('');
    };

    const resetLoansFilters = () => {
        setLoansDateFrom('');
        setLoansDateTo('');
    };

    return (
        <div className='px-2 sm:px-6 py-12 mt-2 h-[97vh] bg-primary overflow-y-scroll lg:w-4/5 rounded-xl'>
            {/* MAIN TITLE */}
            <Title
                title1="Reports"
                title2="& Analytics"
                titleStyles="pb-6"
                paraStyles="pb-8"
                para="Generate comprehensive reports with recursion analysis and export to PDF or Excel formats."
            />

            {/* MAIN GRID */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>

                {/* SECTION 1: INVENTORY REPORTS */}
                <div className='bg-white p-5 rounded-xl ring-1 ring-slate-900/5'>
                    <div className='flex items-center gap-2 mb-3'>
                        <TbPackage className='text-xl text-green-600' />
                        <h5 className='h5'>Inventory Reports</h5>
                    </div>

                    <p className='text-sm text-gray-600 mb-4'>
                        Generate complete inventory reports with recursive analysis of values and weights by category.
                    </p>

                    {/* INVENTORY FILTERS */}
                    <div className='mb-4 p-3 bg-primary rounded-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                            <FaFilter className='text-sm text-gray-600' />
                            <label className='text-sm font-medium'>Filter by category:</label>
                        </div>
                        <div className='flex gap-2'>
                            <select
                                value={inventoryCategory}
                                onChange={(e) => setInventoryCategory(e.target.value)}
                                className='flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-secondary'
                            >
                                <option value="">All categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            {inventoryCategory && (
                                <button
                                    onClick={resetInventoryFilters}
                                    className='px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50'
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {inventoryCategory && (
                            <p className='text-xs text-blue-600 mt-2 flex items-center gap-1'>
                                <BiTrendingUp />
                                Recursion analysis will be included
                            </p>
                        )}
                    </div>

                    {/* DOWNLOAD BUTTONS - INVENTORY */}
                    <div className='flex gap-2'>
                        <button
                            onClick={handleDownloadInventoryPDF}
                            disabled={reportLoading}
                            className='flex-1 flexCenter gap-2 bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                        >
                            <FaFilePdf />
                            {reportLoading ? 'Generating...' : 'PDF'}
                        </button>
                        <button
                            onClick={handleDownloadInventoryXLSX}
                            disabled={reportLoading}
                            className='flex-1 flexCenter gap-2 bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                        >
                            <FaFileExcel />
                            {reportLoading ? 'Generating...' : 'Excel'}
                        </button>
                    </div>
                </div>

                {/* SECTION 2: LOAN REPORTS */}
                <div className='bg-white p-5 rounded-xl ring-1 ring-slate-900/5'>
                    <div className='flex items-center gap-2 mb-3'>
                        <FaBook className='text-xl text-blue-600' />
                        <h5 className='h5'>Loan Reports</h5>
                    </div>

                    <p className='text-sm text-gray-600 mb-4'>
                        Detailed loan reports with statistics and return analysis.
                    </p>

                    {/* LOAN FILTERS */}
                    <div className='mb-4 p-3 bg-primary rounded-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                            <FaCalendar className='text-sm text-gray-600' />
                            <label className='text-sm font-medium'>Filter by date range:</label>
                        </div>
                        <div className='space-y-2'>
                            <div>
                                <label className='text-xs text-gray-600 mb-1 block'>From:</label>
                                <input
                                    type="date"
                                    value={loansDateFrom}
                                    onChange={(e) => setLoansDateFrom(e.target.value)}
                                    className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-secondary'
                                />
                            </div>
                            <div>
                                <label className='text-xs text-gray-600 mb-1 block'>To:</label>
                                <input
                                    type="date"
                                    value={loansDateTo}
                                    onChange={(e) => setLoansDateTo(e.target.value)}
                                    className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-secondary'
                                />
                            </div>
                            {(loansDateFrom || loansDateTo) && (
                                <button
                                    onClick={resetLoansFilters}
                                    className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50'
                                >
                                    Clear dates
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DOWNLOAD BUTTONS - LOANS */}
                    <div className='flex gap-2'>
                        <button
                            onClick={handleDownloadLoansPDF}
                            disabled={reportLoading}
                            className='flex-1 flexCenter gap-2 bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                        >
                            <FaFilePdf />
                            {reportLoading ? 'Generating...' : 'PDF'}
                        </button>
                        <button
                            onClick={handleDownloadLoansXLSX}
                            disabled={reportLoading}
                            className='flex-1 flexCenter gap-2 bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                        >
                            <FaFileExcel />
                            {reportLoading ? 'Generating...' : 'Excel'}
                        </button>
                    </div>
                </div>
            </div>

            {/* SECTION 3: RECURSION ANALYSIS */}
            <div className='bg-white p-5 rounded-xl ring-1 ring-slate-900/5 mb-6'>
                <div className='flexBetween mb-4'>
                    <div className='flex items-center gap-2'>
                        <BiTrendingUp className='text-xl text-secondary' />
                        <div>
                            <h5 className='h5'>Recursive Analysis by Category</h5>
                            <p className='text-xs text-gray-600 mt-0.5'>
                                Total values and average weights calculated recursively
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={loadRecursionData}
                        disabled={loadingRecursion}
                        className='bg-secondary text-white px-4 py-2 rounded text-sm font-medium hover:bg-secondary/90 disabled:opacity-50 transition-all'
                    >
                        {loadingRecursion ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {loadingRecursion ? (
                    <div className='flexCenter py-12'>
                        <div className='animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-secondary' />
                    </div>
                ) : recursionData.length > 0 ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {recursionData.map((item) => (
                            <div
                                key={item.category}
                                className='border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'
                            >
                                <h5 className='medium-15 mb-3 pb-2 border-b border-gray-200'>
                                    {item.category}
                                </h5>

                                {/* Stack Recursion - Value */}
                                <div className='mb-3'>
                                    <p className='text-xs font-semibold text-blue-600 mb-1.5 flex items-center gap-1'>
                                        <TbPackage className='text-sm' />
                                        Stack Recursion
                                    </p>
                                    <div className='space-y-1 text-xs'>
                                        <div className='flexBetween'>
                                            <span className='text-gray-600'>Books:</span>
                                            <span className='font-medium'>{item.value.bookCount}</span>
                                        </div>
                                        <div className='flexBetween'>
                                            <span className='text-gray-600'>Total value:</span>
                                            <span className='font-medium text-green-600'>
                                                ${item.value.total.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className='flexBetween'>
                                            <span className='text-gray-600'>Average:</span>
                                            <span className='font-medium'>
                                                ${Math.round(item.value.average).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tail Recursion - Weight */}
                                <div className='pt-3 border-t border-gray-200'>
                                    <p className='text-xs font-semibold text-purple-600 mb-1.5 flex items-center gap-1'>
                                        <BiTrendingUp className='text-sm' />
                                        Tail Recursion
                                    </p>
                                    <div className='space-y-1 text-xs'>
                                        <div className='flexBetween'>
                                            <span className='text-gray-600'>Books:</span>
                                            <span className='font-medium'>{item.weight.bookCount}</span>
                                        </div>
                                        <div className='flexBetween'>
                                            <span className='text-gray-600'>Total weight:</span>
                                            <span className='font-medium text-orange-600'>
                                                {item.weight.total.toFixed(3)} Kg
                                            </span>
                                        </div>
                                        <div className='flexBetween'>
                                            <span className='text-gray-600'>Average:</span>
                                            <span className='font-medium'>
                                                {item.weight.average.toFixed(3)} Kg
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className='text-center py-12 text-gray-400'>
                        <BiTrendingUp className='text-5xl mx-auto mb-2' />
                        <p className='text-sm'>No recursion data available</p>
                    </div>
                )}
            </div>

            {/* ADDITIONAL INFORMATION */}
            <div className='bg-linear-to-r from-blue-50 to-purple-50 p-5 rounded-xl border border-blue-200'>
                <div className='flex items-start gap-2 mb-3'>
                    <BiTrendingUp className='text-lg text-blue-600 mt-0.5' />
                    <h5 className='medium-15 text-blue-900'>About Reports</h5>
                </div>
                <ul className='space-y-1.5 text-xs text-blue-800 ml-6'>
                    <li className='list-disc'>
                        <strong>PDF Reports:</strong> Include detailed tables, statistics, and recursive analysis when filtered by category.
                    </li>
                    <li className='list-disc'>
                        <strong>Excel Reports:</strong> Contain active formulas for dynamic analysis, multiple sheets, and professional formatting.
                    </li>
                    <li className='list-disc'>
                        <strong>Stack Recursion:</strong> Calculates total book value using traditional recursion (LIFO).
                    </li>
                    <li className='list-disc'>
                        <strong>Tail Recursion:</strong> Calculates average weight using optimized tail recursion (1 page = 0.005 Kg).
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Reports;