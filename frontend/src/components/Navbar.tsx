import { useEffect, useRef, useState } from 'react';
import { Link, navigate, useRoute } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { RESTAURANT } from '../data/restaurant';
import { CartIcon, CloseIcon, MenuIcon, PinIcon, UserIcon } from './Icons';
import { isAdmin, isStaff } from '../lib/roles';

export default function Navbar() {
  const { path } = useRoute();
  const { user, logout } = useAuth();
  const cart = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
  }, [path]);

  useEffect(() => {
    if (!userMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setUserMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [userMenu]);

  const active = (p: string) => (path === p ? 'nav-link active' : 'nav-link');

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label={`${RESTAURANT.name} home`}>
          <img src="/logo.webp" alt={RESTAURANT.name} width={78} height={60} className="brand-logo" />
          <span className="brand-text">
            <small>{RESTAURANT.tagline}</small>
          </span>
        </Link>

        <nav className={`nav-links ${mobileOpen ? 'open' : ''}`} aria-label="Main">
          <Link to="/location" className={active('/location')}>
            <PinIcon width={16} height={16} /> Location
          </Link>
          <Link to="/menu" className={active('/menu')}>Menu</Link>
          <Link to="/contact" className={active('/contact')}>Contact</Link>
          {user && (
            <Link to={isStaff(user) ? '/admin' : '/orders'} className={isStaff(user) ? (path.startsWith('/admin') ? 'nav-link active' : 'nav-link') : active('/orders')}>
              {isStaff(user) ? 'Dashboard' : 'My Orders'}
            </Link>
          )}

          {!user ? (
            <Link to="/login" className="btn btn-outline btn-sm nav-signin">
              <UserIcon width={16} height={16} /> Sign In
            </Link>
          ) : (
            <div className="user-menu" ref={menuRef}>
              <button className="avatar-btn" onClick={() => setUserMenu((v) => !v)} aria-expanded={userMenu}>
                <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="avatar-name">{user.name.split(' ')[0]}</span>
                {isStaff(user) && <span className="pill pill-dark">{user.role === 'admin' ? 'Admin' : 'Manager'}</span>}
              </button>
              {userMenu && (
                <div className="dropdown">
                  <div className="dropdown-head">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </div>
                  {isStaff(user) && <Link to="/admin">Order dashboard</Link>}
                  {isStaff(user) && <Link to="/admin/menu">Manage menu</Link>}
                  {isAdmin(user) && <Link to="/admin/staff">Manage staff</Link>}
                  <Link to="/orders">My orders</Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="nav-actions">
          <button className="cart-btn" onClick={cart.open} aria-label={`Open cart, ${cart.count} items`}>
            <CartIcon />
            {cart.count > 0 && <span className="cart-count">{cart.count}</span>}
          </button>
          <button
            className="hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
