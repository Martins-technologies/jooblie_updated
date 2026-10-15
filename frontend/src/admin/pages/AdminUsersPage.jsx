import { useCallback, useEffect, useState, useMemo } from 'react';
import { Users, Search, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { LoadingState } from '../../shared/components/StatusMessage';
import { useAuth } from '../../shared/context/AuthContext';
import { showErrorToast, showSuccessToast } from '../../shared/lib/toast';

export default function AdminUsersPage() {
  const auth = useAuth();
  const [state, setState] = useState({ loading: true, error: '', users: [] });
  const [updatingId, setUpdatingId] = useState(null);
  
  // Filters State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      // First try canonical /admin/users endpoint with limit=100
      let usersList = [];
      try {
        const data = await apiRequest('/admin/users?limit=100', { auth: true });
        usersList = data.items || [];
      } catch {
        // Fallback to /admin/dashboard
        const dashData = await apiRequest('/admin/dashboard', { auth: true });
        usersList = dashData.recentUsers || dashData.users || [];
      }

      setState({ loading: false, error: '', users: usersList });
    } catch (error) {
      setState({ loading: false, error: error.message, users: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle changing a user's role via PATCH /api/admin/users/:userId/role
  const handleRoleChange = async (userId, targetUserEmail, newRole) => {
    if (userId === auth.user?.id) {
      showErrorToast('You cannot alter your own administrator role.');
      return;
    }

    setUpdatingId(userId);

    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        auth: true,
        body: { role: newRole },
      });

      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      }));

      showSuccessToast(`Updated role for ${targetUserEmail} to ${formatRole(newRole)}.`);
    } catch (err) {
      showErrorToast(err, 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Frontend Filter and Search logic
  const filteredUsers = useMemo(() => {
    return state.users.filter(user => {
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      
      // Name or Email search
      if (search) {
        const query = search.toLowerCase();
        const nameMatch = user.full_name?.toLowerCase().includes(query);
        const emailMatch = user.email?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) return false;
      }
      
      return true;
    });
  }, [state.users, roleFilter, search]);

  // Helper function to format role names (e.g. "job_seeker" -> "Job Seeker")
  function formatRole(role) {
    if (!role) return 'Unknown';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  return (
    <DashboardLayout title="User Directory" subtitle="Review registered user accounts, manage platform roles, and monitor account access.">
      <div className="dashboard-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
        
        {/* FILTERS & SEARCH BAR */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by name or email..." 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} 
            />
          </div>

          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '180px', outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Roles</option>
            <option value="job_seeker">Job Seekers</option>
            <option value="recruiter">Recruiters</option>
            <option value="admin">Administrators</option>
          </select>

        </div>

        {/* USERS TABLE */}
        {state.loading ? (
          <LoadingState label="Loading user directory..." />
        ) : state.error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
            Error loading users: {state.error}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1rem' }}>User Profile</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Assigned Role & Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isCurrentAuthUser = user.id === auth.user?.id;
                  const isUpdating = updatingId === user.id;

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      
                      {/* PROFILE INFO */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isCurrentAuthUser ? '#fef3c7' : '#eff6ff', color: isCurrentAuthUser ? '#d97706' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ color: '#111827' }}>{user.full_name || 'Unnamed User'}</strong>
                              {isCurrentAuthUser && (
                                <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <ShieldCheck size={12} /> You
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{user.email || 'No email provided'}</span>
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '999px', backgroundColor: user.status === 'active' ? '#dcfce7' : '#f3f4f6', color: user.status === 'active' ? '#16a34a' : '#4b5563', textTransform: 'capitalize', fontWeight: 'bold' }}>
                          {user.status || 'Active'}
                        </span>
                      </td>

                      {/* INTERACTIVE ROLE SELECTOR */}
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {isCurrentAuthUser ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e40af', backgroundColor: '#dbeafe', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                              Administrator (You)
                            </span>
                          </div>
                        ) : (
                          <select
                            value={user.role || 'job_seeker'}
                            disabled={isUpdating}
                            onChange={(e) => handleRoleChange(user.id, user.email, e.target.value)}
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              color: user.role === 'admin' ? '#1e40af' : user.role === 'recruiter' ? '#065f46' : '#374151',
                              backgroundColor: user.role === 'admin' ? '#eff6ff' : user.role === 'recruiter' ? '#ecfdf5' : '#ffffff',
                              border: user.role === 'admin' ? '1.5px solid #bfdbfe' : user.role === 'recruiter' ? '1.5px solid #a7f3d0' : '1.5px solid #d1d5db',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: isUpdating ? 'wait' : 'pointer',
                              outline: 'none',
                              opacity: isUpdating ? 0.6 : 1,
                              transition: 'all 0.15s ease'
                            }}
                            title="Change user's platform role"
                          >
                            <option value="job_seeker">Job Seeker</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="admin">Administrator</option>
                          </select>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b7280' }}>
            <Users size={40} color="#9ca3af" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: 0, color: '#111827' }}>No Users Found</h3>
            <p>No registered accounts match your current filters.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
