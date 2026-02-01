import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Title from '../components/Title'
import { ShopContext } from '../context/ShopContext'
import Item from '../components/Item';
import { useParams } from 'react-router-dom';

const CategoryShop = () => {
    const { t } = useTranslation();
    const { books, searchQuery } = useContext(ShopContext);
    const [filteredBooks, setFilteredBooks] = useState([])
    const [currPage, setCurrPage] = useState(1)
    const itemsPerPage = 10
    const {category} = useParams();

    useEffect(() => {
        let result = books

        // Filtrar por categoria desde URL
        if (category) {
            result = result.filter((book)=>
                book.category.toLowerCase() === category.toLocaleLowerCase()
            )
        }

        if (searchQuery.length > 0) {
            setFilteredBooks(
                result = result.filter((book) =>
                    book.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
        setFilteredBooks(result)
        setCurrPage(1)
    }, [books, searchQuery, category]);

    const totalPages = Math.ceil(
        filteredBooks.filter(b => b.inStock).length / itemsPerPage
    );

    useEffect(() => {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, [currPage]);

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1={category}
                title2={t('categoryShop.books')}
                title1Styles={"pb-2"}
                paraStyles={"pb-6"}
                para={t('categoryShop.description')}
            />
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-8'>
                {filteredBooks.length > 0 ? (
                    filteredBooks.filter((book) =>
                        book.inStock).slice(
                            (currPage - 1) * itemsPerPage, currPage * itemsPerPage
                        ).map((book) => (
                            <Item key={book._id} book={book} />
                        ))
                ) : (
                    <h4 className='h4'>
                        {t('categoryShop.noResults')}
                    </h4>
                )}
            </div>
            { /* PAGINACIÓN */ }
            <div className='flexCenter flex-wrap gap-2 sm:gap-4 mt-14 mb-10'>
                <button
                    disabled={currPage === 1}
                    onClick={()=>setCurrPage(prev=>prev-1)}
                    className={`${currPage === 1 && 'opacity-50 cursor-not-allowed'} btn-dark py-1! px-3!`}
                >
                    {t('shop.previous')}
                </button>
                {Array.from({length: totalPages}, (_, index)=>(
                    <button
                        key={index + 1}
                        onClick={()=>setCurrPage(index+1)}
                        className={`${currPage === index + 1 && 'bg-secondary text-white!'} btn-light py-1! px-3!`}
                    >
                        {index + 1}
                    </button>
                ))}
                <button
                    disabled={currPage === totalPages}
                    onClick={()=>setCurrPage(prev=>prev+1)}
                    className={`${currPage === totalPages && 'opacity-50 cursor-not-allowed'} btn-white bg-tertiary py-1! px-3!`}
                >
                    {t('shop.next')}
                </button>
            </div>
        </div>
    )
}

export default CategoryShop