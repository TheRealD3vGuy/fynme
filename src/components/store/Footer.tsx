import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNav, fetchSetting } from "@/lib/store";

const FALLBACK = {
  footer_shop: [
    { id: "s1", label: "Featured", href: "/discover", position: 1 },
    { id: "s2", label: "All Series", href: "/discover", position: 2 },
    { id: "s3", label: "Stickers", href: "/discover", position: 3 },
    { id: "s4", label: "Sale", href: "/discover", position: 4 },
  ],
  footer_company: [
    { id: "c1", label: "About", href: "/about", position: 1 },
    { id: "c2", label: "Partnership", href: "/contact", position: 2 },
    { id: "c3", label: "Contact", href: "/contact", position: 3 },
  ],
  footer_info: [
    { id: "i1", label: "Shipping", href: "/pages/shipping", position: 1 },
    { id: "i2", label: "Returns", href: "/pages/returns", position: 2 },
    { id: "i3", label: "Size Guide", href: "/pages/size-guide", position: 3 },
    { id: "i4", label: "Privacy", href: "/pages/privacy", position: 4 },
    { id: "i5", label: "Terms", href: "/pages/terms", position: 5 },
  ],
};

function FooterColumn({
  title,
  location,
}: {
  title: string;
  location: keyof typeof FALLBACK;
}) {
  const { data } = useQuery({
    queryKey: ["nav", location],
    queryFn: () => fetchNav(location),
  });
  const items = data && data.length > 0 ? data : FALLBACK[location];
  return (
    <div>
      <h4 className="section-label text-sm text-muted-foreground">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { data: store } = useQuery({
    queryKey: ["setting", "store"],
    queryFn: () =>
      fetchSetting<{ name: string; tagline: string }>("store"),
  });

  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-bold uppercase tracking-wide">
            {store?.name ?? "FindYourNorth"}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {store?.tagline ??
              "Apparel & stickers for those who find their path in the wild. Based in Idaho."}
          </p>
        </div>
        <FooterColumn title="Shop" location="footer_shop" />
        <FooterColumn title="Company" location="footer_company" />
        <FooterColumn title="Info" location="footer_info" />
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {store?.name ?? "Find Your North"}. All
        rights reserved.
      </div>
    </footer>
  );
}
