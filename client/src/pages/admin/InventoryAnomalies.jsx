import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../../context/ShopContext'
import Title from '../../components/Title'
import {
    FaBrain, FaSync, FaExclamationTriangle, FaCheckCircle,
    FaWarehouse, FaArrowUp, FaArrowDown, FaMinus, FaChartLine,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

const InventoryAnomalies = () => {
    const { axios } = useContext(ShopContext)
    const [anomalies, setAnomalies] = useState([])
    const [loading, setLoading] = useState(true)
    const [training, setTraining] = useState(false)
    const [modelMetrics, setModelMetrics] = useState(null)
    const [totalEvaluated, setTotalEvaluated] = useState(0)

    const fetchAnomalies = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get('/api/prediction/anomalies')
            setAnomalies(data.anomalies || [])
            setTotalEvaluated(data.total_shelves_evaluated || 0)
            setModelMetrics(data.model_metrics || null)
        } catch (error) {
            console.error('Error fetching anomalies:', error)
            if (error.response?.status === 503) {
                toast.error('Model not trained. Please train the model first.')
            } else {
                toast.error('Failed to load anomalies')
            }
        } finally {
            setLoading(false)
        }
    }

    const trainModel = async () => {
        try {
            setTraining(true)
            toast.loading('Training shelf anomaly model...', { id: 'train-anomaly' })
            const { data } = await axios.post('/api/prediction/train-shelf-anomaly')
            toast.success(
                `Model trained! RMSE: ${data.metrics?.rmse?.toFixed(2)}, R²: ${data.metrics?.r2_score?.toFixed(3)}`,
                { id: 'train-anomaly' }
            )
            setModelMetrics(data.metrics)
            await fetchAnomalies()
        } catch (error) {
            console.error('Error training model:', error)
            toast.error('Failed to train model', { id: 'train-anomaly' })
        } finally {
            setTraining(false)
        }
    }

    useEffect(() => {
        fetchAnomalies()
    }, [])

    const getSeverityStyle = (severity) => {
        if (severity >= 0.8) return 'bg-red-100 border-red-500 text-red-800'
        if (severity >= 0.6) return 'bg-yellow-100 border-yellow-500 text-yellow-800'
        return 'bg-blue-100 border-blue-500 text-blue-800'
    }

    const getSeverityLabel = (severity) => {
        if (severity >= 0.8) return 'High'
        if (severity >= 0.6) return 'Medium'
        return 'Low'
    }

    const getSeverityIcon = (severity) => {
        if (severity >= 0.8) return <FaArrowUp className='text-red-500' />
        if (severity >= 0.6) return <FaMinus className='text-yellow-500' />
        return <FaArrowDown className='text-blue-500' />
    }

    const getTypeLabel = (type) => {
        const labels = {
            UNDERUTILIZED: 'Underutilized',
            OVERCONCENTRATED: 'Overconcentrated',
            MISPLACED_HIGH_DEMAND: 'Misplaced High Demand',
            OVERWEIGHT_RISK: 'Overweight Risk',
            CATEGORY_IMBALANCE: 'Category Imbalance',
            LOAD_DEVIATION: 'Load Deviation',
        }
        return labels[type] || type.replace(/_/g, ' ')
    }

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1="Inventory"
                title2="Anomalies"
                title1Styles="pb-4"
                paraStyles="mb-8"
                para="AI-powered detection of shelf distribution anomalies and imbalances"
            />

            {/* CONTROLS */}
            <div className='flex flex-col md:flex-row gap-4 mb-8'>
                <button
                    onClick={trainModel}
                    disabled={training}
                    className='flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 disabled:opacity-50'
                >
                    <FaSync className={training ? 'animate-spin' : ''} />
                    {training ? 'Training...' : 'Train Model'}
                </button>
                <button
                    onClick={fetchAnomalies}
                    disabled={loading}
                    className='flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'
                >
                    <FaWarehouse />
                    Refresh Anomalies
                </button>
            </div>

            {/* MODEL METRICS */}
            {modelMetrics && (
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <FaBrain className='text-2xl mx-auto mb-2 text-purple-600' />
                        <h4 className='h4 text-purple-700'>
                            {modelMetrics.rmse?.toFixed(2) ?? 'N/A'}
                        </h4>
                        <p className='text-xs text-gray-500'>RMSE</p>
                    </div>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <h4 className='h4 text-blue-700'>
                            {modelMetrics.r2_score?.toFixed(3) ?? 'N/A'}
                        </h4>
                        <p className='text-xs text-gray-500'>R² Score</p>
                    </div>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <h4 className='h4 text-green-700'>
                            {modelMetrics.anomaly_threshold?.toFixed(1) ?? 'N/A'}%
                        </h4>
                        <p className='text-xs text-gray-500'>Anomaly Threshold</p>
                    </div>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <FaChartLine className='text-2xl mx-auto mb-2 text-indigo-600' />
                        <h4 className='h4 text-indigo-700'>
                            {modelMetrics.training_samples ?? 0}
                        </h4>
                        <p className='text-xs text-gray-500'>Training Samples</p>
                    </div>
                </div>
            )}

            {/* ANOMALIES */}
            {loading ? (
                <div className='flexCenter h-64'>
                    <div className='animate-spin h-12 w-12 border-4 border-gray-300 border-t-secondary rounded-full' />
                </div>
            ) : anomalies.length === 0 ? (
                <div className='bg-white p-12 rounded-xl text-center ring-1 ring-slate-900/5'>
                    <FaCheckCircle className='text-6xl text-green-300 mx-auto mb-4' />
                    <h3 className='h3 text-gray-600 mb-2'>No anomalies detected</h3>
                    <p className='text-gray-500 mb-4'>
                        All shelves are properly balanced, or the model needs to be trained first.
                    </p>
                    <button
                        onClick={trainModel}
                        disabled={training}
                        className='px-6 py-2 bg-secondary text-white rounded-lg'
                    >
                        Train Model Now
                    </button>
                </div>
            ) : (
                <>
                    <p className='text-sm text-gray-500 mb-4'>
                        Found {anomalies.length} anomalies out of {totalEvaluated} shelves evaluated
                    </p>
                    <div className='space-y-4'>
                        {anomalies.map((anomaly, index) => (
                            <div
                                key={`${anomaly.shelf_id}-${index}`}
                                className={`border-l-4 p-4 rounded-r-xl ${getSeverityStyle(anomaly.severity)}`}
                            >
                                <div className='flex items-start justify-between mb-2'>
                                    <div className='flex items-center gap-3'>
                                        {getSeverityIcon(anomaly.severity)}
                                        <div>
                                            <h4 className='font-bold text-lg'>
                                                {anomaly.shelf_code}
                                            </h4>
                                            <span className='text-sm font-medium opacity-75'>
                                                {getTypeLabel(anomaly.anomaly_type)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='text-right'>
                                        <span className='text-sm font-bold'>
                                            {(anomaly.severity * 100).toFixed(0)}%
                                        </span>
                                        <p className='text-xs opacity-75'>
                                            {getSeverityLabel(anomaly.severity)} Severity
                                        </p>
                                    </div>
                                </div>

                                <p className='text-sm mb-3 opacity-80'>
                                    {anomaly.recommendation}
                                </p>

                                <div className='flex flex-wrap gap-4 text-xs opacity-75'>
                                    <span>
                                        Expected: <strong>{anomaly.expected_load}%</strong>
                                    </span>
                                    <span>
                                        Actual: <strong>{anomaly.actual_load}%</strong>
                                    </span>
                                    <span>
                                        Residual: <strong>{anomaly.residual}%</strong>
                                    </span>
                                </div>

                                {/* Load comparison bar */}
                                <div className='mt-3'>
                                    <div className='flex justify-between text-xs mb-1 opacity-75'>
                                        <span>Load comparison</span>
                                    </div>
                                    <div className='relative h-3 bg-gray-200 rounded-full overflow-hidden'>
                                        {/* Expected load */}
                                        <div
                                            className='absolute h-full bg-gray-400 opacity-50 rounded-full'
                                            style={{ width: `${Math.min(anomaly.expected_load, 100)}%` }}
                                        />
                                        {/* Actual load */}
                                        <div
                                            className={`absolute h-full rounded-full ${
                                                anomaly.actual_load > anomaly.expected_load
                                                    ? 'bg-red-500'
                                                    : 'bg-green-500'
                                            }`}
                                            style={{
                                                width: `${Math.min(anomaly.actual_load, 100)}%`,
                                                opacity: 0.8,
                                            }}
                                        />
                                    </div>
                                    <div className='flex justify-between text-xs mt-1 opacity-50'>
                                        <span>0%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* INFO */}
            <div className='mt-8 bg-linear-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200'>
                <p className='text-sm text-gray-700'>
                    <strong>About this model:</strong> Uses Random Forest Regressor to predict expected
                    shelf load based on context features (category concentration, loan rates, diversity,
                    values, accessibility). Shelves where actual load differs significantly from predicted
                    are flagged as anomalies. Each anomaly type includes actionable recommendations for
                    the administrator.
                </p>
            </div>
        </div>
    )
}

export default InventoryAnomalies
