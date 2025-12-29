import React, { useContext } from 'react'
import { Toaster } from 'react-hot-toast'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Shop from './pages/Shop'
import CategoryShop from './pages/CategoryShop'
import ProductDetails from './pages/ProductDetails'
import Blog from './pages/Blog'
import Contact from './pages/Contact'
import Cart from './pages/Cart'
import Header from './components/Header'
import Footer from './components/Footer'
import AddressForm from './pages/AddressForm'
import MyOrders from './pages/MyOrders'
import { ShopContext } from './context/ShopContext'
import Login from './pages/Login'

const App = () => {

  const {showUserLogin} = useContext(ShopContext)

  return (
    <main>
      {showUserLogin && <Login />}
      <Header />
      <Toaster position='bottom-right'/>
      <Routes>
        <Route path='/' element={<Home />} /> 
        <Route path='/shop' element={<Shop />} />
        <Route path='/shop/:category' element={<CategoryShop />} />
        <Route path='/shop/:category/:id' element={<ProductDetails />} />
        <Route path='/blog' element={<Blog />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/cart' element={<Cart />} />
        <Route path='/address-form' element={<AddressForm />} />
        <Route path='/my-orders' element={<MyOrders />} />
      </Routes>
      <Footer />
    </main>
  )
}

export default App