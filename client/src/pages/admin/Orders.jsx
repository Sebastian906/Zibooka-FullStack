import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../../context/ShopContext'
import toast from 'react-hot-toast'

const Orders = () => {

    const { currency, axios, books } = useContext(ShopContext)
    const [orders, setOrders] = useState([])

    const fetchAllOrders = async () => {
        try {
            const { data } = await axios.post('/api/order/list')
            if (data.success) {
                setOrders(data.orders)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error);
        }
    }

    const statusHandler = async (event, orderId) => {
        try {
            const { data } = await axios.post('/api/order/status', { orderId, status: event.target.value })
            if (data.success) {
                await fetchAllOrders()
                toast.success(data.message)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        fetchAllOrders()
        console.log(orders)
    }, [])

    return (
        <div className='px-2 sm:px-6 py-12 mt-2 h-[97vh] bg-primary overflow-y-scroll lg:w-4/5 rounded-xl'>
            {orders.map((order) => (
                <div
                    key={order._id}
                    className='bg-white p-2 mt-3 rounded-lg'
                >
                    { /* LISTA DE LIBROS */}
                    <div className='flex flex-col lg:flex-row gap-4 mb-3'>
                        {order.items?.map((item, index) => {
                            // item.product may be populated (object with _id) or just an id string
                            const productId = item.product && item.product._id ? item.product._id : item.product
                            const product = books.find(b => b._id == productId)

                            return (
                                <div
                                    key={index}
                                    className='flex gap-x-3'
                                >
                                    <div className='flexCenter rounded-lg overflow-hidden'>
                                        {product?.images?.[0] ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product?.name || 'orderImg'}
                                                className='max-h-20 max-w-32 aspect-square object-contain'
                                            />
                                        ) : (
                                            <div className='w-20 h-20 bg-gray-100 flex items-center justify-center text-xs text-gray-500'>No Image</div>
                                        )}
                                    </div>
                                    <div className='w-full block'>
                                        <h5 className='h5 capitalize line-clamp-1'>{product?.name || 'Unknown product'}</h5>
                                        <div className='flex flex-wrap gap-3 max-sm:gap-y-1 mt-1'>
                                            <div className='flex items-center gap-x-2'>
                                                <h5 className='medium-14'>Price:</h5>
                                                <p>{currency}{product?.offerPrice ?? '0'}</p>
                                            </div>
                                            <div className='flex items-center gap-x-2'>
                                                <h5 className='medium-14'>Quantity:</h5>
                                                <p>{item.quantity}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    { /* RESUMEN DEL PEDIDO */}
                    <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-t border-gray-300 pt-3'>
                        <div className='flex flex-col gap-2'>
                            <div className='flex items-center gap-x-2'>
                                <h5 className='medium-14'>OrderId:</h5>
                                <p className='text-gray-400 text-xs break-all'>{order._id}</p>
                            </div>
                            <div className='flex gap-4'>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Customer:</h5>
                                    <p className='text-xs'>{order.address?.firstName || '-'} {order.address?.lastName || ''}</p>
                                </div>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Phone:</h5>
                                    <p className='text-xs'>{order.address?.phone || '-'}</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-x-2'>
                                <h5 className='medium-14'>Address:</h5>
                                <p className='text-xs'>
                                    {order.address?.street || '-'}, {order.address?.city || '-'}, {order.address?.state || '-'}, {order.address?.country || '-'}, {order.address?.zipcode || '-'}
                                </p>
                            </div>
                            <div className='flex gap-4'>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Payment Status:</h5>
                                    <p>{order.isPaid ? "Done" : "Pending"}</p>
                                    <div className='flex items-center gap-x-2'>
                                        <h5 className='medium-14'>Method:</h5>
                                        <p className='text-gray-400 text-sm'>{order.paymentMethod}</p>
                                    </div>
                                </div>
                            </div>
                            <div className='flex gap-4'>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Date:</h5>
                                    <p className='text-gray-400 text-sm'>{order.createdAt ? new Date(order.createdAt).toDateString() : '-'}</p>
                                </div>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Amount:</h5>
                                    <p className='text-gray-400 text-sm'>{currency}{order.amount ?? '0'}</p>
                                </div>
                            </div>
                        </div>
                        <div className='flex items-center gap-2'>
                            <h5 className='medium-14'>Status:</h5>
                            <select
                                onChange={(event)=>statusHandler(event, order._id)}
                                defaultValue={order.status || 'Order Placed'}
                                className='text-xs font-semibold p-1 ring-slate-900/5 rounded max-w-36 bg-primary'
                            >
                                <option value="Order Placed">Order Placed</option>
                                <option value="Packing">Packing</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Delivered">Delivered</option>
                            </select>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default Orders