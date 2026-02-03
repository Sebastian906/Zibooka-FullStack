import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import toast from 'react-hot-toast'

const Login = () => {

    const { t } = useTranslation()
    const { showUserLogin, navigate, setShowUserLogin, axios, fetchUser } = useContext(ShopContext);
    const [state, setState] = useState('login');
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState("");

    // Validation errors state
    const [errors, setErrors] = useState({
        email: "",
        password: "",
        phone: "",
        name: ""
    });

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone) => {
        const phoneRegex = /^[0-9+\-\s()]+$/;
        return phoneRegex.test(phone);
    };

    const validatePassword = (password) => {
        return password.length >= 8;
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (value && !validateEmail(value)) {
            setErrors(prev => ({ ...prev, email: t('validation.invalidEmail') }));
        } else {
            setErrors(prev => ({ ...prev, email: "" }));
        }
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (state === "register" && value && !validatePassword(value)) {
            setErrors(prev => ({ ...prev, password: t('validation.passwordMinLength') }));
        } else {
            setErrors(prev => ({ ...prev, password: "" }));
        }
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        if (value === "" || validatePhone(value)) {
            setPhone(value);
            setErrors(prev => ({ ...prev, phone: "" }));
        } else {
            setErrors(prev => ({ ...prev, phone: t('validation.phoneInvalid') }));
        }
    };

    const validateForm = () => {
        let isValid = true;
        const newErrors = { email: "", password: "", phone: "", name: "" };

        if (!validateEmail(email)) {
            newErrors.email = t('validation.invalidEmail');
            isValid = false;
        }

        if (state === "register" && !validatePassword(password)) {
            newErrors.password = t('validation.passwordMinLength');
            isValid = false;
        }

        if (!validatePhone(phone)) {
            newErrors.phone = t('validation.phoneInvalid');
            isValid = false;
        }

        if (state === "register" && !name.trim()) {
            newErrors.name = t('validation.nameRequired');
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();

        if (!validateForm()) {
            toast.error(t('validation.invalidEmail'));
            return;
        }

        try {
            let payload;
            if (state === "login") {
                payload = { email, password, phone };
            } else {
                payload = { name, email, password, phone };
            }
            const { data } = await axios.post(`/api/user/${state}`, payload);

            if (data.success) {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    // Guardar loginTime inmediatamente al hacer login
                    localStorage.setItem('loginTime', Date.now().toString());
                } else {
                    console.error('No se recibió token en la respuesta');
                }

                toast.success(`${state === "login" ? t('auth.loginSuccess') : t('auth.registerSuccess')}`);
                navigate('/');
                await fetchUser();
                setShowUserLogin(false);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error en login:', error.response || error);
            if (error.response && error.response.status === 401) {
                toast.error(error.response.data.message || 'Invalid credentials');
            } else {
                toast.error(error.message);
            }
        }
    }

    const handleForgotPassword = () => {
        setShowUserLogin(false);
        navigate('/forgot-password');
    }

    return (
        <div
            onClick={() => setShowUserLogin(false)}
            className='fixed top-0 bottom-0 left-0 right-0 z-40 flex items-center text-sm text-gray-600 bg-black/50'
        >
            <form
                onSubmit={onSubmitHandler}
                onClick={(e) => e.stopPropagation()}
                className='flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-88 rounded-lg shadow-xl border border-gray-200 bg-white'
            >
                <h3 className='bold-28 mx-auto mb-3'>
                    <span className='capitalize text-secondary'>{t('header.login').split(' ')[0]} </span>
                    <span className='capitalize'>{state === "login" ? t('auth.login') : t('auth.register')}</span>
                </h3>
                {state === "register" && (
                    <div className='w-full'>
                        <p className='medium-14'>{t('auth.name')}</p>
                        <input
                            type="text"
                            onChange={(e) => {
                                setName(e.target.value);
                                if (e.target.value.trim()) {
                                    setErrors(prev => ({ ...prev, name: "" }));
                                }
                            }}
                            value={name}
                            placeholder={t('common.typeHere')}
                            className={`border rounded w-full p-2 mt-1 outline-black/80 ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                            required
                        />
                        {errors.name && <p className='text-red-500 text-xs mt-1'>{errors.name}</p>}
                    </div>
                )}
                <div className='w-full'>
                    <p className='medium-14'>{t('auth.email')}</p>
                    <input
                        type="text"
                        onChange={handleEmailChange}
                        value={email}
                        placeholder={t('common.typeHere')}
                        className={`border rounded w-full p-2 mt-1 outline-black/80 ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                        required
                    />
                    {errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email}</p>}
                </div>
                <div className='w-full'>
                    <div className='flex justify-between items-center mb-1'>
                        <p className='medium-14'>{t('auth.password')}</p>
                        <label className='flex items-center gap-1 medium-14 cursor-pointer text-gray-600'>
                            <input
                                type="checkbox"
                                checked={showPassword}
                                onChange={(e) => setShowPassword(e.target.checked)}
                                className='cursor-pointer'
                            />
                            <span className='font-light'>{t('auth.showPassword')}</span>
                        </label>
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        onChange={handlePasswordChange}
                        value={password}
                        placeholder={t('common.typeHere')}
                        className={`border rounded w-full p-2 mt-1 outline-black/80 ${errors.password ? 'border-red-500' : 'border-gray-200'}`}
                        required
                    />
                    {state === "register" && (
                        <p className={`text-xs mt-1 ${errors.password ? 'text-red-500' : 'text-gray-500'}`}>
                            {errors.password || t('validation.passwordRequirements')}
                        </p>
                    )}
                </div>
                <div className='w-full'>
                    <p className='medium-14'>{t('auth.phone')}</p>
                    <input
                        type="text"
                        onChange={handlePhoneChange}
                        value={phone}
                        placeholder={t('common.typeHere')}
                        className={`border rounded w-full p-2 mt-1 outline-black/80 ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
                        required
                    />
                    {errors.phone && <p className='text-red-500 text-xs mt-1'>{errors.phone}</p>}
                </div>

                {/* Forgot Password Link - Only show on login */}
                {state === "login" && (
                    <div className='w-full flex justify-end'>
                        <button
                            type='button'
                            onClick={handleForgotPassword}
                            className='text-secondary text-sm hover:underline cursor-pointer'
                        >
                            {t('auth.forgotPassword')}
                        </button>
                    </div>
                )}

                {state === "register" ? (
                    <p>
                        {t('auth.hasAccount')}
                        <span
                            onClick={() => setState("login")}
                            className='text-secondary cursor-pointer'
                        >
                            {" "}
                            {t('auth.clickHere')}
                        </span>
                    </p>
                ) : (
                    <p>
                        {t('auth.noAccount')}
                        <span
                            onClick={() => setState("register")}
                            className='text-secondary cursor-pointer'
                        >
                            {" "}
                            {t('auth.clickHere')}
                        </span>
                    </p>
                )}
                <button
                    type='submit'
                    className='bg-secondary w-full rounded py-2.5! text-white cursor-pointer'
                >
                    {state === "login" ? t('auth.login') : t('auth.register')}
                </button>
            </form>
        </div>
    )
}

export default Login