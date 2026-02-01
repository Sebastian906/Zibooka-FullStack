import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import { categories } from '../assets/data';

const Categories = () => {

    const { t } = useTranslation();
    const {navigate} = useContext(ShopContext);
    const colors = ["bg-[#aedae6]", "bg-[#fff6c9]", "bg-[#fddbdb]"]

    // Mapeo de nombres de categorías a claves de traducción
    const getCategoryName = (name) => {
        const key = `categories.${name.toLowerCase()}`;
        const translated = t(key);
        // Si no hay traducción, devolver el nombre original
        return translated === key ? name : translated;
    };

    return (
        <section className='max-padd-container pt-16 pb-4'>
            <Title title1={t('categories.title1')} title2={t('categories.title2')} titleStyles={"pb-6"} paraStyles={"hidden"} />
            { /* LISTA DE CATEGORÍAS */ }
            <div className='flex gap-9 flex-wrap'>
                {categories.map((cat, index) => (
                    <div 
                        key={index}
                        onClick={()=>navigate(`/shop/${cat.name.toLowerCase()}`)}
                        className='flexCenter flex-col cursor-pointer group'
                    >
                        <div className={`flexCenter flex-col h-36 w-36 sm:h-40 sm:w-40 rounded-xl ${colors[index % 3]}`}>
                            <img 
                                src={cat.image} 
                                alt={cat.name} 
                                height={46}
                                width={46}
                                className='object-cover'
                            />
                            <h5 className='h5 capitalize mt-6'>
                                {getCategoryName(cat.name)}
                            </h5>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default Categories