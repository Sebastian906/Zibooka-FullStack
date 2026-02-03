import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import uploadIcon from '../assets/upload_icon.png'

const Profile = () => {

    const { t } = useTranslation()
    const { user, profileData, imagePreview, profileLoading, countryCodes, selectedCountryCode, setSelectedCountryCode, phoneNumber, loadProfileData, handleProfileImageChange, handlePhoneChange, updateProfileField, submitProfileUpdate, cancelProfileUpdate } = useContext(ShopContext);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Validation errors state
    const [errors, setErrors] = useState({
        email: "",
        newPassword: ""
    });

    // Validation functions
    const validateEmail = (emailValue) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailValue);
    };

    const validatePassword = (password) => {
        return !password || password.length >= 8;
    };

    const handleEmailUpdate = (value) => {
        updateProfileField('email', value);
        if (value && !validateEmail(value)) {
            setErrors(prev => ({ ...prev, email: t('validation.invalidEmail') }));
        } else {
            setErrors(prev => ({ ...prev, email: "" }));
        }
    };

    const handleNewPasswordUpdate = (value) => {
        updateProfileField('newPassword', value);
        if (value && !validatePassword(value)) {
            setErrors(prev => ({ ...prev, newPassword: t('validation.passwordMinLength') }));
        } else {
            setErrors(prev => ({ ...prev, newPassword: "" }));
        }
    };

    useEffect(() => {
        loadProfileData();
    }, [user]);

    return (
        <div className='max-padd-container py-16 pt-28'>
            <Title
                title1={t('profile.edit')}
                title2={t('profile.title')}
                titleStyles={"pb-6"}
                paraStyles={"mb-8"}
                para={t('profile.updateInfo')}
            />

            <form onSubmit={submitProfileUpdate} className='max-w-188 mx-auto'>
                {/* PROFILE IMAGE */}
                <div className='flex flex-col items-center mb-8'>
                    <label htmlFor="profileImage" className='cursor-pointer'>
                        <div className='relative w-32 h-32 rounded-full overflow-hidden ring-2 ring-slate-900/10 hover:ring-secondary transition-all duration-300'>
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Profile"
                                    className='w-full h-full object-cover'
                                />
                            ) : (
                                <div className='w-full h-full flexCenter bg-primary'>
                                    <img src={uploadIcon} alt="Upload" className='w-12 h-12' />
                                </div>
                            )}
                        </div>
                    </label>
                    <input
                        type="file"
                        id="profileImage"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className='hidden'
                    />
                    <p className='text-sm text-gray-50 mt-2'>{t('profile.clickToUpload')}</p>
                </div>

                <div className='bg-primary p-6 rounded-xl space-y-4'>
                    {/* NAME */}
                    <div>
                        <label className='medium-14 block mb-1'>{t('profile.fullName')}</label>
                        <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => updateProfileField('name', e.target.value)}
                            placeholder={t('profile.enterFullName')}
                            className='w-full px-4 py-2.5 rounded-lg ring-1 ring-slate-900/10 bg-white outline-none focus:ring-secondary transition-all'
                            required
                        />
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label className='medium-14 block mb-1'>{t('profile.emailAddress')}</label>
                        <input
                            type="text"
                            value={profileData.email}
                            onChange={(e) => handleEmailUpdate(e.target.value)}
                            placeholder={t('profile.enterEmail')}
                            className={`w-full px-4 py-2.5 rounded-lg ring-1 bg-white outline-none transition-all ${errors.email ? 'ring-red-500' : 'ring-slate-900/10 focus:ring-secondary'}`}
                            required
                        />
                        {errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email}</p>}
                    </div>

                    {/* PHONE NUMBER */}
                    <div>
                        <label className='medium-14 block mb-1'>{t('profile.phoneNumber')}</label>
                        <div className='flex gap-2'>
                            <select
                                value={selectedCountryCode}
                                onChange={(e) => setSelectedCountryCode(e.target.value)}
                                className='px-3 py-2.5 rounded-lg ring-1 ring-slate-900/10 bg-white outline-none focus:ring-secondary transition-all'
                            >
                                {countryCodes.map((country) => (
                                    <option key={country.code} value={country.code}>
                                        {country.code} ({country.country})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={handlePhoneChange}
                                placeholder='1234567890'
                                className='flex-1 px-4 py-2.5 rounded-lg ring-1 ring-slate-900/10 bg-white outline-none focus:ring-secondary transition-all'
                                required
                            />
                        </div>
                    </div>

                    <hr className='border-gray-300 my-6' />

                    {/* PASSWORD SECTION */}
                    <div className='space-y-4'>
                        <h5 className='h5'>{t('profile.changePassword')}</h5>

                        {/* CURRENT PASSWORD */}
                        <div>
                            <div className='flex justify-between items-center mb-1'>
                                <label className='medium-14'>{t('profile.currentPassword')}</label>
                                <label className='flex items-center gap-1 text-xs cursor-pointer'>
                                    <input
                                        type="checkbox"
                                        checked={showCurrentPassword}
                                        onChange={(e) => setShowCurrentPassword(e.target.checked)}
                                        className='cursor-pointer'
                                    />
                                    {t('auth.showPassword')}
                                </label>
                            </div>
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={profileData.currentPassword}
                                onChange={(e) => updateProfileField('currentPassword', e.target.value)}
                                placeholder={t('profile.enterCurrentPassword')}
                                className='w-full px-4 py-2.5 rounded-lg ring-1 ring-slate-900/10 bg-white outline-none focus:ring-secondary transition-all'
                            />
                        </div>

                        {/* NEW PASSWORD */}
                        <div>
                            <div className='flex justify-between items-center mb-1'>
                                <label className='medium-14'>{t('profile.newPassword')}</label>
                                <label className='flex items-center gap-1 text-xs cursor-pointer'>
                                    <input
                                        type="checkbox"
                                        checked={showNewPassword}
                                        onChange={(e) => setShowNewPassword(e.target.checked)}
                                        className='cursor-pointer'
                                    />
                                    {t('auth.showPassword')}
                                </label>
                            </div>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={profileData.newPassword}
                                onChange={(e) => handleNewPasswordUpdate(e.target.value)}
                                placeholder={t('profile.enterNewPassword')}
                                className={`w-full px-4 py-2.5 rounded-lg ring-1 bg-white outline-none transition-all ${errors.newPassword ? 'ring-red-500' : 'ring-slate-900/10 focus:ring-secondary'}`}
                            />
                            <p className={`text-xs mt-1 ${errors.newPassword ? 'text-red-500' : 'text-gray-500'}`}>
                                {errors.newPassword || t('validation.passwordRequirements')}
                            </p>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div>
                            <label className='medium-14 block mb-1'>{t('profile.confirmNewPassword')}</label>
                            <input
                                type="password"
                                value={profileData.confirmPassword}
                                onChange={(e) => updateProfileField('confirmPassword', e.target.value)}
                                placeholder={t('profile.confirmNewPasswordPlaceholder')}
                                className='w-full px-4 py-2.5 rounded-lg ring-1 ring-slate-900/10 bg-white outline-none focus:ring-secondary transition-all'
                            />
                        </div>
                    </div>

                    {/* BUTTONS */}
                    <div className='flex gap-4 mt-8 pt-4'>
                        <button
                            type="submit"
                            disabled={profileLoading}
                            className='flex-1 btn-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {profileLoading ? t('profile.saving') : t('profile.saveChanges')}
                        </button>
                        <button
                            type="button"
                            onClick={cancelProfileUpdate}
                            className='flex-1 btn-white rounded-lg'
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default Profile