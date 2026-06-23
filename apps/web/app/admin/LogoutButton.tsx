"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="fixed top-3 right-3 z-50">
      <button
        onClick={handleLogout}
        className="rounded px-3 py-1 text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
