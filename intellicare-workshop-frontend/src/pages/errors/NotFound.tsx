import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-8 text-center">
      <section className="w-full max-w-md">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-muted">
          IntelliCare
        </p>

        <h1 className="mt-3 text-7xl font-bold tracking-tight text-ink sm:text-8xl">
          404
        </h1>

        <h2 className="mt-4 text-2xl font-bold text-ink">Page Not Found</h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted sm:text-base">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-safe px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-safe/30 focus:ring-offset-2"
        >
          Về trang chủ
        </Link>
      </section>
    </main>
  );
}
