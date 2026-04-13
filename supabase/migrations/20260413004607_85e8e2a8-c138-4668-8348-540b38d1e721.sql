-- Allow admins to view all lesson progress
CREATE POLICY "Admins can view all progress"
  ON public.lesson_progress FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all user roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
