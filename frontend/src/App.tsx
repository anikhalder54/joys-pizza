import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import { Footer } from './components/ContactSection';
import { useRef } from 'react';
import { match, useRoute } from './lib/router';
import { useCart } from './context/CartContext';
import { CheckIcon } from './components/Icons';

import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { MyOrdersPage, OrderDetailPage } from './pages/OrdersPages';
import AdminPage from './pages/AdminPage';
import AdminMenuPage from './pages/AdminMenuPage';
import AdminStaffPage from './pages/AdminStaffPage';
import { ContactPage, LocationPage, NotFoundPage } from './pages/InfoPages';

function Routes() {
  const { path } = useRoute();
  switch (path) {
    case '/':
      return <HomePage />;
    case '/menu':
      return <MenuPage />;
    case '/checkout':
      return <CheckoutPage />;
    case '/login':
      return <LoginPage />;
    case '/signup':
      return <SignupPage />;
    case '/orders':
      return <MyOrdersPage />;
    case '/admin':
      return <AdminPage />;
    case '/admin/menu':
      return <AdminMenuPage />;
    case '/admin/staff':
      return <AdminStaffPage />;
    case '/location':
      return <LocationPage />;
    case '/contact':
      return <ContactPage />;
  }
  const order = match('/order/:id', path);
  if (order) return <OrderDetailPage id={order.id} />;
  return <NotFoundPage />;
}

function Toast() {
  const { lastAdded, open } = useCart();
  const label = useRef('');
  if (lastAdded) label.current = lastAdded;
  return (
    <div className={`toast ${lastAdded ? 'show' : ''}`} role="status" aria-live="polite" aria-hidden={!lastAdded}>
      <CheckIcon width={16} height={16} />
      <span>Added <strong>{label.current}</strong></span>
      <button onClick={open}>View cart</button>
    </div>
  );
}

export default function App() {
  const { path } = useRoute();
  const hideFooter = path === '/login' || path === '/signup';
  return (
    <>
      <Navbar />
      <main>
        <Routes />
      </main>
      {!hideFooter && <Footer />}
      <CartDrawer />
      <Toast />
    </>
  );
}
