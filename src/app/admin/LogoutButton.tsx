export function LogoutButton() {
  return (
    <form action="/api/admin/logout" method="post">
      <button className="button-link secondary admin-logout" type="submit">
        Logout
      </button>
    </form>
  );
}
