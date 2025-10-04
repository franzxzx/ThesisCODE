import { supabase } from './supabase';

/**
 * Creates an admin user from an existing authenticated user
 * This function should be called by a system administrator
 */
export const createAdminUser = async (adminEmail: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('create_admin_user', {
      admin_email: adminEmail
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create admin user' 
    };
  }
};

/**
 * Gets the current user's role from the database
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.role || null;
  } catch (error) {
    console.error('Error getting current user role:', error);
    return null;
  }
};

/**
 * Checks if the current user has admin privileges
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const role = await getCurrentUserRole();
  return role === 'admin';
};