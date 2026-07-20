import { useContext, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import toast from 'react-hot-toast'

const OAuthCallback = () => {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { fetchUser, setShowUserLogin } = useContext(ShopContext)

    useEffect(() => {
        const handleOAuthCallback = async () => {
            const token = searchParams.get('token')
            const error = searchParams.get('error')

            if (error) {
                toast.error(t('oauth.authFailed'))
                navigate('/')
                return
            }

            if (token) {
                localStorage.setItem('token', token)
                localStorage.setItem('loginTime', Date.now().toString())

                try {
                    await fetchUser()
                    toast.success(t('auth.loginSuccess'))
                } catch (err) {
                    console.error('Error fetching user after OAuth:', err)
                }

                setShowUserLogin(false)
                navigate('/')
            } else {
                toast.error(t('oauth.noTokenReceived'))
                navigate('/')
            }
        }

        handleOAuthCallback()
    }, [searchParams, navigate, fetchUser, setShowUserLogin, t])

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='text-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4'></div>
                <p className='text-gray-600'>{t('oauth.processing')}</p>
            </div>
        </div>
    )
}

export default OAuthCallback