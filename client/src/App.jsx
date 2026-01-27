import { useContext } from 'react'
import { Toaster } from 'react-hot-toast'
import { Routes, Route, useLocation } from 'react-router-dom'
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
import Sidebar from './components/admin/Sidebar'
import AdminLogin from './components/admin/AdminLogin'
import AddProduct from './pages/admin/AddProduct'
import ProductList from './pages/admin/ProductList'
import Orders from './pages/admin/Orders'
import Loading from './pages/Loading'
import Profile from './pages/Profile'
import Shelves from './pages/admin/Shelves'
import MyReservations from './pages/MyReservations'
import MyLoans from './pages/MyLoans'
import AdminLoans from './pages/admin/AdminLoans'

const App = () => {

  const {showUserLogin, isAdmin} = useContext(ShopContext)
  const isAdminPath = useLocation().pathname.includes('admin')

  return (
    <main>
      {showUserLogin && <Login />}
      {!isAdminPath && <Header />}
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
        <Route path='/my-loans' element={<MyLoans />} />
        <Route path='/my-reservations' element={<MyReservations />} />
        <Route path='/loader' element={<Loading />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/admin' element={isAdmin ? <Sidebar /> : <AdminLogin />}>
          <Route index element={isAdmin ? <AddProduct /> : null} />
          <Route path='list' element={<ProductList/>} />
          <Route path='orders' element={<Orders />} />
          <Route path='shelves' element={<Shelves />} />
          <Route path='loans' element={<AdminLoans />} />
        </Route>
      </Routes>
      {!isAdminPath && <Footer />}
    </main>
  )
}

export default App