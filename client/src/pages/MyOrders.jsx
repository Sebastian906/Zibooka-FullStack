import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title';
import { dummyOrders } from '../assets/data';

const MyOrders = () => {

    const { currency, user } = useContext(ShopContext);

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1={"My Orders"}
                title2={"List"}
                title1Styles={"pb-4"}
            />
            {(Array.isArray(dummyOrders) && dummyOrders.length > 0) ? dummyOrders.map((order) => (
                <div
                    key={order?._id}
                    className='bg-primary p-2 mt-3 rounded-lg'
                >
                    {/* LISTA DE LIBROS */}
                    <div className='flex flex-col lg:flex-row gap-4 mb-3'>
                        {(Array.isArray(order?.items) && order.items.length > 0) ? order.items.map((item, index) => (
                            <div
                                key={index}
                                className='flex gap-x-3'
                            >
                                <div className='flexCenter rounded-lg overflow-hidden'>
                                    <img
                                        src={item?.book?.image?.[0] || ''}
                                        alt="orderImg"
                                        className='max-h-20 max-w-32 aspect-square object-contain'
                                    />
                                </div>
                                <div className='w-full block'>
                                    <h5 className='h5 capitalize line-clamp-1'>{item?.book?.name || 'No name'}</h5>
                                    <div className='flex flex-wrap gap-3 max-sm:gap-y-1 mt-1'>
                                        <div className='flex items-center gap-x-2'>
                                            <h5 className='medium-14'>Price:</h5>
                                            <p>{currency}{item?.book?.offerPrice ?? '-'}</p>
                                        </div>
                                        <div className='flex items-center gap-x-2'>
                                            <h5 className='medium-14'>Quantity:</h5>
                                            <p>{item?.quantity ?? '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : <p>No items found</p>}
                    </div>
                    {/* RESUMEN DEL PEDIDO */}
                    <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-t border-gray-300 pt-3'>
                        <div className='flex flex-col gap-2'>
                            <div className='flex items-center gap-x-2'>
                                <h5 className='medium-14'>OrderId:</h5>
                                <p className='text-gray-400 text-xs break-all'>{order?._id ?? '-'}</p>
                            </div>
                            <div className='flex gap-4'>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Payment Status:</h5>
                                    <p>{order?.isPaid ? "Done" : "Pending"}</p>
                                    <div className='flex items-center gap-x-2'>
                                        <h5 className='medium-14'>Method:</h5>
                                        <p className='text-gray-400 text-sm'>{order?.paymentMethod ?? '-'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className='flex gap-4'>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Date:</h5>
                                    <p className='text-gray-400 text-sm'>{order?.createdAt ? new Date(order.createdAt).toDateString() : '-'}</p>
                                </div>
                                <div className='flex items-center gap-x-2'>
                                    <h5 className='medium-14'>Amount:</h5>
                                    <p className='text-gray-400 text-sm'>{currency}{order?.amount ?? '-'}</p>
                                </div>
                            </div>
                        </div>
                        <div className='flex gap-3'>
                            <div className='flex items-center gap-x-2'>
                                <h5 className='medium-14'>Status:</h5>
                                <div className='flex items-center gap-1'>
                                    <span className='min-w-2 h-2 rounded-full bg-green-500' />
                                    <p>{order?.status ?? '-'}</p>
                                </div>
                            </div>
                            <button className='btn-secondary py-1! text-xs! rounded-sm'>Track Order</button>
                        </div>
                    </div>
                </div>
            )) : <p>No orders found</p>}
        </div>
    )
}

export default MyOrders