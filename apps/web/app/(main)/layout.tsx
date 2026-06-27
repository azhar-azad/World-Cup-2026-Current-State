import { Nav } from "@/components/Nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
