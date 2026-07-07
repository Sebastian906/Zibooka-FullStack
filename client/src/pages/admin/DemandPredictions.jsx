import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../../context/ShopContext'
import Title from '../../components/Title'
import { FaChartLine, FaBook, FaBrain, FaSync, FaExclamationTriangle } from 'react-icons/fa'
import toast from 'react-hot-toast'

const DemandPredictions = () => {
    const { axios } = useContext(ShopContext)
    const [predictions, setPredictions] = useState([])
    const [loading, setLoading] = useState(true)
    const [training, setTraining] = useState(false)
    const [modelMetrics, setModelMetrics] = useState(null)
    const [totalEvaluated, setTotalEvaluated] = useState(0)
    const [daysAhead, setDaysAhead] = useState(30)
    const [limit, setLimit] = useState(20)

    const fetchPredictions = async () => {
        try {
            setLoading(true)
            const { data } = await axios.post('/api/prediction/demand-list', {
                days_ahead: daysAhead,
                limit: limit,
                min_score: 0.3,
            })
            setPredictions(data.predictions || [])
            setModelMetrics(data.model_metrics || null)
            setTotalEvaluated(data.total_books_evaluated || 0)
        } catch (error) {
            console.error('Error fetching predictions:', error)
            if (error.response?.status === 503) {
                toast.error('Model not trained. Please train the model first.')
            } else {
                toast.error('Failed to load predictions')
            }
        } finally {
            setLoading(false)
        }
    }

    const trainModel = async () => {
        try {
            setTraining(true)
            toast.loading('Training demand model...', { id: 'train-demand' })
            const { data } = await axios.post('/api/prediction/train-demand')
            toast.success(
                `Model trained! F1: ${(data.metrics?.f1 * 100).toFixed(1)}%`,
                { id: 'train-demand' }
            )
            setModelMetrics(data.metrics)
            // Recargar predicciones después de entrenar
            await fetchPredictions()
        } catch (error) {
            console.error('Error training model:', error)
            toast.error('Failed to train model', { id: 'train-demand' })
        } finally {
            setTraining(false)
        }
    }

    useEffect(() => {
        fetchPredictions()
    }, [daysAhead, limit])

    const getScoreColor = (score) => {
        if (score >= 0.8) return 'bg-red-500'
        if (score >= 0.6) return 'bg-orange-500'
        if (score >= 0.4) return 'bg-yellow-500'
        return 'bg-blue-500'
    }

    const getScoreLabel = (score) => {
        if (score >= 0.8) return 'Very High'
        if (score >= 0.6) return 'High'
        if (score >= 0.4) return 'Medium'
        return 'Low'
    }

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1="Demand"
                title2="Predictions"
                title1Styles="pb-4"
                paraStyles="mb-8"
                para="AI-powered predictions for upcoming book demand (next 30 days)"
            />

            {/* CONTROLES */}
            <div className='flex flex-col md:flex-row gap-4 mb-8'>
                <div className='flex gap-4 items-center'>
                    <label className='text-sm font-medium'>Days ahead:</label>
                    <select
                        value={daysAhead}
                        onChange={(e) => setDaysAhead(Number(e.target.value))}
                        className='px-3 py-2 border border-gray-300 rounded-lg'
                    >
                        <option value={15}>15 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                    </select>
                </div>
                <div className='flex gap-4 items-center'>
                    <label className='text-sm font-medium'>Show top:</label>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className='px-3 py-2 border border-gray-300 rounded-lg'
                    >
                        <option value={10}>10 books</option>
                        <option value={20}>20 books</option>
                        <option value={50}>50 books</option>
                    </select>
                </div>
                <button
                    onClick={trainModel}
                    disabled={training}
                    className='flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 disabled:opacity-50'
                >
                    <FaSync className={training ? 'animate-spin' : ''} />
                    {training ? 'Training...' : 'Retrain Model'}
                </button>
            </div>

            {/* MÉTRICAS DEL MODELO */}
            {modelMetrics && (
                <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <FaBrain className='text-2xl mx-auto mb-2 text-purple-600' />
                        <h4 className='h4 text-purple-700'>
                            {(modelMetrics.f1 * 100).toFixed(1)}%
                        </h4>
                        <p className='text-xs text-gray-500'>F1 Score</p>
                    </div>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <h4 className='h4 text-blue-700'>
                            {(modelMetrics.accuracy * 100).toFixed(1)}%
                        </h4>
                        <p className='text-xs text-gray-500'>Accuracy</p>
                    </div>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <h4 className='h4 text-green-700'>
                            {(modelMetrics.precision * 100).toFixed(1)}%
                        </h4>
                        <p className='text-xs text-gray-500'>Precision</p>
                    </div>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <h4 className='h4 text-orange-700'>
                            {(modelMetrics.recall * 100).toFixed(1)}%
                        </h4>
                        <p className='text-xs text-gray-500'>Recall</p>
                    </div>
                    <div className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 text-center'>
                        <FaChartLine className='text-2xl mx-auto mb-2 text-indigo-600' />
                        <h4 className='h4 text-indigo-700'>
                            {modelMetrics.n_samples || 0}
                        </h4>
                        <p className='text-xs text-gray-500'>Training Samples</p>
                    </div>
                </div>
            )}

            {/* PREDICCIONES */}
            {loading ? (
                <div className='flexCenter h-64'>
                    <div className='animate-spin h-12 w-12 border-4 border-gray-300 border-t-secondary rounded-full' />
                </div>
            ) : predictions.length === 0 ? (
                <div className='bg-white p-12 rounded-xl text-center ring-1 ring-slate-900/5'>
                    <FaExclamationTriangle className='text-6xl text-gray-300 mx-auto mb-4' />
                    <h3 className='h3 text-gray-600 mb-2'>No predictions available</h3>
                    <p className='text-gray-500 mb-4'>
                        The model needs to be trained first, or no books meet the minimum score threshold.
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
                        Showing {predictions.length} of {totalEvaluated} books evaluated
                    </p>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {predictions.map((p) => (
                            <div
                                key={p.product_id}
                                className='bg-white p-4 rounded-xl ring-1 ring-slate-900/5 hover:shadow-md transition-all'
                            >
                                <div className='flex items-start justify-between mb-3'>
                                    <div className='flex-1'>
                                        <h4 className='font-semibold text-gray-800 line-clamp-2'>
                                            {p.title}
                                        </h4>
                                        <p className='text-sm text-gray-500 mt-1'>
                                            {p.category}
                                        </p>
                                    </div>
                                    <span
                                        className={`ml-2 px-2 py-1 text-xs rounded-full text-white ${getScoreColor(
                                            p.demand_score
                                        )}`}
                                    >
                                        {getScoreLabel(p.demand_score)}
                                    </span>
                                </div>

                                {/* Score bar */}
                                <div className='mb-3'>
                                    <div className='flex justify-between text-xs mb-1'>
                                        <span>Demand probability</span>
                                        <span className='font-medium'>
                                            {Math.round(p.demand_score * 100)}%
                                        </span>
                                    </div>
                                    <div className='bg-gray-200 rounded-full h-2.5'>
                                        <div
                                            className={`rounded-full h-2.5 transition-all ${getScoreColor(
                                                p.demand_score
                                            )}`}
                                            style={{ width: `${p.demand_score * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Info */}
                                <div className='flex justify-between text-xs text-gray-500'>
                                    <span>
                                        <FaBook className='inline mr-1' />
                                        {p.predicted_loans} loans (30d)
                                    </span>
                                    <span className={p.stock_available ? 'text-green-600' : 'text-red-600'}>
                                        {p.stock_available ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* INFO */}
            <div className='mt-8 bg-linear-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200'>
                <p className='text-sm text-gray-700'>
                    <strong>About this model:</strong> Uses Gradient Boosting to predict which books
                    will have high demand in the coming days. Features include temporal patterns
                    (semester start, weekly cycles), historical loan counts, and stock status.
                    Retrain periodically for best results.
                </p>
            </div>
        </div>
    )
}

export default DemandPredictions