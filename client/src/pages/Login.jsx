import { useContext, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import toast from 'react-hot-toast'

const Login = () => {

    const { showUserLogin, navigate, setShowUserLogin, axios, fetchUser } = useContext(ShopContext);
    const [state, setState] = useState('login');
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState("");

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        try {
            let payload;
            if (state === "login") {
                payload = { email, password, phone };
            } else {
                payload = { name, email, password, phone };
            }
            const { data } = await axios.post(`/api/user/${state}`, payload);

            console.log('Response completa:', data); // ← AGREGAR
            console.log('Token recibido:', data.token); // ← AGREGAR

            if (data.success) {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log('Token guardado en localStorage'); // ← AGREGAR
                    console.log('Token desde localStorage:', localStorage.getItem('token')); // ← AGREGAR
                } else {
                    console.error('No se recibió token en la respuesta'); // ← AGREGAR
                }

                toast.success(`${state === "login" ? "Login Successfully" : "Account Created"}`);
                navigate('/');
                await fetchUser();
                setShowUserLogin(false);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error en login:', error.response || error); // ← AGREGAR
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
                    <span className='capitalize text-secondary'>User </span>
                    <span className='capitalize'>{state === "login" ? "Login" : "Register"}</span>
                </h3>
                {state === "register" && (
                    <div className='w-full'>
                        <p className='medium-14'>Name</p>
                        <input
                            type="text"
                            onChange={(e) => setName(e.target.value)}
                            value={name}
                            placeholder='Type here...'
                            className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                            required
                        />
                    </div>
                )}
                <div className='w-full'>
                    <p className='medium-14'>Email</p>
                    <input
                        type="text"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        placeholder='Type here...'
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                        required
                    />
                </div>
                <div className='w-full'>
                    <div className='flex justify-between items-center mb-1'>
                        <p className='medium-14'>Password</p>
                        <label className='flex items-center gap-1 medium-14 cursor-pointer text-gray-600'>
                            <input
                                type="checkbox"
                                checked={showPassword}
                                onChange={(e) => setShowPassword(e.target.checked)}
                                className='cursor-pointer'
                            />
                            <span className='font-light'>Show</span>
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
                        onChange={(e) => setPhone(e.target.value)}
                        value={phone}
                        placeholder='Type here...'
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                        required
                    />
                </div>

                {/* Forgot Password Link - Only show on login */}
                {state === "login" && (
                    <div className='w-full flex justify-end'>
                        <button
                            type='button'
                            onClick={handleForgotPassword}
                            className='text-secondary text-sm hover:underline cursor-pointer'
                        >
                            Forgot your password?
                        </button>
                    </div>
                )}

                {state === "register" ? (
                    <p>
                        Already have account?
                        <span
                            onClick={() => setState("login")}
                            className='text-secondary cursor-pointer'
                        >
                            {" "}
                            click here
                        </span>
                    </p>
                ) : (
                    <p>
                        Create an account?
                        <span
                            onClick={() => setState("register")}
                            className='text-secondary cursor-pointer'
                        >
                            {" "}
                            click here
                        </span>
                    </p>
                )}
                <button
                    type='submit'
                    className='bg-secondary w-full rounded py-2.5! text-white cursor-pointer'
                >
                    {state === "login" ? "Login" : "Create Account"}
                </button>
            </form>
        </div>
    )
}

export default Login