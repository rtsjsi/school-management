-- Recreate the trigger on auth.users that creates a profile row on signup.
-- This trigger is lost when cloning dev→main because the clone only restores the public
-- schema; the trigger lives on auth.users and is dropped when public.handle_new_user is dropped.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
