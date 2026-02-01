import { Link } from "react-router-dom"
import logoImg from '../assets/logo.png'
import { useTranslation } from 'react-i18next'

const Footer = () => {

    const { t } = useTranslation();

    const linkSections = [
        {
            title: t('footer.quickLinks'),
            links: [t('nav.home'), t('popular.title'), t('hero.shopNow'), t('contact.title'), "FAQs"],
        },
        {
            title: t('contact.title'),
            links: [
                t('checkout.shippingAddress'),
                t('footer.termsOfService'),
                t('checkout.paymentMethod'),
                t('orders.trackOrder'),
                t('contact.title')
            ],
        },
        {
            title: t('footer.newsletter'),
            links: ["Instagram", "Twitter", "Facebook", "YouTube"],
        },
    ];

    return (
        <footer className="bg-linear-to-l from-primary via-white to-primary">
            <div className="max-padd-container">
                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-gray-500/30">
                    <div>
                        { /* LOGO */ }
                        <div className="flex flex-1">
                            <Link to={"/"} className="bold-22 xl:bold-28 flex items-end gap-1" >
                                <img src={logoImg} alt="logo-img" className="h-9" />
                                <div className="relative top-1.5">
                                    ZiBook<span className="text-secondary">a.</span>
                                </div>
                            </Link>
                        </div>
                        <p className="max-w-102.5 mt-6">
                            {t('footer.aboutText')}
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-between w-full md:w-[45%] gap-5">
                        {linkSections.map((section, index) => (
                            <div key={index}>
                                <h3 className="font-semibold text-base md:mb-5 mb-2">
                                    {section.title}
                                </h3>
                                <ul className="text-sm space-y-2">
                                    {section.links.map((link, i) => (
                                        <li key={i}>
                                            <a href="#" className="hover:underline transition">
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="py-4 text-center">
                    Copyright 2025 © ZiBooka. {t('footer.rights')}.
                </p>
            </div>
        </footer>
    )
}

export default Footer