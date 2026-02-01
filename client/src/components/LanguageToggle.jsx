import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { MdLanguage } from 'react-icons/md';

const LanguageToggle = ({ className = '' }) => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem('i18nextLng', langCode);
        setIsOpen(false);
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white ring-1 ring-slate-900/10 hover:ring-slate-900/20 transition-all cursor-pointer"
                title={t('language.selectLanguage')}
            >
                <MdLanguage className="text-xl text-gray-600" />
                <span className="hidden sm:inline text-sm font-medium">{currentLanguage.flag}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg ring-1 ring-slate-900/10 py-2 min-w-37.5 z-50">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-primary transition-colors text-left ${
                                i18n.language === lang.code ? 'bg-primary/50 font-medium' : ''
                            }`}
                        >
                            <span className="text-lg">{lang.flag}</span>
                            <span className="text-sm">{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageToggle;
