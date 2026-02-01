import { useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title';

const MyOrders = () => {

    const { t } = useTranslation()
    const { currency, user, axios, books } = useContext(ShopContext);
    const [orders, setOrders] = useState([])

    const loadOrderData = async () => {
        if (!user) return
        try {
            const { data } = await axios.post('/api/order/user-orders')
            if (data.success) {
                setOrders(data.orders)
            }
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        loadOrderData()
    }, [user])

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1={t('orders.title')}
                title2={t('orders.list')}
                title1Styles={"pb-4"}
            />
            {(Array.isArray(orders) && orders.length > 0) ? orders.map((order) => (
                <div
                    key={order?._id}
                    className='bg-primary p-2 mt-3 rounded-lg'
                >
                    {/* LISTA DE LIBROS */}
                    <div className='flex flex-col lg:flex-row gap-4 mb-3'>
                        {(Array.isArray(order?.items) && order.items.length > 0) ? order.items.map((item, index) => {
                            const book = books.find(b => b._id === item.product);
                            return (
                                <div
                                    key={index}
                                    className='flex gap-x-3'
                                >
                                    <div className='flexCenter rounded-lg overflow-hidden'>
                                        <img
                                            src={item?.product?.images?.[0] || ''}
                                            alt={'orderImg'}
                                            className='max-h-20 max-w-32 aspect-square object-contain'
                                        />
                                    </div>
                                    <div className='w-full block'>
                                        <h5 className='h5 capitalize line-clamp-1'>{item?.product.name || t('common.noName')}</h5>
                                        <div className='flex flex-wrap gap-3 max-sm:gap-y-1 mt-1'>
                                            <div className='flex items-center gap-x-2'>
                                                <h5 className='medium-14'>{t('orders.price')}:</h5>
                                                <p>{currency}{item?.product.offerPrice ?? '-'}</p>
                                            </div>
                                            <div className='flex items-center gap-x-2'>
                                                <h5 className='medium-14'>{t('orders.quantity')}:</h5>
                                                <p>{item?.quantity ?? '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : <p>{t('orders.noItems')}</p>}
                    </div>
                    {/* RESUMEN DEL PEDIDO */}
                    <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-t border-gray-300 pt-3'>
                        <div className='flex flex-col gap-2'>
                            <div className='flex items-center gap-x-2'>
                                <h5 className='medium-14'>{t('orders.orderId')}:</h5>
                                <p className='text-gray-400 text-xs break-all'>{order?._id ?? '-'}</p>
                            </div>
                            <div className='flex gap-4'>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>{t('orders.paymentStatus')}:</h5>
                                    <p>{order?.isPaid ? t('orders.done') : t('orders.pending')}</p>
                                    <div className='flex items-center gap-x-2'>
                                        <h5 className='medium-14'>{t('orders.method')}:</h5>
                                        <p className='text-gray-400 text-sm'>{order?.paymentMethod ?? '-'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className='flex gap-4'>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>{t('orders.date')}:</h5>
                                    <p className='text-gray-400 text-sm'>{order?.createdAt ? new Date(order.createdAt).toDateString() : '-'}</p>
                                </div>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>{t('orders.amount')}:</h5>
                                    <p className='text-gray-400 text-sm'>{currency}{order?.amount ?? '-'}</p>
                                </div>
                            </div>
                        </div>
                        <div className='flex gap-3'>
                            <div className='flex items-center gap-x-2'>
                                <h5 className='medium-14'>{t('orders.status')}:</h5>
                                <div className='flex items-center gap-1'>
                                    <span className='min-w-2 h-2 rounded-full bg-green-500' />
                                    <p>{order?.status ?? '-'}</p>
                                </div>
                            </div>
                            <button
                                onClick={loadOrderData}
                                className='btn-secondary py-1! text-xs! rounded-sm'>
                                {t('orders.trackOrder')}
                            </button>
                        </div>
                    </div>
                </div>
            )) : <p>{t('orders.noOrders')}</p>}
        </div>
    )
}

export default MyOrders