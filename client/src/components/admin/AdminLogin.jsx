import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../../context/ShopContext'

const AdminLogin = () => {

    const { isAdmin, setIsAdmin, navigate } = useContext(ShopContext);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");

    const onSubmitHandler = (event) => {
        event.preventDefault();
        setIsAdmin(true);
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
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        placeholder='Type here...'
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-black/80'
                        required
                    />
                </div>
                <div className='w-full'>
                    <p className='medium-14'>Password</p>
                    <input
                        type="text"
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