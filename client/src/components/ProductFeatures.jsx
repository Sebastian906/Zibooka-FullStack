import React from 'react'
import { useTranslation } from 'react-i18next'
import { TbArrowBackUp, TbTruckDelivery } from 'react-icons/tb'
import { RiSecurePaymentLine } from 'react-icons/ri'

const ProductFeatures = () => {
    const { t } = useTranslation();
    
    return (
        <div>
            <div className="mt-12 bg-primary rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 rounded-xl">
                    <div className="flexCenter gap-x-4 p-3 rounded-3xl">
                        <div className="text-3xl"><TbArrowBackUp className='mb-3 text-yellow-500' /></div>
                        <div>
                            <h4 className='h4 capitalize'>{t('features.easyReturn')}</h4>
                            <p>{t('features.easyReturnDesc')}</p>
                        </div>
                    </div>
                    <div className="flexCenter gap-x-4 p-3 rounded-3xl">
                        <div className="text-3xl"><TbTruckDelivery className='mb-3 text-red-500' /></div>
                        <div>
                            <h4 className='h4 capitalize'>{t('features.fastDelivery')}</h4>
                            <p>{t('features.fastDeliveryDesc')}</p>
                        </div>
                    </div>
                    <div className="flexCenter gap-x-4 p-3 rounded-3xl">
                        <div className="text-3xl"><RiSecurePaymentLine className='mb-3 text-blue-500' /></div>
                        <div>
                            <h4 className='h4 capitalize'>{t('features.securePayment')}</h4>
                            <p>{t('features.securePaymentDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProductFeatures