import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaDribbble, FaFacebookF, FaInstagram } from 'react-icons/fa6'
import toast from 'react-hot-toast'

const NewsLetter = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    const validateEmail = (emailValue) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailValue);
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (value && !validateEmail(value)) {
            setEmailError(t('validation.invalidEmail'));
        } else {
            setEmailError("");
        }
    };

    const handleSubscribe = () => {
        if (!email) {
            toast.error(t('validation.emailRequired'));
            return;
        }
        if (!validateEmail(email)) {
            toast.error(t('validation.invalidEmail'));
            return;
        }
        toast.success(t('footer.subscribed') || 'Subscribed successfully!');
        setEmail("");
    };

    return (
        <section className='max-padd-container py-8 mt-2'>
            <div className='flexBetween flex-wrap gap-7'>
                <div>
                    <h4 className='bold-14 uppercase tracking-wider'>
                        {t('footer.newsletter')}
                    </h4>
                    <p>{t('footer.newsletterText')}</p>
                </div>
                <div>
                    <div className='flex flex-col'>
                        <div className='flex bg-primary'>
                            <input
                                type="text"
                                value={email}
                                onChange={handleEmailChange}
                                placeholder={t('footer.emailPlaceholder')}
                                className={`p-4 bg-primary w-55.5 sm:w-66.5 outline-none text-[13px] ${emailError ? 'ring-1 ring-red-500' : ''}`}
                            />
                            <button
                                onClick={handleSubscribe}
                                className='btn-secondary rounded-none! text-[13px]! font-bold! uppercase'
                            >
                                {t('footer.subscribe')}
                            </button>
                        </div>
                        {emailError && <p className='text-red-500 text-xs mt-1'>{emailError}</p>}
                    </div>
                </div>
                <div className='flex gap-x-3 pr-14'>
                    <div className='h-8 w-8 rounded-full hover:bg-secondary hover:text-white flexCenter transition-all duration-500'>
                        <FaFacebookF />
                    </div>
                    <div className='h-8 w-8 rounded-full hover:bg-secondary hover:text-white flexCenter transition-all duration-500'>
                        <FaInstagram />
                    </div>
                    <div className='h-8 w-8 rounded-full hover:bg-secondary hover:text-white flexCenter transition-all duration-500'>
                        <FaDribbble />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default NewsLetter