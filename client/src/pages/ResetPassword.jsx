import { useState, useContext, useEffect } from 'react'
import { ShopContext } from '../context/ShopContext'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

const ResetPassword = () => {
    const { navigate, axios } = useContext(ShopContext);
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [token, setToken] = useState("");
    const [tokenValid, setTokenValid] = useState(true);

    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        if (!tokenFromUrl) {
            toast.error('Invalid reset link');
            setTokenValid(false);
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } else {
            setToken(tokenFromUrl);
        }
    }, [searchParams, navigate]);

    const onSubmitHandler = async (event) => {
        event.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await axios.post('/api/user/reset-password', {
                token,
                newPassword,
                confirmPassword,
            });

            if (data.success) {
                toast.success('Password reset successfully! You can now login.');
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Reset password error:', error);
            if (error.response?.status === 401) {
                toast.error('Reset link has expired or is invalid. Please request a new one.');
                setTimeout(() => {
                    navigate('/forgot-password');
                }, 2000);
            } else {
                toast.error(error.response?.data?.message || 'Error resetting password');
            }
        } finally {
            setIsLoading(false);
        }
    }

    if (!tokenValid) {
        return (
            <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flex items-center text-sm text-gray-600 bg-black/50'>
                <div className='flex flex-col gap-4 m-auto items-center p-8 py-12 w-80 sm:w-88 rounded-lg shadow-xl border border-gray-200 bg-white'>
                    <div className='text-6xl text-red-500 mb-4'>✕</div>
                    <h3 className='bold-24 text-center'>Invalid Reset Link</h3>
                    <p className='text-center text-gray-50'>
                        Redirecting to home...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className='fixed top-0 bottom-0 left-0 right-0 z-40 flex items-center text-sm text-gray-600 bg-black/50'>
            <form
                onSubmit={onSubmitHandler}
                className='flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-88 rounded-lg shadow-xl border border-gray-200 bg-white'
            >
                <h3 className='bold-28 mx-auto mb-3'>
                    <span className='capitalize'>Reset </span>
                    <span className='capitalize text-secondary'>Password</span>
                </h3>

                <p className='text-center w-full mb-4 text-gray-50'>
                    Enter your new password below.
                </p>

                <div className='w-full'>
                    <div className='flex justify-between items-center mb-1'>
                        <p className='medium-14'>New Password</p>
                        <button
                            type='button'
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className='text-gray-600 hover:text-secondary'
                        >
                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                    <input
                        type={showNewPassword ? "text" : "password"}
                        onChange={(e) => setNewPassword(e.target.value)}
                        value={newPassword}
                        placeholder='Enter new password...'
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                        required
                        minLength={8}
                        disabled={isLoading}
                    />
                    <p className='text-xs text-gray-500 mt-1'>
                        Minimum 8 characters
                    </p>
                </div>

                <div className='w-full'>
                    <div className='flex justify-between items-center mb-1'>
                        <p className='medium-14'>Confirm Password</p>
                        <button
                            type='button'
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className='text-gray-600 hover:text-secondary'
                        >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        value={confirmPassword}
                        placeholder='Confirm new password...'
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                        required
                        minLength={8}
                        disabled={isLoading}
                    />
                </div>

                {/* Password match indicator */}
                {newPassword && confirmPassword && (
                    <div className='w-full'>
                        {newPassword === confirmPassword ? (
                            <p className='text-xs text-green-600 flex items-center gap-1'>
                                ✓ Passwords match
                            </p>
                        ) : (
                            <p className='text-xs text-red-600 flex items-center gap-1'>
                                ✕ Passwords do not match
                            </p>
                        )}
                    </div>
                )}

                <button
                    type='submit'
                    className='bg-secondary w-full rounded py-2.5! mt-3 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                    disabled={isLoading || newPassword !== confirmPassword}
                >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>

                <button
                    type='button'
                    onClick={() => navigate('/')}
                    className='w-full text-center text-secondary hover:underline cursor-pointer'
                    disabled={isLoading}
                >
                    Back to Login
                </button>
            </form>
        </div>
    )
}

export default ResetPassword