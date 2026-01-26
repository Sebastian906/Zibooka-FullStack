import { createContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

axios.defaults.withCredentials = true
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL

export const ShopContext = createContext()

const ShopContextProvider = ({ children }) => {

    const navigate = useNavigate()
    const [books, setBooks] = useState([])
    const [user, setUser] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const currency = import.meta.env.VITE_CURRENCY
    const [cartItems, setCartItems] = useState({})
    const [method, setMethod] = useState('COD')
    const [showUserLogin, setShowUserLogin] = useState("")
    const delivery_charges = 10
    const [isAdmin, setIsAdmin] = useState(false)
    const [shelves, setShelves] = useState([])

    // Profile states
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [profileImage, setProfileImage] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [profileLoading, setProfileLoading] = useState(false)

    // Country codes for phone selection
    const countryCodes = [
        { code: '+1', country: 'US/CA' },
        { code: '+44', country: 'UK' },
        { code: '+57', country: 'CO' },
        { code: '+52', country: 'MX' },
        { code: '+34', country: 'ES' },
        { code: '+54', country: 'AR' },
        { code: '+56', country: 'CL' },
        { code: '+51', country: 'PE' },
    ]

    const [selectedCountryCode, setSelectedCountryCode] = useState('+1')
    const [phoneNumber, setPhoneNumber] = useState('')

    // Fetch all books
    const fetchBooks = async () => {
        try {
            const { data } = await axios.get('/api/product/list')
            if (data.success) {
                setBooks(data.products)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Fetch User
    const fetchUser = async () => {
        try {
            const { data } = await axios.get('/api/user/is-auth')
            if (data.success) {
                setUser(data.user)
                setCartItems(data.user.cartData || {})
            } else {
                setUser(null)
                setCartItems({})
            }
        } catch (error) {
            setUser(null);
            setCartItems({});
            if (!(error.response && error.response.status === 401)) {
                toast.error(error.message);
            }
        }
    }

    // Fetch Admin
    const fetchAdmin = async () => {
        try {
            const { data } = await axios.get('/api/admin/is-admin')
            setIsAdmin(data.success)
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setIsAdmin(false);
            } else {
                setIsAdmin(false);
                toast.error(error.message);
            }
        }
    }

    // User Logout
    const logoutUser = async () => {
        try {
            const { data } = await axios.post('/api/user/logout')
            if (data.success) {
                toast.success(data.message)
                setUser(null)
                setCartItems({})
                navigate('/')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Adding items to cart
    const addToCart = async (itemId) => {
        const cartData = { ...cartItems } // Use shallow copy
        if (cartData[itemId]) {
            cartData[itemId] += 1
        } else {
            cartData[itemId] = 1
        }
        setCartItems(cartData)
        if (user) {
            try {
                const { data } = await axios.post('/api/cart/add', { itemId }) 
                data.success ? toast.success(data.message) : toast.error(data.message)
            } catch (error) {
                toast.error(error.message)
            }
        }
    }

    // Getting total cart items
    const getCartCount = () => {
        let totalCount = 0
        for (const itemId in cartItems) {
            try {
                if (cartItems[itemId] > 0) {
                    totalCount += cartItems[itemId]
                }
            } catch (error) {
                console.log(error);
            }
        }
        return totalCount;
    }

    // Update the quantity of an item
    const updateQuantity = async (itemId, quantity) => {
        const cartData = { ...cartItems }
        if (quantity <= 0) {
            delete cartData[itemId] // Remove item entirely if quantity is zero or less
        } else {
            cartData[itemId] = quantity
        }
        setCartItems(cartData)

        if (user) {
            try {
                const { data } = await axios.post('/api/cart/update', { itemId, quantity })
                data.success ? toast.success(data.message) : toast.error(data.message)
            } catch (error) {
                toast.error(error.message)
            }
        }
    }

    // Getting total cart amount
    const getCartAmount = () => {
        let totalAmount = 0
        for (const itemId in cartItems) {
            if (cartItems[itemId] > 0) {
                let itemInfo = books.find((book) => book._id === itemId)
                if (itemInfo) {
                    totalAmount += itemInfo.offerPrice * cartItems[itemId]
                }
            }
        }
        return totalAmount
    }

    // Load user profile data
    const loadProfileData = async () => {
        if (!user) {
            navigate('/');
            return;
        }

        try {
            const { data } = await axios.get('/api/user/profile');
            if (data.success) {
                setProfileData({
                    name: data.user.name || '',
                    email: data.user.email || '',
                    phone: data.user.phone || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });

                // Parse phone number if exists
                if (data.user.phone) {
                    const matchedCode = countryCodes.find(c => data.user.phone.startsWith(c.code));
                    if (matchedCode) {
                        setSelectedCountryCode(matchedCode.code);
                        setPhoneNumber(data.user.phone.replace(matchedCode.code, ''));
                    } else {
                        setPhoneNumber(data.user.phone);
                    }
                }

                // Set profile image if exists
                if (data.user.profileImage) {
                    setImagePreview(data.user.profileImage);
                }
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // Handle profile image change
    const handleProfileImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    }

    // Handle phone number change
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Only numbers
        setPhoneNumber(value);
    }

    // Update profile data field
    const updateProfileField = (field, value) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value
        }));
    }

    // Submit profile update
    const submitProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);

        try {
            // Validate passwords if trying to change
            if (profileData.newPassword || profileData.confirmPassword) {
                if (!profileData.currentPassword) {
                    toast.error('Please enter your current password');
                    setProfileLoading(false);
                    return;
                }
                if (profileData.newPassword !== profileData.confirmPassword) {
                    toast.error('New passwords do not match');
                    setProfileLoading(false);
                    return;
                }
                if (profileData.newPassword.length < 8) {
                    toast.error('New password must be at least 8 characters');
                    setProfileLoading(false);
                    return;
                }
            }

            const formData = new FormData();
            formData.append('name', profileData.name);
            formData.append('email', profileData.email);
            formData.append('phone', selectedCountryCode + phoneNumber);

            if (profileData.currentPassword && profileData.newPassword) {
                formData.append('currentPassword', profileData.currentPassword);
                formData.append('newPassword', profileData.newPassword);
            }

            if (profileImage) {
                formData.append('profileImage', profileImage);
            }

            const { data } = await axios.put('/api/user/update-profile', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (data.success) {
                toast.success('Profile updated successfully');
                await fetchUser();

                // Clear password fields
                setProfileData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                }));

                // Clear profile image file (keep preview)
                setProfileImage(null);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setProfileLoading(false);
        }
    }

    // Cancel profile update
    const cancelProfileUpdate = () => {
        navigate('/');
    }

    // Reset profile form
    const resetProfileForm = () => {
        setProfileData({
            name: '',
            email: '',
            phone: '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });
        setProfileImage(null);
        setImagePreview(null);
        setSelectedCountryCode('+1');
        setPhoneNumber('');
    }

    const fetchShelves = async () => {
        try {
            const { data } = await axios.get('/api/shelf/list')
            if (data.success) {
                setShelves(data.shelves)
            }
        } catch (error) {
            console.error('Error fetching shelves:', error)
        }
    }

    const createShelf = async (shelfData) => {
        try {
            const { data } = await axios.post('/api/shelf/create', shelfData)
            if (data.success) {
                await fetchShelves()
                return { success: true, message: data.message, shelf: data.shelf }
            }
            return { success: false, message: data.message }
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message }
        }
    }

    const assignBookToShelf = async (shelfId, bookId) => {
        try {
            const { data } = await axios.post('/api/shelf/assign-book', { shelfId, bookId })
            if (data.success) {
                await fetchShelves()
                await fetchBooks()
                return { success: true, message: data.message, shelf: data.shelf }
            }
            return { success: false, message: data.message }
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message }
        }
    }

    const removeBookFromShelf = async (shelfId, bookId) => {
        try {
            const { data } = await axios.delete(`/api/shelf/remove-book/${shelfId}/${bookId}`)
            if (data.success) {
                await fetchShelves()
                await fetchBooks()
                return { success: true, message: data.message }
            }
            return { success: false, message: data.message }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    // Fuerza Bruta con modo analyzeAll
    const findDangerousCombinations = async (shelfId, analyzeAll = false) => {
        try {
            const { data } = await axios.get(
                `/api/shelf/dangerous-combinations/${shelfId}?analyzeAll=${analyzeAll}`
            )
            if (data.success) {
                return {
                    success: true,
                    combinations: data.combinations,
                    count: data.count,
                    groupedByCategory: data.groupedByCategory
                }
            }
            return { success: false, message: data.message }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    // Backtracking con modo analyzeAll
    const optimizeShelf = async (shelfId, analyzeAll = false) => {
        try {
            const { data } = await axios.get(
                `/api/shelf/optimize/${shelfId}?analyzeAll=${analyzeAll}`
            )
            if (data.success) {
                return {
                    success: true,
                    bestCombination: data.bestCombination,
                    maxWeight: data.maxWeight,
                    recommendation: data.recommendation,
                    currentVsOptimal: data.currentVsOptimal
                }
            }
            return { success: false, message: data.message }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    useEffect(() => {
        fetchBooks()
        fetchUser()
        fetchAdmin()
    }, [])

    const value = { books, navigate, user, setUser, currency, searchQuery, setSearchQuery, cartItems, setCartItems, addToCart, getCartCount, getCartAmount, updateQuantity, method, setMethod, delivery_charges, showUserLogin, setShowUserLogin, isAdmin, setIsAdmin, axios, fetchBooks, fetchUser, logoutUser, profileData, setProfileData, profileImage, setProfileImage, imagePreview, setImagePreview, profileLoading, setProfileLoading, countryCodes, selectedCountryCode, setSelectedCountryCode, phoneNumber, setPhoneNumber, loadProfileData, handleProfileImageChange, handlePhoneChange, updateProfileField, submitProfileUpdate, cancelProfileUpdate, resetProfileForm, shelves, fetchShelves, createShelf, assignBookToShelf, removeBookFromShelf, findDangerousCombinations, optimizeShelf }

    return (
        <ShopContext.Provider value={value}>
            {children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider