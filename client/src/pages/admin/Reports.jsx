import React, { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../context/ShopContext';
import { BiBarChartAlt, BiCalendar, BiDownload, BiInfoCircle, BiTrendingUp } from 'react-icons/bi';
import { IoFilter } from 'react-icons/io5';
import { TbFileText, TbPackage } from 'react-icons/tb';
import { RiBookOpenLine } from 'react-icons/ri';

const Reports = () => {
    const { reportLoading, downloadInventoryPDF, downloadInventoryXLSX, downloadLoansPDF, downloadLoansXLSX, getRecursionPreview } = useContext(ShopContext);

    // States for filters
    const [inventoryCategory, setInventoryCategory] = useState('');
    const [loansDateFrom, setLoansDateFrom] = useState('');
    const [loansDateTo, setLoansDateTo] = useState('');
    const [recursionData, setRecursionData] = useState([]);
    const [loadingRecursion, setLoadingRecursion] = useState(false);

    // Available categories
    const categories = ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'];

    // Load recursion data on component mount
    useEffect(() => {
        loadRecursionData();
    }, []);

    const loadRecursionData = async () => {
        setLoadingRecursion(true);
        const data = await getRecursionPreview();
        setRecursionData(data);
        setLoadingRecursion(false);
    };

    // Handlers for inventory downloads
    const handleDownloadInventoryPDF = () => {
        downloadInventoryPDF(inventoryCategory);
    };

    const handleDownloadInventoryXLSX = () => {
        downloadInventoryXLSX(inventoryCategory);
    };

    // Handlers for loans downloads
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
        <div>
            {/* Page Title */}
            <div className='flex items-center gap-2 text-2xl mb-5'>
                <BiBarChartAlt className='text-3xl' />
                <p>Reports & Analytics</p>
            </div>

            {/* Main Grid */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>

                {/* Section 1: Inventory Reports */}
                <div className='border rounded p-6'>
                    <div className='flex items-center gap-2 mb-4'>
                        <TbPackage className='text-2xl text-green-600' />
                        <h2 className='text-xl font-semibold'>Inventory Reports</h2>
                    </div>

                    <p className='text-gray-600 text-sm mb-4'>
                        Generate comprehensive inventory reports with recursive analysis of values and weights per category.
                    </p>

                    {/* Inventory filters */}
                    <div className='mb-4 p-3 bg-gray-50 rounded'>
                        <div className='flex items-center gap-2 mb-2'>
                            <IoFilter className='text-gray-600' />
                            <label className='text-sm font-medium'>Filter by category:</label>
                        </div>
                        <div className='flex gap-2'>
                            <select
                                value={inventoryCategory}
                                onChange={(e) => setInventoryCategory(e.target.value)}
                                className='flex-1 px-3 py-2 border rounded text-sm'
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
                                    className='px-3 py-2 text-sm border rounded hover:bg-gray-100'
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {inventoryCategory && (
                            <p className='text-xs text-blue-600 mt-2 flex items-center gap-1'>
                                <BiInfoCircle />
                                Recursive analysis will be included
                            </p>
                        )}
                    </div>

                    {/* Download buttons */}
                    <div className='flex gap-3'>
                        <button
                            onClick={handleDownloadInventoryPDF}
                            disabled={reportLoading}
                            className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium'
                        >
                            <TbFileText className='text-lg' />
                            {reportLoading ? 'Generating...' : 'Download PDF'}
                        </button>
                        <button
                            onClick={handleDownloadInventoryXLSX}
                            disabled={reportLoading}
                            className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium'
                        >
                            <BiDownload className='text-lg' />
                            {reportLoading ? 'Generating...' : 'Download Excel'}
                        </button>
                    </div>
                </div>

                {/* Section 2: Loans Reports */}
                <div className='border rounded p-6'>
                    <div className='flex items-center gap-2 mb-4'>
                        <RiBookOpenLine className='text-2xl text-blue-600' />
                        <h2 className='text-xl font-semibold'>Loans Reports</h2>
                    </div>

                    <p className='text-gray-600 text-sm mb-4'>
                        Detailed loan reports with statistics and return analysis.
                    </p>

                    {/* Loans filters */}
                    <div className='mb-4 p-3 bg-gray-50 rounded'>
                        <div className='flex items-center gap-2 mb-2'>
                            <BiCalendar className='text-gray-600' />
                            <label className='text-sm font-medium'>Filter by date range:</label>
                        </div>
                        <div className='space-y-2'>
                            <div>
                                <label className='text-xs text-gray-600 mb-1 block'>From:</label>
                                <input
                                    type="date"
                                    value={loansDateFrom}
                                    onChange={(e) => setLoansDateFrom(e.target.value)}
                                    className='w-full px-3 py-2 border rounded text-sm'
                                />
                            </div>
                            <div>
                                <label className='text-xs text-gray-600 mb-1 block'>To:</label>
                                <input
                                    type="date"
                                    value={loansDateTo}
                                    onChange={(e) => setLoansDateTo(e.target.value)}
                                    className='w-full px-3 py-2 border rounded text-sm'
                                />
                            </div>
                            {(loansDateFrom || loansDateTo) && (
                                <button
                                    onClick={resetLoansFilters}
                                    className='w-full px-3 py-2 text-sm border rounded hover:bg-gray-100'
                                >
                                    Clear dates
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Download buttons */}
                    <div className='flex gap-3'>
                        <button
                            onClick={handleDownloadLoansPDF}
                            disabled={reportLoading}
                            className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium'
                        >
                            <TbFileText className='text-lg' />
                            {reportLoading ? 'Generating...' : 'Download PDF'}
                        </button>
                        <button
                            onClick={handleDownloadLoansXLSX}
                            disabled={reportLoading}
                            className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium'
                        >
                            <BiDownload className='text-lg' />
                            {reportLoading ? 'Generating...' : 'Download Excel'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 3: Recursion Preview */}
            <div className='mt-8 border rounded p-6'>
                <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-2'>
                        <BiTrendingUp className='text-2xl text-purple-600' />
                        <div>
                            <h2 className='text-xl font-semibold'>Recursive Analysis by Category</h2>
                            <p className='text-gray-600 text-xs mt-0.5'>
                                Total values and average weights calculated recursively
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={loadRecursionData}
                        disabled={loadingRecursion}
                        className='px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium'
                    >
                        {loadingRecursion ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {loadingRecursion ? (
                    <div className='flex justify-center items-center py-12'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600'></div>
                    </div>
                ) : recursionData.length > 0 ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {recursionData.map((item) => (
                            <div
                                key={item.category}
                                className='border rounded p-4 hover:shadow-md transition-shadow'
                            >
                                <h3 className='font-semibold text-base mb-3 pb-2 border-b'>
                                    {item.category}
                                </h3>

                                {/* Stack Recursion - Value */}
                                <div className='mb-3'>
                                    <p className='text-xs font-semibold text-blue-600 mb-1.5 flex items-center gap-1'>
                                        <TbPackage className='text-sm' />
                                        Stack Recursion
                                    </p>
                                    <div className='space-y-1 text-xs'>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-600'>Books:</span>
                                            <span className='font-medium'>{item.value.bookCount}</span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-600'>Total value:</span>
                                            <span className='font-medium text-green-600'>
                                                ${item.value.total.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-600'>Average:</span>
                                            <span className='font-medium'>
                                                ${Math.round(item.value.average).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tail Recursion - Weight */}
                                <div className='pt-3 border-t'>
                                    <p className='text-xs font-semibold text-purple-600 mb-1.5 flex items-center gap-1'>
                                        <BiTrendingUp className='text-sm' />
                                        Tail Recursion
                                    </p>
                                    <div className='space-y-1 text-xs'>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-600'>Books:</span>
                                            <span className='font-medium'>{item.weight.bookCount}</span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-600'>Total weight:</span>
                                            <span className='font-medium text-orange-600'>
                                                {item.weight.total.toFixed(3)} Kg
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
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
                        <BiTrendingUp className='text-4xl mx-auto mb-2' />
                        <p className='text-sm'>No recursion data available</p>
                    </div>
                )}
            </div>

            {/* Additional information */}
            <div className='mt-8 border border-blue-200 bg-blue-50 rounded p-5'>
                <div className='flex items-start gap-2 mb-3'>
                    <BiInfoCircle className='text-lg text-blue-600 mt-0.5' />
                    <h3 className='font-semibold text-blue-900'>About Reports</h3>
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