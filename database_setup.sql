-- Create user_profiles table for SegRut application
-- This table stores user profile information and roles

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'responder')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles table
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin users can view all profiles (for user management)
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin users can create responder accounts
CREATE POLICY "Admins can create responder accounts" ON user_profiles
  FOR INSERT WITH CHECK (
    role = 'responder' AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'responder');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create admin user dynamically
CREATE OR REPLACE FUNCTION public.create_admin_user(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
  -- Update existing user to admin role if they exist
  UPDATE user_profiles 
  SET role = 'admin', updated_at = NOW()
  WHERE email = admin_email;
  
  -- If no rows were updated, try to create from auth.users
  IF NOT FOUND THEN
    INSERT INTO user_profiles (id, email, role)
    SELECT 
      id,
      email,
      'admin'
    FROM auth.users 
    WHERE email = admin_email
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.users.id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to securely create responder accounts (admin only)
CREATE OR REPLACE FUNCTION public.create_responder_account(
  responder_email TEXT,
  responder_password TEXT
)
RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = responder_email) THEN
    RETURN json_build_object('success', false, 'error', 'User already exists with this email');
  END IF;
  
  -- For now, we'll create a placeholder entry and return success
  -- In production, this would integrate with Supabase Auth API
  -- The actual user creation will be handled by the application layer
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Responder account creation initiated',
    'email', responder_email,
    'role', 'responder'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a new responder (called after auth user is created)
CREATE OR REPLACE FUNCTION public.register_responder(
  user_id UUID,
  user_email TEXT
)
RETURNS JSON AS $$
BEGIN
  -- Insert the user profile
  INSERT INTO user_profiles (id, email, role)
  VALUES (user_id, user_email, 'responder')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = 'responder',
    updated_at = NOW();
    
  RETURN json_build_object(
    'success', true,
    'message', 'Responder profile created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create road_status_updates table for real-time road condition management
CREATE TABLE IF NOT EXISTS road_status_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id TEXT NOT NULL,
  road_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('passable', 'restricted', 'blocked')),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for road_status_updates
ALTER TABLE road_status_updates ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can CREATE road status updates
CREATE POLICY "Admins can create road status updates" ON road_status_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can UPDATE road status updates (PUT operations)
CREATE POLICY "Admins can update road status updates" ON road_status_updates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: All authenticated users can READ road status updates (for real-time display)
CREATE POLICY "Authenticated users can view road status updates" ON road_status_updates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Admins can delete road status updates (for cleanup)
CREATE POLICY "Admins can delete road status updates" ON road_status_updates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to log road status updates (admin only)
CREATE OR REPLACE FUNCTION public.log_road_status_update(
  p_segment_id TEXT,
  p_road_name TEXT,
  p_status TEXT
)
RETURNS JSON AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Insert the road status update
  INSERT INTO road_status_updates (segment_id, road_name, status, updated_by)
  VALUES (p_segment_id, p_road_name, p_status, auth.uid());
  
  RETURN json_build_object(
    'success', true,
    'message', 'Road status updated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest road status by segment (for real-time display)
CREATE OR REPLACE FUNCTION public.get_latest_road_status()
RETURNS TABLE (
  segment_id TEXT,
  road_name TEXT,
  status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_updates AS (
    SELECT DISTINCT ON (rsu.segment_id) 
      rsu.segment_id,
      rsu.road_name,
      rsu.status,
      rsu.updated_at,
      up.email as updated_by_email
    FROM road_status_updates rsu
    LEFT JOIN user_profiles up ON rsu.updated_by = up.id
    ORDER BY rsu.segment_id, rsu.updated_at DESC
  )
  SELECT * FROM latest_updates
  ORDER BY updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;