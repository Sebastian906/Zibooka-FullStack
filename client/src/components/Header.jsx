import { Link, useLocation, useNavigate } from 'react-router-dom'
import logoImg from '../assets/logo.png'
import Navbar from './Navbar'
import { useContext, useEffect, useRef, useState } from 'react'
import { FaBars, FaBarsStaggered } from 'react-icons/fa6'
import { FaSearch, FaTimes } from 'react-icons/fa'
import defaultUserImg from '../assets/user.png'
import { RiUserLine } from 'react-icons/ri'
import { ShopContext } from '../context/ShopContext'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle'

const Header = () => {

    const { t } = useTranslation();
    const [menuOpened, setMenuOpened] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const inputRef = useRef(null)
    const searchContainerRef = useRef(null)
    const { navigate, user, setUser, searchQuery, setSearchQuery, getCartCount, showUserLogin, setShowUserLogin, logoutUser, fetchUser, isAdmin } = useContext(ShopContext);
    const isShopPage = useLocation().pathname.endsWith('/shop');

    const toggleMenu = async () => setMenuOpened(prev => !prev);

    const handleSearchToggle = () => {
        setShowSearch(prev => {
            const next = !prev
            if (next) {
                setTimeout(() => inputRef.current?.focus(), 150)
            } else {
                setSearchQuery('')
            }
            return next
        })
    }

    useEffect(() => {
        const handleSearch = async () => {
            if (searchQuery.length > 0 && !isShopPage) {
                navigate('/shop')
                await fetchUser()
            }
        }
        handleSearch()
    }, [searchQuery])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false)
                setSearchQuery('')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showSearch])

    return (
        <header className='absolute top-0 left-0 right-0 max-padd-container flexBetween gap-4 py-2 z-40'>
            {/* LOGO */}
            <div className="flex flex-1 min-w-0">
                <Link
                    to={"/"}
                    className='bold-22 xl:bold-28 flex items-end gap-1 shrink-0'
                >
                    <img src={logoImg} alt="" className='hidden sm:block h-9' />
                    <div className='sm:relative top-1.5'>
                        Zibook
                        <span className='text-secondary'>a.</span>
                    </div>
                </Link>
            </div>
            { /* BARRA DE NAVEGACIÓN RESPONSIVE */}
            <div className='flex-1 flex justify-center'>
                <Navbar
                    setMenuOpened={setMenuOpened}
                    containerStyles={`${menuOpened
                        ? "flex items-start flex-col gap-y-8 fixed top-16 right-6 p-5 bg-white rounded-xl shadow-lg w-52 ring-1 ring-slate-900/5 z-50"
                        : "hidden lg:flex gap-x-5 xl:gap-x-7 medium-15 ring-1 ring-slate-900/15 rounded-full p-1 bg-primary"
                        }`}
                />
            </div>
            <div className="flex flex-1 items-center justify-end gap-x-5 shrink-0">
                { /* BARRA DE BÚSQUEDA */}
                <div ref={searchContainerRef} className='relative hidden xl:flex items-center h-10'>
                    <div className={`absolute right-10 top-0 h-10 flex items-center bg-white ring-1 ring-slate-900/10 rounded-full overflow-hidden transition-all duration-300 ease-in-out ${showSearch ? 'w-56 opacity-100 px-4' : 'w-0 opacity-0 px-0 pointer-events-none'}`}>
                        <input
                            ref={inputRef}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            value={searchQuery}
                            type="text"
                            placeholder={t('header.searchPlaceholder')}
                            className='bg-transparent w-full text-sm outline-none pr-2 placeholder:text-gray-400'
                        />
                    </div>
                    <button
                        onClick={handleSearchToggle}
                        aria-label={showSearch ? 'Close search' : 'Open search'}
                        className={`relative z-10 p-2.5 rounded-full cursor-pointer transition-colors duration-200 ${showSearch ? 'bg-secondary text-white' : 'bg-primary text-current'}`}
                    >
                        {showSearch
                            ? <FaTimes className="text-base" />
                            : <FaSearch className="text-base" />
                        }
                    </button>
                </div>
                { /* SELECTOR DE IDIOMA */}
                <LanguageToggle />
                { /* MENÚ HAMBURGUESA */}
                <button
                    onClick={toggleMenu}
                    className="lg:hidden cursor-pointer p-1"
                    aria-label="Toggle menu"
                >
                    {menuOpened
                        ? <FaBarsStaggered className="text-xl" />
                        : <FaBars className="text-xl" />
                    }
                </button>
                { /* CARRITO */}
                <Link
                    to={"/cart"}
                    className='flex relative'
                >
                    <div className='bold-16'>
                        {t('header.cart')}
                        <span className='bg-secondary text-white text-[12px] font-semibold absolute -top-3.5 -right-2 flexCenter w-4 h-4 rounded-full shadow-md'>
                            {getCartCount()}
                        </span>
                    </div>
                </Link>
                { /* PERFIL DE USUARIO */}
                <div className='group relative'>
                    {user ? (
                        <div className='flex gap-2 items-center cursor-pointer rounded-full bg-white overflow-hidden'>
                            <img
                                src={user?.profileImage || defaultUserImg}
                                alt='userImg'
                                className='w-11 h-11 object-cover rounded-full'
                            />
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowUserLogin(true)}
                            className='btn-light flexCenter gap-x-1.5 px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm min-w-10 sm:min-w-32 whitespace-nowrap -mr-2 sm:mr-0'
                        >
                            <span className='hidden sm:inline'>{t('header.login')}</span>
                            <RiUserLine className='text-lg sm:text-xl shrink-0' />
                        </button>
                    )}
                    { /* MENÜ DESPLEGABLE */}
                    {user && (
                        <ul className='bg-white p-2 w-40 ring-1 ring-slate-900/15 rounded absolute right-0 top-10 hidden group-hover:flex flex-col medium-14 shadow-md z-50'>
                            <li onClick={() => navigate('/profile')} className='p-2 rounded-md hover:bg-primary cursor-pointer'>{t('header.profile')}</li>
                            <li onClick={() => navigate('/my-orders')} className='p-2 rounded-md hover:bg-primary cursor-pointer'>{t('header.orders')}</li>
                            <li onClick={() => navigate('/my-loans')} className='p-2 rounded-md hover:bg-primary cursor-pointer'>{t('header.myLoans')}</li>
                            <li onClick={() => navigate('/my-reservations')} className='p-2 rounded-md hover:bg-primary cursor-pointer'>{t('header.reservations')}</li>
                            {isAdmin && (
                                <li onClick={() => navigate('/admin')} className='p-2 rounded-md hover:bg-primary cursor-pointer font-medium'>{t('header.adminPanel')}</li>
                            )}
                            <li onClick={logoutUser} className='p-2 rounded-md hover:bg-primary cursor-pointer'>{t('header.logout')}</li>
                        </ul>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Header