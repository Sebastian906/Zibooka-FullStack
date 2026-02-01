import React from 'react'
import { useTranslation } from 'react-i18next'
import Title from './Title'
import { RiSecurePaymentLine, RiSoundModuleLine } from 'react-icons/ri'
import { FaUsersLine } from 'react-icons/fa6'
import { TbLocation } from 'react-icons/tb'

const Achievements = () => {

    const { t } = useTranslation();

    const statistics = [
        { label: t('achievements.happyClients'), value: 15 },
        { label: t('achievements.booksStock'), value: 29 },
        { label: t('achievements.totalSales'), value: 45 }
    ]

    return (
        <section className='mx-auto max-w-360'>
            { /* CONTAINER */}
            <div className='flex flex-col xl:flex-row gap-12'>
                { /* LADO IZQUIERDO */}
                <div className='flex-2 flex justify-center flex-col bg-linear-to-l from-tertiary/40 to-white px-6 lg:px-12 py-16'>
                    <h2 className='h2'>{t('achievements.journeyTitle')}</h2>
                    <p className='py-5 max-w-188'>{t('achievements.journeyDescription')}</p>
                    { /* ESTADÍSTICAS */}
                    <div className='flex flex-wrap gap-4'>
                        {statistics.map((statistic, index) => (
                            <div 
                                key={index}
                                className='p-4 rounded-lg'
                            >
                                <div className='flex items-center gap-1'>
                                    <h3 className='text-5xl font-sans'>{statistic.value}</h3>
                                    <h4 className='regular-32'>k+</h4>
                                </div>
                                <p className='capitalize pt-2'>{statistic.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
                { /* LADO DERECHO */}
                <div className='flex-1 relative max-sm:pl-8 flex items-center xl:justify-center pt-5'>
                    <div className='flex-col'>
                        <Title
                            title1={t('achievements.aboutUs').split(' ')[0] || "About"}
                            title2={t('achievements.aboutUs').split(' ')[1] || "Us"}
                            title1Styles={"pb-4"}
                            paraStyles={"hidden"}
                            para={""}
                        />
                        <div className='flex flex-col items-start'>
                            <div className='flexCenter gap-3 mb-3'>
                                <RiSecurePaymentLine className='text-xl' />
                                <div>
                                    <h5 className='h5'>{t('achievements.fastSecure')}</h5>
                                    <p>{t('achievements.fastSecureDesc')}</p>
                                </div>
                            </div>
                            <div className='flexCenter gap-3 mb-3'>
                                <RiSoundModuleLine className='text-xl' />
                                <div>
                                    <h5 className='h5'>{t('achievements.advanceFiltering')}</h5>
                                    <p>{t('achievements.advanceFilteringDesc')}</p>
                                </div>
                            </div>
                            <div className='flexCenter gap-3 mb-3'>
                                <FaUsersLine className='text-xl' />
                                <div>
                                    <h5 className='h5'>{t('achievements.userReviews')}</h5>
                                    <p>{t('achievements.userReviewsDesc')}</p>
                                </div>
                            </div>
                            <div className='flexCenter gap-3 mb-3'>
                                <TbLocation className='text-xl' />
                                <div>
                                    <h5 className='h5'>{t('achievements.orderTracking')}</h5>
                                    <p>{t('achievements.orderTrackingDesc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Achievements