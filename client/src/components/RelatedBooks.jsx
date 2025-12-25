import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext';
import Title from './Title'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { Autoplay } from 'swiper/modules'
import Item from './Item'

const RelatedBooks = ({ book, id }) => {

    const [relatedBooks, setRelatedBooks] = useState([]);
    const { books } = useContext(ShopContext);

    useEffect(() => {
        if (books.length > 0) {
            let booksCopy = books.slice();
            booksCopy = booksCopy.filter((item) =>
                item.category === book.category && item._id !== id
            );
            setRelatedBooks(booksCopy.slice(0, 6));
        }
    }, [books])

    return (
        <section className='py-16'>
            <Title
                title1={"Related"}
                title2={"Books"}
                title1Styles={"pb-4"}
                paraStyles={"mb-10"}
                para={"Discover books that spark curiosity, deliver quality and bring inspiration to your everyday reading"}
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
                        relatedBooks.map((book) => (
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

export default RelatedBooks