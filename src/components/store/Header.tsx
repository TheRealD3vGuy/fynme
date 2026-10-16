import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { fetchNav } from "@/lib/store";
import { SearchOverlay } from "./SearchOverlay";
import logoAsset from "@/assets/fyn-logo.png.asset.json";

function Logo() {
  return (
    <Link to="/" aria-label="Find Your North — home" className="block">
      <img
        src={logoAsset.url}
        alt="Find Your North logo"
        className="h-10 w-10"
        width={40}
        height={40}
      />
    </Link>
  );
}

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { setOpen, count } = useCart();

  const { data: leftNav } = useQuery({
    queryKey: ["nav", "header_left"],
    queryFn: () => fetchNav("header_left"),
  });
  const { data: rightNav } = useQuery({
    queryKey: ["nav", "header_right"],
    queryFn: () => fetchNav("header_right"),
  });

  const left = leftNav ?? [
    { id: "1", label: "About", href: "/about", position: 1 },
    { id: "2", label: "Discover", href: "/discover", position: 2 },
  ];
  const right = rightNav ?? [
    { id: "3", label: "Contact", href: "/contact", position: 1 },
    { id: "4", label: "Account", href: "/account", position: 2 },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Desktop left */}
          <div className="hidden flex-1 items-center gap-8 md:flex">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="text-foreground hover:text-accent"
            >
              <Search className="h-5 w-5" />
            </button>
            {left.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="text-sm font-semibold uppercase tracking-wider hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile left */}
          <div className="flex flex-1 items-center gap-4 md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
              className="text-foreground"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="text-foreground"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          <Logo />

          {/* Desktop right */}
          <div className="hidden flex-1 items-center justify-end gap-8 md:flex">
            {right.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="text-sm font-semibold uppercase tracking-wider hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => setOpen(true)}
              aria-label="Cart"
              className="relative text-foreground hover:text-accent"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {count}
                </span>
              )}
            </button>
          </div>

          {/* Mobile right */}
          <div className="flex flex-1 items-center justify-end md:hidden">
            <button
              onClick={() => setOpen(true)}
              aria-label="Cart"
              className="relative text-foreground"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {count}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="flex flex-col px-4 py-2">
              {[...left, ...right].map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border py-3 font-display text-xl font-semibold uppercase tracking-wide last:border-0"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
