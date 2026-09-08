import { useCallback, useEffect, useState, useMemo } from 'react';
import { Users, Search } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { LoadingState } from '../../shared/components/StatusMessage';

export default function AdminUsersPage() {
  const [state, setState] = useState({ loading: true, error: '', users: [] });
  
  // Filters State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      // Backend se saare users fetch ho rahe hain
      const data = await apiRequest('/admin/dashboard', { auth: true });
      setState({ loading: false, error: '', users: data.recentUsers || data.users || [] });
    } catch (error) {
      setState({ loading: false, error: error.message, users: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Frontend par Filter aur Search logic
  const filteredUsers = useMemo(() => {
    return state.users.filter(user => {
      // Role ke hisab se filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      
      // Name ya Email ke hisab se search
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
  const formatRole = (role) => {
    if (!role) return 'Unknown';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <DashboardLayout title="User Directory" subtitle="Review registered user accounts, their statuses, and platform roles.">
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
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Assigned Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    
                    {/* PROFILE INFO */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <strong style={{ display: 'block', color: '#111827' }}>{user.full_name || 'Unnamed User'}</strong>
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

                    {/* VIEW ONLY ROLE */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', backgroundColor: '#f9fafb', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        {formatRole(user.role)}
                      </span>
                    </td>

                  </tr>
                ))}
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
