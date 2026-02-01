import React from 'react'
import { useTranslation } from 'react-i18next'
import { blogs } from '../assets/data'

const Blog = () => {
    const { t } = useTranslation();
    
    return (
        <div className='max-padd-container py-16 pt-20'>
            { /* CONTAINER */ }
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 gap-y-12 pt-6'>
                {blogs.map((blog)=>(
                    <div key={blog.title} className='relative'>
                        <img src={blog.image} alt={blog.title} className='rounded-xl' />
                        <p>{blog.category}</p>
                        <h5 className='h5 mb-1 line-clamp-1'>{blog.title}</h5>
                        <p>{t('blog.blogDescription')}</p>
                        <button className='underline mt-2 bold-14 line-clamp-1'>{t('blog.continueReading')}</button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Blog