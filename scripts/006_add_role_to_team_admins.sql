-- Add role column to team_admins for future role support (admin, viewer, etc.)
ALTER TABLE public.team_admins 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';

-- Add constraint to ensure valid roles (can be extended later)
ALTER TABLE public.team_admins
DROP CONSTRAINT IF EXISTS team_admins_role_check;

ALTER TABLE public.team_admins
ADD CONSTRAINT team_admins_role_check CHECK (role IN ('admin'));

-- Create index for role queries (useful when filtering by role)
CREATE INDEX IF NOT EXISTS idx_team_admins_role ON public.team_admins(owner_id, role);
