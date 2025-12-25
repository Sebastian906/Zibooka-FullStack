import React from 'react'
import { blogs } from '../assets/data'

const Blog = () => {
    return (
        <div className='max-padd-container py-16 pt-20'>
            { /* CONTAINER */ }
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 gap-y-12 pt-6'>
                {blogs.map((blog)=>(
                    <div key={blog.title} className='relative'>
                        <img src={blog.image} alt={blog.title} className='rounded-xl' />
                        <p>{blog.category}</p>
                        <h5 className='h5 mb-1 line-clamp-1'>{blog.title}</h5>
                        <p>Discover books that spark curiosity deliver, quality and bring inspiration to your everyday reading.</p>
                        <button className='underline mt-2 bold-14 line-clamp-1'>continue reading</button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Blog