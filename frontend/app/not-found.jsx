import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <div className="flex justify-center"><Logo /></div>
        <p className="num mt-14 text-sm text-brand-700">ERROR 404</p>
        <h1 className="font-display-tight mt-3 text-5xl font-semibold">This invoice doesn&apos;t exist.</h1>
        <p className="mt-4 text-ink-600">The page you&apos;re looking for was moved or never existed.</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-ink-950 px-7 py-3.5 text-sm font-semibold text-paper hover:bg-brand-700">Back to home</Link>
      </div>
    </main>
  );
}
