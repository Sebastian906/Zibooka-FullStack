import React from 'react'
import { useTranslation } from 'react-i18next'

const ProductDescription = () => {
    const { t } = useTranslation()
    
    return (
        <div className='mt-14 ring-1 ring-state-900/10 rounded-lg'>
            <div className="flex gap-3">
                <button className='medium-14 p-3 w-32 border-b-2 border-secondary'>{t('product.descriptionTab')}</button>
                <button className='medium-14 p-3 w-32'>{t('product.colorGuide')}</button>
                <button className='medium-14 p-3 w-32'>{t('product.sizeGuide')}</button>
            </div>
            <hr className='h-px w-full border-gray-500/30' />
            <div className='flex flex-col gap-3 p-3'>
                <div>
                    <h5 className='h5'>{t('product.detail')}</h5>
                    <p className="text-sm">
                        {t('product.detailText1')}
                    </p>
                    <p>{t('product.detailText2')}</p>
                </div>
                <div>
                    <h5 className="h5">{t('product.benefit')}</h5>
                    <ul className="list-disc pl-5 text-sm flex flex-col gap-1">
                        <li className='text-gray-50'>{t('product.benefit1')}</li>
                        <li className='text-gray-50'>{t('product.benefit2')}</li>
                        <li className='text-gray-50'>{t('product.benefit3')}</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default ProductDescription