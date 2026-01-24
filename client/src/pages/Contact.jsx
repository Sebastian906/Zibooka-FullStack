import React from 'react'
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock } from 'react-icons/fa'
import { RiCustomerService2Fill } from 'react-icons/ri'
import { TbTargetArrow } from 'react-icons/tb'
import { MdVisibility } from 'react-icons/md'
import blog6 from '../assets/blogs/blog8.jpg'

const Contact = () => {
    const contactInfo = [
        {
            icon: <FaEnvelope className="text-2xl text-secondary" />,
            title: "Email",
            details: "info@zibooka.com",
            subDetails: "support@zibooka.com"
        },
        {
            icon: <FaPhone className="text-2xl text-secondary" />,
            title: "Phone",
            details: "+1 (555) 123-4567",
            subDetails: "+1 (555) 987-6543"
        },
        {
            icon: <FaMapMarkerAlt className="text-2xl text-secondary" />,
            title: "Location",
            details: "123 Book Street",
            subDetails: "New York, NY 10001"
        },
        {
            icon: <FaClock className="text-2xl text-secondary" />,
            title: "Business Hours",
            details: "Mon - Fri: 9AM - 6PM",
            subDetails: "Sat - Sun: 10AM - 4PM"
        }
    ]

    const features = [
        {
            icon: <RiCustomerService2Fill className="text-3xl text-secondary" />,
            title: "Customer Support",
            description: "24/7 dedicated support team ready to assist you with any inquiries"
        },
        {
            icon: <TbTargetArrow className="text-3xl text-tertiary" />,
            title: "Our Mission",
            description: "To inspire readers worldwide by providing access to quality literature"
        },
        {
            icon: <MdVisibility className="text-3xl text-blue-500" />,
            title: "Our Vision",
            description: "Becoming the leading online bookstore that connects readers with their next favorite book"
        }
    ]

    return (
        <div className='max-padd-container py-16 pt-28'>
            {/* HEADER */}
            <div className='text-center mb-12'>
                <h2 className='h2 mb-3'>Get In Touch</h2>
                <p className='max-w-xl mx-auto'>
                    We'd love to hear from you! Whether you have questions about our books, 
                    need assistance, or just want to share your reading experience, we're here to help.
                </p>
            </div>

            {/* CONTENIDO */}
            <div className='flex flex-col lg:flex-row gap-10 mb-16'>
                {/* IZQUIERDA - IMAGEN */}
                <div className='flex-1 lg:max-w-md'>
                    <div className='h-full min-h-120 rounded-xl overflow-hidden shadow-lg'>
                        <img 
                            src={blog6} 
                            alt="Bookstore" 
                            className='w-full h-full object-cover'
                        />
                    </div>
                </div>

                {/* DERECHA */}
                <div className='flex-1'>
                    {/* SOBRE NOSOTROS */}
                    <div className='bg-primary p-6 rounded-xl mb-6'>
                        <h3 className='h3 mb-4'>About Zibooka</h3>
                        <p className='mb-4'>
                            Welcome to Zibooka, your trusted destination for discovering amazing books. 
                            We are passionate about connecting readers with stories that inspire, educate, 
                            and entertain.
                        </p>
                        <p>
                            Founded with a love for literature, we carefully curate our collection to bring 
                            you the best titles across all genres. From timeless classics to the latest 
                            bestsellers, we have something for every reader.
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
                        <h4 className='h4 mb-4'>Why Choose Zibooka?</h4>
                        <ul className='space-y-3'>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>Curated Selection:</span> Every book is 
                                    handpicked for quality and reader satisfaction
                                </p>
                            </li>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>Fast Delivery:</span> Get your books 
                                    delivered quickly and securely to your doorstep
                                </p>
                            </li>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>Expert Recommendations:</span> Our team 
                                    of book lovers helps you discover your next great read
                                </p>
                            </li>
                            <li className='flex items-start gap-3'>
                                <span className='h-2 w-2 rounded-full bg-secondary mt-2'></span>
                                <p className='flex-1'>
                                    <span className='font-semibold'>Competitive Prices:</span> Enjoy amazing 
                                    deals and discounts on your favorite titles
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* INFORMACIÓN DE CONTACTO */}
            <div className='mb-12'>
                <h3 className='h3 text-center mb-8'>Contact Information</h3>
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
                <h3 className='h3 mb-3'>Have Questions?</h3>
                <p className='mb-6 max-w-2xl mx-auto'>
                    We're here to help! Send us an email and our team will get back to you within 24 hours. 
                    Whether it's about an order, a recommendation, or just a chat about books, we'd love to hear from you.
                </p>
                <a 
                    href="mailto:info@zibooka.com"
                    className='btn-secondary inline-block'
                >
                    <FaEnvelope className='inline mr-2' />
                    Send Us an Email
                </a>
            </div>

            {/* INFORMACIÓN ADICIONAL */}
            <div className='mt-12 grid grid-cols-1 md:grid-cols-3 gap-6'>
                <div className='bg-white p-6 rounded-xl ring-1 ring-slate-900/15 text-center'>
                    <h5 className='h5 mb-2'>Free Shipping</h5>
                    <p className='text-sm'>On orders over $50</p>
                </div>
                <div className='bg-white p-6 rounded-xl ring-1 ring-slate-900/15 text-center'>
                    <h5 className='h5 mb-2'>Easy Returns</h5>
                    <p className='text-sm'>30-day return policy</p>
                </div>
                <div className='bg-white p-6 rounded-xl ring-1 ring-slate-900/15 text-center'>
                    <h5 className='h5 mb-2'>Secure Payment</h5>
                    <p className='text-sm'>SSL encrypted checkout</p>
                </div>
            </div>
        </div>
    )
}

export default Contact