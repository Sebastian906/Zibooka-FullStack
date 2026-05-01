import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import bg from '../assets/bg.png'
import bgHero from '../assets/bg-hero.png'
import { Link } from 'react-router-dom'
import { FaArrowRight } from 'react-icons/fa6'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { Autoplay } from 'swiper/modules'
import Item from './Item'
import { ShopContext } from '../context/ShopContext'

const Hero = () => {

    const { t } = useTranslation();
    const [popularBooks, setPopularBooks] = useState([]);
    const {books} = useContext(ShopContext)

    // Obtener libros más populares
    useEffect(() => {
        const data = books.filter((item) => item.popular)
        setPopularBooks(data.slice(0, 6))
    }, [books]);

    return (
        <section
            className='max-padd-container flex gap-6 mt-16'
            style={{ minHeight: '35rem' }}
        >
            <div 
                className="flex-5 bg-cover bg-center bg-no-repeat rounded-2xl overflow-hidden"
                style={{ backgroundImage: `url(${bg})` }}
            >
                { /* IZQUIERDA */}
                <div className='max-padd-container flex flex-col h-full justify-center py-10'>
                    <h3 className='bold-24 text-secondary font-thin whitespace-nowrap overflow-hidden text-ellipsis'>
                        {t('hero.exploreBooks')}
                    </h3>
                    <h1
                        className='font-extrabold leading-none mt-1'
                        style={{
                            fontSize: 'clamp(1.75rem, 4vw, 3.5rem)',
                            maxWidth: '16ch',       
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            lineHeight: 1.1,
                        }}
                    >
                        {t('hero.findYourNextBook')}
                    </h1>
                    <h2
                        className='capitalize h2 tracking-wider mt-2'
                        style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.7rem)' }}
                    >
                        {t('hero.upTo40Off')}
                    </h2>
                    <p
                        className='max-w-xl text-gray-700 pt-4'
                        style={{
                            maxWidth: '50ch',
                            overflow: 'hidden',
                        }}
                    >
                        {t('hero.description')}
                    </p>
                    { /* BOTÓN */}
                    <div className='flex mt-5'>
                        <Link
                            to={'/shop'}
                            className='bg-white text-xs font-medium pl-6 rounded-full flexCenter gap-x-6 group'
                        >
                            {t('hero.checkLatestStock')}
                            <FaArrowRight className='bg-secondary text-white rounded-full h-11 w-11 p-3 m-0.75 border border-white group-hover:bg-primary group-hover:text-black transition-all duration-500' />
                        </Link>
                    </div>
                </div>
            </div>
            { /* DERECHA */}
            <div 
                className='hidden lg:block flex-2 bg-primary rounded-2xl bg-center bg-cover bg-no-repeat'
                style={{ backgroundImage: `url(${bgHero})` }}
            >
                <div className='max-w-sm pt-28'>
                    { /* CONTAINER */ }
                    <div>
                        {
                            <Swiper
                                autoplay={{
                                    delay: 4000,
                                    disableOnInteraction: false,
                                }}
                                breakpoints={{
                                    355: {
                                        slidesPerView: 1,
                                        spaceBetween: 10,
                                    },
                                }}
                                modules={[Autoplay]}
                                className='min-h-99.75 max-w-64'
                            >
                                {
                                    popularBooks.map((book) => (
                                        <SwiperSlide key={book._id}>
                                            <Item book={book} fromHero={true} />
                                        </SwiperSlide>
                                    ))
                                }
                            </Swiper>
                        }
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Hero