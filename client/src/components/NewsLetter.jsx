import React from 'react'
import { FaDribbble, FaFacebookF, FaInstagram } from 'react-icons/fa6'

const NewsLetter = () => {
    return (
        <section className='max-padd-container py-8 mt-2'>
            <div className='flexBetween flex-wrap gap-7'>
                <div>
                    <h4 className='bold-14 uppercase tracking-wider'>
                        Subscribe newsletter
                    </h4>
                    <p>Get latest information on Events, Sales & Offers.</p>
                </div>
                <div>
                    <div className='flex bg-primary'>
                        <input 
                            type="email"
                            placeholder='Email Address...'
                            className='p-4 bg-primary w-55.5 sm:w-66.5 outline-none text-[13px]' 
                        />
                        <button className='btn-secondary rounded-none! text-[13px]! font-bold! uppercase'>Submit</button>
                    </div>
                </div>
                <div className='flex gap-x-3 pr-14'>
                    <div className='h-8 w-8 rounded-full hover:bg-secondary hover:text-white flexCenter transition-all duration-500'>
                        <FaFacebookF />
                    </div>
                    <div className='h-8 w-8 rounded-full hover:bg-secondary hover:text-white flexCenter transition-all duration-500'>
                        <FaInstagram />
                    </div>
                    <div className='h-8 w-8 rounded-full hover:bg-secondary hover:text-white flexCenter transition-all duration-500'>
                        <FaDribbble />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default NewsLetter