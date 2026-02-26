import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>🌸</span>
            <span>IVF Project — Open source, community-driven, no ads</span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/support"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Support Us
            </Link>
          </nav>
        </div>

        <p className="text-xs text-muted-foreground/70 text-center mt-4">
          This tool provides community-reported data and published research for
          informational purposes only. It is not medical advice.
        </p>
      </div>
    </footer>
  );
}
