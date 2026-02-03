import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../../context/ShopContext'
import toast from 'react-hot-toast'

const AdminLogin = () => {

    const { t } = useTranslation()
    const { isAdmin, setIsAdmin, navigate, axios, fetchAdmin } = useContext(ShopContext);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Validation errors state
    const [errors, setErrors] = useState({
        email: "",
        phone: ""
    });

    // Validation functions
    const validateEmail = (emailValue) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailValue);
    };

    const validatePhone = (phoneValue) => {
        const phoneRegex = /^[0-9+\-\s()]+$/;
        return phoneRegex.test(phoneValue);
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
        const newErrors = { email: "", phone: "" };

        if (!validateEmail(email)) {
            newErrors.email = t('validation.invalidEmail');
            isValid = false;
        }

        if (!validatePhone(phone)) {
            newErrors.phone = t('validation.phoneInvalid');
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
            const { data } = await axios.post('/api/admin/login', { email, password, phone })
            if (data.success) {
                setIsAdmin(true);
                await fetchAdmin();
                navigate('/admin');
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    useEffect(() => {
        if (isAdmin) {
            navigate('/admin');
        }
    }, [isAdmin])

    return (!isAdmin &&
        <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flex items-center text-sm text-gray-600 bg-black/50 text-[85%]'>
            <form
                onSubmit={onSubmitHandler}
                className='flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-88 rounded-lg shadow-xl border border-gray-200 bg-white'
            >
                <h3 className='bold-28 mx-auto mb-3'>
                    <span className='capitalize text-secondary'>Admin </span>
                    <span className='capitalize'>
                        Login
                    </span>
                </h3>
                <div className='w-full'>
                    <p className='medium-14'>Email</p>
                    <input
                        type="text"
                        onChange={handleEmailChange}
                        value={email}
                        placeholder='Type here...'
                        className={`border rounded w-full p-2 mt-1 outline-black/80 ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                        required
                    />
                    {errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email}</p>}
                </div>
                <div className='w-full'>
                    <div className='flex justify-between items-center mb-1'>
                        <p className='medium-14'>Password</p>
                        <label className='flex items-center gap-1 text-xs cursor-pointer'>
                            <input
                                type="checkbox"
                                checked={showPassword}
                                onChange={(e) => setShowPassword(e.target.checked)}
                                className='cursor-pointer'
                            />
                            {t('auth.showPassword')}
                        </label>
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        placeholder='Type here...'
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                        required
                    />
                </div>
                <div className='w-full'>
                    <p className='medium-14'>Phone</p>
                    <input
                        type="text"
                        onChange={handlePhoneChange}
                        value={phone}
                        placeholder='Type here...'
                        className={`border rounded w-full p-2 mt-1 outline-black/80 ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
                        required
                    />
                    {errors.phone && <p className='text-red-500 text-xs mt-1'>{errors.phone}</p>}
                </div>
                <button
                    type='submit'
                    className='bg-secondary w-full rounded py-2.5! mt-3 text-white cursor-pointer'
                >
                    Login
                </button>
            </form>
        </div>
    )
}

export default AdminLogin