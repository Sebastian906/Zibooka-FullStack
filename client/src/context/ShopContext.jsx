import React, { createContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dummyBooks } from '../assets/data'
import axios from 'axios'

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

    // Fetch all books
    const fetchBooks = () => {
        setBooks(dummyBooks)
    }

    // Fetch Admin
    const fetchAdmin = async () => {
        try {
            const { data } = await axios.get('/api/admin/is-admin')
            setIsAdmin(data.success)
        } catch (error) {
            setIsAdmin(false);
        }
    }

    // Adding items to cart
    const addToCart = (itemId) => {
        const cartData = {...cartItems} // Use shallow copy
        if (cartData[itemId]) {
            cartData[itemId] += 1
        } else {
            cartData[itemId] = 1
        }
        setCartItems(cartData)
    }

    // Getting total cart items
    const getCartCount = () => {
        let totalCount = 0
        for(const itemId in cartItems) {
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
    const updateQuantity = (itemId, quantity) => {
        const cartData = {...cartItems}
        cartData[itemId] = quantity
        setCartItems(cartData)
    }

    // Getting total cart amount
    const getCartAmount = () => {
        let totalAmount = 0
        for(const itemId in cartItems) {
            if (cartItems[itemId] > 0) {
                let itemInfo = books.find((book) => book._id === itemId)
                if (itemInfo) {
                    totalAmount += itemInfo.offerPrice * cartItems[itemId]
                }
            }
        }
        return totalAmount
    }

    useEffect(() => {
        fetchBooks()
        fetchAdmin()
    }, [])

    const value = {books, navigate, user, setUser, currency, searchQuery, setSearchQuery, cartItems, setCartItems, addToCart, getCartCount, getCartAmount, updateQuantity, method, setMethod, delivery_charges, showUserLogin, setShowUserLogin, isAdmin, setIsAdmin, axios}

    return (
        <ShopContext.Provider value={value}>
            {children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider