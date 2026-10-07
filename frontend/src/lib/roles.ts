import type { PublicUser, Role } from '../types';

/** Admin or Store Manager — can use the kitchen dashboard and manage the menu. */
export const isStaff = (u?: Pick<PublicUser, 'role'> | null) => u?.role === 'admin' || u?.role === 'store_manager';

/** Only Admins can create / remove Store Manager accounts and reset the menu. */
export const isAdmin = (u?: Pick<PublicUser, 'role'> | null) => u?.role === 'admin';

export const roleLabel = (r: Role) => (r === 'admin' ? 'Admin' : r === 'store_manager' ? 'Store Manager' : 'Customer');
