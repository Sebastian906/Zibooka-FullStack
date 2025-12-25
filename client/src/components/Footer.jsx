import { Link } from "react-router-dom"
import logoImg from '../assets/logo.png'

const Footer = () => {

    const linkSections = [
        {
            title: "Quick Links",
            links: ["Home", "Best Sellers", "Offers & Deals", "Contact Us", "FAQs"],
        },
        {
            title: "Need Help?",
            links: [
                "Delivery Information",
                "Return & Refund Policy",
                "Payment Methods",
                "Track your Order",
                "Contact Us"
            ],
        },
        {
            title: "Follow Us",
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
                            Discover stylish clothing and shoes online, crafted for comfort and quality. Shop fashion-forward designs that elevate your look and fit every lifestyle.
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
                    Copyright 2025 © ZiBooka. All rights reserved.
                </p>
            </div>
        </footer>
    )
}

export default Footer