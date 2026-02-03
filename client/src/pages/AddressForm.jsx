import React, { useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import { ShopContext } from '../context/ShopContext'
import toast from 'react-hot-toast'

const AddressForm = () => {
    const { t } = useTranslation()
    const { navigate, user, method, setMethod, axios } = useContext(ShopContext);
    const [address, setAddress] = useState({
        firstName: "",
        lastName: "",
        email: "",
        street: "",
        city: "",
        state: "",
        zipcode: "",
        country: "",
        phone: ""
    });

    // Validation errors state
    const [errors, setErrors] = useState({
        email: "",
        phone: "",
        zipcode: ""
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

    const validateZipcode = (zipcodeValue) => {
        const zipcodeRegex = /^[0-9\-\s]+$/;
        return zipcodeRegex.test(zipcodeValue);
    };

    const onChangeHandler = (e) => {
        const name = e.target.name;
        const value = e.target.value;

        // Special validation for specific fields
        if (name === 'email') {
            if (value && !validateEmail(value)) {
                setErrors(prev => ({ ...prev, email: t('validation.invalidEmail') }));
            } else {
                setErrors(prev => ({ ...prev, email: "" }));
            }
        }

        if (name === 'phone') {
            if (value && !validatePhone(value)) {
                setErrors(prev => ({ ...prev, phone: t('validation.phoneInvalid') }));
                return; // Don't update if invalid
            } else {
                setErrors(prev => ({ ...prev, phone: "" }));
            }
        }

        if (name === 'zipcode') {
            if (value && !validateZipcode(value)) {
                setErrors(prev => ({ ...prev, zipcode: t('validation.zipcodeInvalid') }));
                return; // Don't update if invalid
            } else {
                setErrors(prev => ({ ...prev, zipcode: "" }));
            }
        }

        setAddress((data) => ({ ...data, [name]: value }));
        console.log(address);
    }

    const validateForm = () => {
        let isValid = true;
        const newErrors = { email: "", phone: "", zipcode: "" };

        if (!validateEmail(address.email)) {
            newErrors.email = t('validation.invalidEmail');
            isValid = false;
        }

        if (!validatePhone(address.phone)) {
            newErrors.phone = t('validation.phoneInvalid');
            isValid = false;
        }

        if (address.zipcode && !validateZipcode(address.zipcode)) {
            newErrors.zipcode = t('validation.zipcodeInvalid');
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error(t('validation.invalidEmail'));
            return;
        }

        try {
            const { data } = await axios.post('/api/address/add', { address })
            if (data.success) {
                toast.success(data.message)
                navigate('/cart')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (!user) {
            navigate('/cart')
        }
    }, []);

    return (
        <div className='max-padd-container py-16 pt-28'>
            { /* CONTAINER */}
            <div className='flex flex-col xl:flex-row gap-20 xl:gap-28'>
                { /* IZQUIERDA */}
                <form
                    onSubmit={onSubmitHandler}
                    className='flex flex-2 flex-col gap-3 text-[95%]'
                >
                    <Title
                        title1={t('address.title1')}
                        title2={t('address.title2')}
                        titleStyles={"pb-5"}
                    />
                    <div className='flex gap-3'>
                        <input
                            onChange={onChangeHandler}
                            value={address.firstName}
                            type="text"
                            name='firstName'
                            placeholder={t('address.firstName')}
                            className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm bg-primary outline-none w-1/2'
                            required
                        />
                        <input
                            onChange={onChangeHandler}
                            value={address.lastName}
                            type="text"
                            name='lastName'
                            placeholder={t('address.lastName')}
                            className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm bg-primary outline-none w-1/2'
                            required
                        />
                    </div>
                    <div>
                        <input
                            onChange={onChangeHandler}
                            value={address.email}
                            type="email"
                            name='email'
                            placeholder={t('address.email')}
                            className={`ring-1 p-1 pl-3 rounded-sm bg-primary outline-none w-full ${errors.email ? 'ring-red-500' : 'ring-slate-900/15'}`}
                            required
                        />
                        {errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email}</p>}
                    </div>
                    <div>
                        <input
                            onChange={onChangeHandler}
                            value={address.phone}
                            type="tel"
                            name='phone'
                            placeholder={t('address.phone')}
                            className={`ring-1 p-1 pl-3 rounded-sm bg-primary outline-none w-full ${errors.phone ? 'ring-red-500' : 'ring-slate-900/15'}`}
                            required
                        />
                        {errors.phone && <p className='text-red-500 text-xs mt-1'>{errors.phone}</p>}
                    </div>
                    <input
                        onChange={onChangeHandler}
                        value={address.street}
                        type="text"
                        name='street'
                        placeholder={t('address.street')}
                        className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm bg-primary outline-none'
                        required
                    />
                    <div className='flex gap-3'>
                        <input
                            onChange={onChangeHandler}
                            value={address.city}
                            type="text"
                            name='city'
                            placeholder={t('address.city')}
                            className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm bg-primary outline-none w-1/2'
                            required
                        />
                        <input
                            onChange={onChangeHandler}
                            value={address.state}
                            type="text"
                            name='state'
                            placeholder={t('address.state')}
                            className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm bg-primary outline-none w-1/2'
                            required
                        />
                    </div>
                    <div className='flex gap-3'>
                        <div className='w-1/2'>
                            <input
                                onChange={onChangeHandler}
                                value={address.zipcode}
                                type="text"
                                name='zipcode'
                                placeholder={t('address.zipcode')}
                                className={`ring-1 p-1 pl-3 rounded-sm bg-primary outline-none w-full ${errors.zipcode ? 'ring-red-500' : 'ring-slate-900/15'}`}
                                required
                            />
                            {errors.zipcode && <p className='text-red-500 text-xs mt-1'>{errors.zipcode}</p>}
                        </div>
                        <input
                            onChange={onChangeHandler}
                            value={address.country}
                            type="text"
                            name='country'
                            placeholder={t('address.country')}
                            className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm bg-primary outline-none w-1/2'
                            required
                        />
                    </div>
                    <button
                        type='submit'
                        className='btn-dark rounded-md w-1/2 mt-2'
                    >
                        {t('address.addAddress')}
                    </button>
                </form>
                { /* DERECHA */}
                <div className='flex flex-1 flex-col'>
                    <div className='max-w-94.75 w-full bg-primary p-5 py-10 max-md:mt-16 rounded-xl'>
                        <CartTotal
                            method={method}
                            setMethod={setMethod}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddressForm