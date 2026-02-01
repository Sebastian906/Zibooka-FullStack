import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import Title from './Title'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { Autoplay } from 'swiper/modules'
import Item from './Item'

const PopularBooks = () => {

    const { t } = useTranslation();
    const [popularBooks, setPopularBooks] = useState([]);
    const { books } = useContext(ShopContext);

    useEffect(() => {
        const data = books.filter((item) => item.popular)
        setPopularBooks(data.slice(0, 6))
    }, [books]);

    return (
        <section id="popular-books" className='max-padd-container py-16'>
            <Title
                title1={t('popular.title1')}
                title2={t('popular.title2')}
                title1Styles={"pb-6"}
                paraStyles={"mb-8"}
                para={t('popular.description')}
            />
            { /* CONTAINER */}
            {
                <Swiper
                    autoplay={{
                        delay: 4000,
                        disableOnInteraction: false,
                    }}
                    breakpoints={{
                        355: {
                            slidesPerView: 2,
                            spaceBetween: 20,
                        },
                        600: {
                            slidesPerView: 3,
                            spaceBetween: 30,
                        },
                        900: {
                            slidesPerView: 4,
                            spaceBetween: 30,
                        },
                        1200: {
                            slidesPerView: 5,
                            spaceBetween: 30,
                        }
                    }}
                    modules={[Autoplay]}
                    className='min-h-83.25'
                >
                    {
                        popularBooks.map((book) => (
                            <SwiperSlide key={book._id}>
                                <Item book={book} />
                            </SwiperSlide>
                        ))
                    }
                </Swiper>
            }
        </section>
    )
}

export default PopularBooks