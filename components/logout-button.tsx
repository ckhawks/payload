import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button variant="ghost" size="sm" type="submit">
        Sign out
      </Button>
    </form>
  );
}
