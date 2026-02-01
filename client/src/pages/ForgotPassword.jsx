import { useState, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import toast from 'react-hot-toast'
import { FaArrowLeft } from 'react-icons/fa'

const ForgotPassword = () => {
    const { t } = useTranslation()
    const { navigate, axios } = useContext(ShopContext);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        try {
            const { data } = await axios.post('/api/user/forgot-password', { email });

            if (data.success) {
                setEmailSent(true);
                toast.success(t('forgotPassword.emailSent'));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            toast.error(error.response?.data?.message || 'Error sending reset link');
        } finally {
            setIsLoading(false);
        }
    }

    const handleBackToLogin = () => {
        navigate('/');
    }

    return (
        <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flex items-center text-sm text-gray-600 bg-black/50'>
            <div className='flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-88 rounded-lg shadow-xl border border-gray-200 bg-white'>
                {!emailSent ? (
                    <>
                        <button
                            onClick={handleBackToLogin}
                            className='flex items-center gap-2 text-secondary hover:underline mb-2'
                        >
                            <FaArrowLeft /> {t('forgotPassword.backToLogin')}
                        </button>

                        <h3 className='bold-28 mx-auto mb-3'>
                            <span className='capitalize'>{t('forgotPassword.title').split(' ')[0]} </span>
                            <span className='capitalize text-secondary'>{t('forgotPassword.title').split(' ').slice(1).join(' ')}?</span>
                        </h3>

                        <p className='text-center w-full mb-4 text-gray-500'>
                            {t('forgotPassword.subtitle')}
                        </p>

                        <form onSubmit={onSubmitHandler} className='w-full flex flex-col gap-4'>
                            <div className='w-full'>
                                <p className='medium-14'>{t('forgotPassword.email')}</p>
                                <input
                                    type="email"
                                    onChange={(e) => setEmail(e.target.value)}
                                    value={email}
                                    placeholder={t('common.typeHere')}
                                    className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type='submit'
                                className='bg-secondary w-full rounded py-2.5! text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                                disabled={isLoading}
                            >
                                {isLoading ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <div className='w-full text-center'>
                            <div className='text-6xl text-secondary mb-4'>✓</div>
                            <h3 className='bold-24 mb-3'>{t('forgotPassword.checkEmail')}</h3>
                            <p className='text-gray-500 mb-6'>
                                {t('forgotPassword.emailSentTo')} <strong>{email}</strong>
                            </p>
                            <div className='bg-primary p-4 rounded-lg mb-6'>
                                <p className='text-sm text-gray-500'>
                                    <strong>{t('forgotPassword.important')}:</strong> {t('forgotPassword.linkExpire')}
                                </p>
                            </div>
                            <button
                                onClick={handleBackToLogin}
                                className='bg-secondary w-full rounded py-2.5! text-white cursor-pointer'
                            >
                                {t('forgotPassword.backToLogin')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default ForgotPassword