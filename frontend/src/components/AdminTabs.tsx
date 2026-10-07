import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminOrders } from '../context/OrdersContext';
import { useMenu } from '../context/MenuContext';
import { Link, navigate, useRoute } from '../lib/router';
import { isAdmin, isStaff } from '../lib/roles';

/**
 * Redirects to login if signed out.
 * isStaff = Admin or Store Manager (dashboard access). isAdmin = Admin only (staff accounts, menu reset).
 * Customers get neither, and the API enforces the same rules.
 */
export function useAdminGuard(next: string) {
  const { user, checking } = useAuth();
  useEffect(() => {
    if (!user && !checking) navigate(`/login?next=${next}`);
  }, [user, checking, next]);
  return { user, isStaff: isStaff(user), isAdmin: isAdmin(user) };
}

export function StaffOnly({ adminOnly = false }: { adminOnly?: boolean }) {
  return (
    <div className="page container narrow center-page">
      <h1>{adminOnly ? 'Admins only' : 'Staff only'}</h1>
      <p className="muted">
        {adminOnly
          ? 'Only an Admin can manage staff accounts.'
          : 'You need an Admin or Store Manager account to view this page.'}
      </p>
      <Link to="/" className="btn btn-primary">Back home</Link>
    </div>
  );
}

/** Fetches the new-order count itself (used on pages that don't already load orders). */
export function AdminTabsWithCount() {
  const { orders } = useAdminOrders(true);
  return <AdminTabs newOrders={orders.filter((o) => o.status === 'Received').length} />;
}

export default function AdminTabs({ newOrders }: { newOrders: number }) {
  const { path } = useRoute();
  const { items } = useMenu();
  const { user } = useAuth();
  const hidden = items.filter((m) => m.available === false).length;

  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      <Link to="/admin" className={path === '/admin' ? 'active' : ''}>
        Orders {newOrders > 0 && <span className="badge">{newOrders} new</span>}
      </Link>
      <Link to="/admin/menu" className={path === '/admin/menu' ? 'active' : ''}>
        Menu items {hidden > 0 && <span className="badge muted-badge">{hidden} hidden</span>}
      </Link>
      {isAdmin(user) && (
        <Link to="/admin/staff" className={path === '/admin/staff' ? 'active' : ''}>
          Staff
        </Link>
      )}
    </nav>
  );
}
