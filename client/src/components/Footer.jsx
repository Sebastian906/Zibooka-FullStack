import { Link } from "react-router-dom"
import logoImg from '../assets/logo.png'
import { useTranslation } from 'react-i18next'

const Footer = () => {

    const { t } = useTranslation();

    // Quick Links with navigation routes
    const quickLinks = [
        { label: t('nav.home'), path: '/' },
        { label: t('popular.title'), path: '/#popular-books' },
        { label: t('hero.shopNow'), path: '/shop' },
        { label: t('contact.title'), path: '/contact' },
        { label: 'FAQs', path: '/#achievements' },
    ];

    const contactLinks = [
        t('checkout.shippingAddress'),
        t('footer.termsOfService'),
        t('checkout.paymentMethod'),
        t('orders.trackOrder'),
        t('contact.title')
    ];

    const socialLinks = [
        { label: 'Instagram', url: 'https://instagram.com' },
        { label: 'Twitter', url: 'https://twitter.com' },
        { label: 'Facebook', url: 'https://facebook.com' },
        { label: 'YouTube', url: 'https://youtube.com' },
    ];

    // Handle scroll to section after navigation
    const handleNavClick = (path) => {
        if (path.includes('#')) {
            const [route, hash] = path.split('#');
            // If we're already on the home page, just scroll
            if (window.location.pathname === '/' || route === '/') {
                setTimeout(() => {
                    const element = document.getElementById(hash);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            }
        } else {
            // Scroll to top for regular navigation
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <footer className="bg-linear-to-l from-primary via-white to-primary">
            <div className="max-padd-container">
                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-gray-500/30">
                    <div>
                        { /* LOGO */}
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
                        {/* Quick Links */}
                        <div>
                            <h3 className="font-semibold text-base md:mb-5 mb-2">
                                {t('footer.quickLinks')}
                            </h3>
                            <ul className="text-sm space-y-2">
                                {quickLinks.map((link, i) => (
                                    <li key={i}>
                                        <Link
                                            to={link.path.split('#')[0] || '/'}
                                            onClick={() => handleNavClick(link.path)}
                                            className="hover:underline transition"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact Us */}
                        <div>
                            <h3 className="font-semibold text-base md:mb-5 mb-2">
                                {t('contact.title')}
                            </h3>
                            <ul className="text-sm space-y-2">
                                {contactLinks.map((link, i) => (
                                    <li key={i}>
                                        <a href="#" className="hover:underline transition">
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Newsletter / Social */}
                        <div>
                            <h3 className="font-semibold text-base md:mb-5 mb-2">
                                {t('footer.newsletter')}
                            </h3>
                            <ul className="text-sm space-y-2">
                                {socialLinks.map((link, i) => (
                                    <li key={i}>
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline transition"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
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