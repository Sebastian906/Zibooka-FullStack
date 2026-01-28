import { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../../context/ShopContext';
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
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg">
                            <BiBarChartAlt className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
                            <p className="text-gray-600 mt-1">
                                Download detailed reports in PDF or Excel with recursive analysis
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid of sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Section 1: Inventory Reports */}
                    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TbPackage className="w-6 h-6 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
                        </div>

                        <p className="text-gray-600 mb-6">
                            Generate comprehensive inventory reports with recursive analysis of values and weights per category.
                        </p>

                        {/* Inventory filters */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <IoFilter className="w-4 h-4 text-gray-600" />
                                <label className="font-semibold text-gray-700">Filter by category:</label>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={inventoryCategory}
                                    onChange={(e) => setInventoryCategory(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            {inventoryCategory && (
                                <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Recursive analysis will be included for the selected category
                                </p>
                            )}
                        </div>

                        {/* Download buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleDownloadInventoryPDF}
                                disabled={reportLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                            >
                                <TbFileText className="w-5 h-5" />
                                {reportLoading ? 'Generating...' : 'Download PDF'}
                            </button>
                            <button
                                onClick={handleDownloadInventoryXLSX}
                                disabled={reportLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                            >
                                <BiDownload className="w-5 h-5" />
                                {reportLoading ? 'Generating...' : 'Download Excel'}
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Loans Reports */}
                    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <RiBookOpenLine className="w-6 h-6 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Loans</h2>
                        </div>

                        <p className="text-gray-600 mb-6">
                            Detailed loan reports with statistics and return analysis.
                        </p>

                        {/* Loans filters */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <BiCalendar className="w-4 h-4 text-gray-600" />
                                <label className="font-semibold text-gray-700">Filter by date range:</label>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-600 mb-1 block">From:</label>
                                    <input
                                        type="date"
                                        value={loansDateFrom}
                                        onChange={(e) => setLoansDateFrom(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 mb-1 block">To:</label>
                                    <input
                                        type="date"
                                        value={loansDateTo}
                                        onChange={(e) => setLoansDateTo(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                {(loansDateFrom || loansDateTo) && (
                                    <button
                                        onClick={resetLoansFilters}
                                        className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Clear dates
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Download buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleDownloadLoansPDF}
                                disabled={reportLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                            >
                                <TbFileText className="w-5 h-5" />
                                {reportLoading ? 'Generating...' : 'Download PDF'}
                            </button>
                            <button
                                onClick={handleDownloadLoansXLSX}
                                disabled={reportLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                            >
                                <BiDownload className="w-5 h-5" />
                                {reportLoading ? 'Generating...' : 'Download Excel'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 3: Recursion Preview */}
                <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <BiTrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Recursive Analysis by Category</h2>
                                <p className="text-gray-600 text-sm mt-1">
                                    Total values and average weights calculated recursively
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={loadRecursionData}
                            disabled={loadingRecursion}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-semibold"
                        >
                            {loadingRecursion ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>

                    {loadingRecursion ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        </div>
                    ) : recursionData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recursionData.map((item) => (
                                <div
                                    key={item.category}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-linear-to-br from-white to-gray-50"
                                >
                                    <h3 className="font-bold text-lg text-gray-800 mb-3 pb-2 border-b border-gray-200">
                                        {item.category}
                                    </h3>

                                    {/* Stack Recursion - Value */}
                                    <div className="mb-3">
                                        <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                                            <TbPackage className="w-3 h-3" />
                                            Stack Recursion
                                        </p>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Books:</span>
                                                <span className="font-semibold">{item.value.bookCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total value:</span>
                                                <span className="font-semibold text-green-600">
                                                    ${item.value.total.toLocaleString('es-CO')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Average:</span>
                                                <span className="font-semibold">
                                                    ${Math.round(item.value.average).toLocaleString('es-CO')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tail Recursion - Weight */}
                                    <div className="pt-3 border-t border-gray-200">
                                        <p className="text-xs font-semibold text-purple-600 mb-1 flex items-center gap-1">
                                            <BiTrendingUp className="w-3 h-3" />
                                            Tail Recursion
                                        </p>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Books:</span>
                                                <span className="font-semibold">{item.weight.bookCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total weight:</span>
                                                <span className="font-semibold text-orange-600">
                                                    {item.weight.total.toFixed(3)} Kg
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Average:</span>
                                                <span className="font-semibold">
                                                    {item.weight.average.toFixed(3)} Kg
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <BiTrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p>No recursion data available</p>
                        </div>
                    )}
                </div>

                {/* Additional information */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-3">
                        <BiInfoCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <h3 className="font-bold text-lg text-blue-900">About Reports</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                            <span className="font-bold mt-0.5">•</span>
                            <span>
                                <strong>PDF Reports:</strong> Include detailed tables, statistics, and recursive analysis when filtered by category.
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold mt-0.5">•</span>
                            <span>
                                <strong>Excel Reports:</strong> Contain active formulas for dynamic analysis, multiple sheets, and professional formatting with color coding.
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold mt-0.5">•</span>
                            <span>
                                <strong>Stack Recursion:</strong> Calculates total book value using traditional recursion (LIFO).
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold mt-0.5">•</span>
                            <span>
                                <strong>Tail Recursion:</strong> Calculates average weight using optimized tail recursion (1 page = 0.005 Kg).
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Reports;