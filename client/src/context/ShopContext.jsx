import { createContext, useEffect, useMemo, useState } from 'react'
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
    const [reportLoading, setReportLoading] = useState(false);

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

    // Obtiene categorías únicas de los libros
    const availableCategories = useMemo(() => {
        const categories = [...new Set(books.map(book => book.category))];
        return categories.sort();
    }, [books]);

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

    // Búsqueda Lineal usando el endpoint del backend
    const searchByTitleOrAuthor = async (searchTerm, searchBy = 'title') => {
        try {
            const { data } = await axios.post('/api/product/search/linear', {
                searchTerm,
                searchBy
            });

            if (data.success) {
                return data.results;
            }
            return [];
        } catch (error) {
            console.error('Linear search error:', error);
            return [];
        }
    }

    // Búsqueda Binaria usando el endpoint del backend
    const searchByISBN = async (isbn) => {
        try {
            const { data } = await axios.post('/api/product/search/binary', {
                isbn
            });

            if (data.success) {
                return {
                    found: data.found,
                    product: data.product
                };
            }
            return { found: false, product: null };
        } catch (error) {
            console.error('Binary search error:', error);
            return { found: false, product: null };
        }
    }

    // Ordena productos por precio usando Merge Sort del backend
    const sortProductsByPrice = async (ascending = true) => {
        try {
            const { data } = await axios.get('/api/product/sort-by-price', {
                params: { ascending }
            });

            if (data.success) {
                return data.products;
            }
            return [];
        } catch (error) {
            console.error('Merge sort error:', error);
            return [];
        }
    }

    // Aplica filtros y ordenamiento a los libros
    const applyFiltersAndSort = (booksList, filters) => {
        let result = [...booksList];

        // 1. Búsqueda por texto en nombre del libro
        if (filters.searchQuery && filters.searchQuery.length > 0) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter((book) =>
                book.name.toLowerCase().includes(query)
            );
        }

        // 2. Filtro por categoría
        if (filters.category && filters.category !== 'all') {
            result = result.filter((book) => book.category === filters.category);
        }

        // 3. Búsqueda por autor (filtro en frontend)
        if (filters.authorSearch && filters.authorSearch.length > 0) {
            const authorQuery = filters.authorSearch.toLowerCase();
            result = result.filter((book) =>
                book.author && book.author.toLowerCase().includes(authorQuery)
            );
        }

        // 4. Ordenamiento (SIMPLIFICADO - sin value-asc/desc)
        switch (filters.sortBy) {
            case 'title-asc':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'title-desc':
                result.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'price-asc':
            case 'price-desc':
                // Ordenamiento por precio usando sort nativo
                result.sort((a, b) =>
                    filters.sortBy === 'price-asc'
                        ? a.offerPrice - b.offerPrice
                        : b.offerPrice - a.offerPrice
                );
                break;
            default:
                // Default: mantener orden original
                break;
        }

        return result;
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

    // Get the current profile
    const getUserProfile = async () => {
        try {
            const { data } = await axios.get('/api/user/profile')
            if (data.success) {
                setUser(data.user)
            }
        } catch (error) {
            console.error('Error getting user profile:', error)
        }
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

    // Obtiene el historial de préstamos del usuario (Stack - LIFO)
    const getUserLoans = async () => {
        try {
            const { data } = await axios.get('/api/loan/history')
            if (data.success) {
                return data.loans
            }
            return []
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading loans')
            return []
        }
    }

    // Obtiene las estadísticas de préstamos del usuario
    const getUserLoanStats = async () => {
        try {
            const { data } = await axios.get('/api/loan/stats')
            if (data.success) {
                return data.stats
            }
            return {
                total: 0,
                active: 0,
                completed: 0,
                overdue: 0,
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading loan stats')
            return {
                total: 0,
                active: 0,
                completed: 0,
                overdue: 0,
            }
        }
    }

    // Crea un nuevo préstamo para un libro
    const createLoan = async (bookId) => {
        try {
            const { data } = await axios.post('/api/loan/create', {
                bookId,
            })

            if (data.success) {
                toast.success(data.message || 'Loan created successfully')
                // Recargar la lista de libros para actualizar stock
                await fetchBooks()
                return data
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating loan')
            throw error
        }
    }

    // Devuelve un libro prestado (Binary Search integrado en backend)
    const returnBook = async (loanId) => {
        try {
            const { data } = await axios.post(`/api/loan/return/${loanId}`)

            if (data.success) {
                toast.success(data.message || 'Book returned successfully')
                // Recargar la lista de libros para actualizar stock
                await fetchBooks()
                return data
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error returning book')
            throw error
        }
    }

    // Obtiene todos los préstamos del sistema (Solo Admin)
    const getAllLoans = async () => {
        try {
            const { data } = await axios.get('/api/loan/admin/all')
            if (data.success) {
                return data.loans
            }
            return []
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading all loans')
            return []
        }
    }

    // Obtiene las estadísticas de reservas del usuario
    const getUserReservationStats = async () => {
        try {
            const { data } = await axios.get('/api/reservation/my-reservations')
            if (data.success) {
                return data.stats
            }
            return {
                total: 0,
                pending: 0,
                fulfilled: 0,
                cancelled: 0,
                expired: 0,
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading reservation stats')
            return {
                total: 0,
                pending: 0,
                fulfilled: 0,
                cancelled: 0,
                expired: 0,
            }
        }
    }

    // Obtiene la lista completa de reservas del usuario con detalles del libro
    const getUserReservationList = async () => {
        try {
            const { data } = await axios.get('/api/reservation/user-list')
            if (data.success) {
                return data.reservations
            }
            return []
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading reservations')
            return []
        }
    }

    // Obtiene la lista de espera (waiting list) para un libro específico
    const getWaitingList = async (bookId) => {
        try {
            const { data } = await axios.get(`/api/reservation/waiting-list/${bookId}`)
            if (data.success) {
                return data.waitingList
            }
            return []
        } catch (error) {
            console.error('Error loading waiting list:', error)
            return []
        }
    }

    // Crea una nueva reserva para un libro
    const createReservation = async (bookId) => {
        try {
            const { data } = await axios.post('/api/reservation/add', {
                bookId,
            })

            if (data.success) {
                toast.success(data.message || 'Reservation created successfully')
                return data
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating reservation')
            throw error
        }
    }

    // Cancela una reserva
    const cancelReservation = async (reservationId) => {
        try {
            const { data } = await axios.delete(`/api/reservation/cancel/${reservationId}`)

            if (data.success) {
                toast.success(data.message || 'Reservation cancelled successfully')
                return data
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error cancelling reservation')
            throw error
        }
    }

    // Descargar reporte de inventario en PDF
    const downloadInventoryPDF = async (category = '') => {
        try {
            setReportLoading(true);
            const params = category ? { category } : {};

            const response = await axios.get('/api/reports/inventory/pdf', {
                params,
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = category
                ? `inventario-${category}-${Date.now()}.pdf`
                : `inventario-completo-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Reporte PDF descargado exitosamente');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error(error.response?.data?.message || 'Error al descargar reporte PDF');
        } finally {
            setReportLoading(false);
        }
    };

    // Descargar reporte de inventario en XLSX
    const downloadInventoryXLSX = async (category = '') => {
        try {
            setReportLoading(true);
            const params = category ? { category } : {};

            const response = await axios.get('/api/reports/inventory/xlsx', {
                params,
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = category
                ? `inventario-${category}-${Date.now()}.xlsx`
                : `inventario-completo-${Date.now()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Reporte Excel descargado exitosamente');
        } catch (error) {
            console.error('Error downloading XLSX:', error);
            toast.error(error.response?.data?.message || 'Error al descargar reporte Excel');
        } finally {
            setReportLoading(false);
        }
    };

    // Descargar reporte de préstamos en PDF
    const downloadLoansPDF = async (dateFrom = '', dateTo = '') => {
        try {
            setReportLoading(true);
            const params = {};
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const response = await axios.get('/api/reports/loans/pdf', {
                params,
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `prestamos-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Reporte de préstamos PDF descargado exitosamente');
        } catch (error) {
            console.error('Error downloading loans PDF:', error);
            toast.error(error.response?.data?.message || 'Error al descargar reporte de préstamos');
        } finally {
            setReportLoading(false);
        }
    };

    // Descargar reporte de préstamos en XLSX
    const downloadLoansXLSX = async (dateFrom = '', dateTo = '') => {
        try {
            setReportLoading(true);
            const params = {};
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const response = await axios.get('/api/reports/loans/xlsx', {
                params,
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `prestamos-${Date.now()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Reporte de préstamos Excel descargado exitosamente');
        } catch (error) {
            console.error('Error downloading loans XLSX:', error);
            toast.error(error.response?.data?.message || 'Error al descargar reporte de préstamos');
        } finally {
            setReportLoading(false);
        }
    };

    // Obtener vista previa de datos de recursión para todas las categorías
    const getRecursionPreview = async () => {
        try {
            const { data } = await axios.get('/api/reports/recursion/preview');

            if (data.success) {
                return data.data || [];
            }

            toast.error(data.message || 'Error al cargar datos de recursión');
            return [];
        } catch (error) {
            console.error('Error fetching recursion preview:', error);
            toast.error(error.response?.data?.message || 'Error al cargar datos de recursión');
            return [];
        }
    }

    useEffect(() => {
        fetchBooks()
        fetchUser()
        fetchAdmin()
    }, [])

    const value = {
        books, navigate, user, setUser, currency, searchQuery, setSearchQuery, cartItems, setCartItems, addToCart, getCartCount, getCartAmount, updateQuantity, method, setMethod, delivery_charges, showUserLogin, setShowUserLogin, isAdmin, setIsAdmin, axios, fetchBooks, fetchUser, logoutUser, availableCategories, searchByTitleOrAuthor, searchByISBN, sortProductsByPrice, applyFiltersAndSort, profileData, setProfileData, profileImage, setProfileImage, imagePreview, setImagePreview, profileLoading, setProfileLoading, countryCodes, selectedCountryCode, setSelectedCountryCode, phoneNumber, setPhoneNumber, getUserProfile, loadProfileData, handleProfileImageChange, handlePhoneChange, updateProfileField, submitProfileUpdate, cancelProfileUpdate, resetProfileForm, shelves, fetchShelves, createShelf, assignBookToShelf, removeBookFromShelf, findDangerousCombinations, optimizeShelf, getUserLoans, getUserLoanStats, createLoan, returnBook, getAllLoans, getUserReservationStats, getUserReservationList, getWaitingList, createReservation, cancelReservation, reportLoading, downloadInventoryPDF, downloadInventoryXLSX, downloadLoansPDF, downloadLoansXLSX, getRecursionPreview }

    return (
        <ShopContext.Provider value={value}>
            {children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider