import { useTranslation } from 'react-i18next'
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock } from 'react-icons/fa'
import { RiCustomerService2Fill } from 'react-icons/ri'
import { TbTargetArrow } from 'react-icons/tb'
import { MdVisibility } from 'react-icons/md'
import blog6 from '../assets/blogs/blog8.jpg'
import Title from '../components/Title'

const Contact = () => {
    const { t } = useTranslation();
    
    const contactInfo = [
        {
            icon: <FaEnvelope className="text-2xl text-secondary" />,
            title: t('contact.email'),
            details: "info@zibooka.com",
            subDetails: "support@zibooka.com"
        },
        {
            icon: <FaPhone className="text-2xl text-secondary" />,
            title: t('contact.phone'),
            details: "+1 (555) 123-4567",
            subDetails: "+1 (555) 987-6543"
        },
        {
            icon: <FaMapMarkerAlt className="text-2xl text-secondary" />,
            title: t('contact.location'),
            details: "123 Book Street",
            subDetails: "New York, NY 10001"
        },
        {
            icon: <FaClock className="text-2xl text-secondary" />,
            title: t('contact.businessHours'),
            details: "Mon - Fri: 9AM - 6PM",
            subDetails: "Sat - Sun: 10AM - 4PM"
        }
    ]

    const features = [
        {
            icon: <RiCustomerService2Fill className="text-3xl text-secondary" />,
            title: t('contact.customerSupport'),
            description: t('contact.customerSupportDesc')
        },
        {
            icon: <TbTargetArrow className="text-3xl text-tertiary" />,
            title: t('contact.ourMission'),
            description: t('contact.ourMissionDesc')
        },
        {
            icon: <MdVisibility className="text-3xl text-blue-500" />,
            title: t('contact.ourVision'),
            description: t('contact.ourVisionDesc')
        }
    ]

    return (
        <div className='max-padd-container py-16 pt-28'>
            {/* HEADER */}
            <Title
                title1={t('contact.title1')}
                title2={t('contact.title2')}
                title1Styles={"pb-2"}
                paraStyles={"pb-6"}
                para={t('contact.introText')}
            />

            {/* CONTENIDO */}
            <div className='flex flex-col lg:flex-row items-stretch gap-10 mb-16'>
                {/* IZQUIERDA - IMAGEN */}
                <div className='flex-1 lg:max-w-md lg:flex-initial'>
                    <div className='rounded-xl overflow-hidden shadow-lg h-auto lg:h-full'>
                        <img
                            src={blog6}
                            alt="Bookstore"
                            className='w-full block object-cover object-center h-auto lg:h-full'
                        />
                    </div>
                </div>

                {/* DERECHA */}
                <div className='flex-1 lg:h-full'>
                    {/* SOBRE NOSOTROS */}
                    <div className='bg-primary p-6 rounded-xl mb-6'>
                        <Title
                            title1={t('contact.aboutZibooka').split(' ')[0] || "About"}
                            title2={t('contact.aboutZibooka').split(' ')[1] || "Zibooka"}
                            title1Styles={"pb-4"}
                            paraStyles={"hidden"}
                        />
                        <p className='mb-4'>
                            {t('contact.aboutZibookaIntro')}
                        </p>
                        <p>
                            {t('contact.aboutZibookaText')}
                        </p>
                    </div>

                    {/* CARACTERÍSTICAS */}
                    <div className='grid grid-cols-1 gap-4 mb-6'>
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className='bg-white p-5 rounded-xl ring-1 ring-slate-900/5 hover:shadow-md transition-all duration-300'
                            >
                                <div className='flex items-start gap-4'>
                                    <div className='flexCenter h-12 w-12 rounded-full bg-primary'>
                                        {feature.icon}
                                    </div>
                                    <div className='flex-1'>
                                        <h4 className='h4 mb-2'>{feature.title}</h4>
                                        <p className='text-sm'>{feature.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PORQUE ELEGIRNOS */}
                    <div className='bg-linear-to-r from-primary/50 to-tertiary/30 p-6 rounded-xl'>
                        <h4 className='h4 mb-4'>{t('contact.whyChooseUs')}</h4>
                        <ul className='space-y-3'>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>{t('contact.curatedSelection')}:</span> {t('contact.curatedSelectionDesc')}
                                </p>
                            </li>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>{t('contact.fastDelivery')}:</span> {t('contact.fastDeliveryDesc')}
                                </p>
                            </li>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>{t('contact.expertRecommendations')}:</span> {t('contact.expertRecommendationsDesc')}
                                </p>
                            </li>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>{t('contact.competitivePrices')}:</span> {t('contact.competitivePricesDesc')}
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* INFORMACIÓN DE CONTACTO */}
            <div className='mb-12'>
                <Title
                    title1={t('contact.contactInfo').split(' ')[0] || "Contact"}
                    title2={t('contact.contactInfo').split(' ')[1] || "Information"}
                    title1Styles={"pb-6"}
                    paraStyles={"hidden"}
                />
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
                    {contactInfo.map((info, index) => (
                        <div
                            key={index}
                            className='bg-primary p-6 rounded-xl text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1'
                        >
                            <div className='flexCenter mb-4'>
                                <div className='h-14 w-14 rounded-full bg-white flexCenter ring-1 ring-slate-900/5'>
                                    {info.icon}
                                </div>
                            </div>
                            <h5 className='h5 mb-2'>{info.title}</h5>
                            <p className='text-sm mb-1'>{info.details}</p>
                            {info.subDetails && (
                                <p className='text-sm text-gray-50'>{info.subDetails}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ENVÍO DE CORREO */}
            <div className='bg-linear-to-r from-secondary/10 via-primary to-tertiary/10 p-8 rounded-2xl text-center'>
                <h3 className='h3 mb-3'>{t('contact.haveQuestions')}</h3>
                <p className='mb-6 max-w-2xl mx-auto'>
                    {t('contact.haveQuestionsDesc')}
                </p>
                <a
                    href="mailto:info@zibooka.com"
                    className='btn-secondary inline-block'
                >
                    <FaEnvelope className='inline mr-2' />
                    {t('contact.sendEmail')}
                </a>
            </div>

            {/* INFORMACIÓN ADICIONAL */}
            <div className='mt-12 grid grid-cols-1 md:grid-cols-3 gap-6'>
                <div className='bg-white p-6 rounded-xl ring-1 ring-slate-900/15 text-center'>
                    <h5 className='h5 mb-2'>{t('contact.freeShipping')}</h5>
                    <p className='text-sm'>{t('contact.freeShippingDesc')}</p>
                </div>
                <div className='bg-white p-6 rounded-xl ring-1 ring-slate-900/15 text-center'>
                    <h5 className='h5 mb-2'>{t('contact.easyReturns')}</h5>
                    <p className='text-sm'>{t('contact.easyReturnsDesc')}</p>
                </div>
                <div className='bg-white p-6 rounded-xl ring-1 ring-slate-900/15 text-center'>
                    <h5 className='h5 mb-2'>{t('contact.securePayment')}</h5>
                    <p className='text-sm'>{t('contact.securePaymentDesc')}</p>
                </div>
            </div>
        </div>
    )
}

export default Contact