import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function AmbientBackground() {
  return (
    <>
      <video
        className="ambient-video"
        autoPlay
        loop
        muted
        playsInline
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Crect width='1600' height='900' fill='%23000'/%3E%3CradialGradient id='g' cx='50%25' cy='35%25' r='60%25'%3E%3Cstop stop-color='%2390abc9' stop-opacity='.5'/%3E%3Cstop offset='.55' stop-color='%23121a24' stop-opacity='.3'/%3E%3Cstop offset='1' stop-color='%23000'/%3E%3C/radialGradient%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3C/svg%3E"
      >
        <source
          src="https://plugin-assets.open-design.ai/plugins/liquid-glass-agency/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8-b7258e.mp4"
          type="video/mp4"
        />
      </video>
      <div className="ambient" />
    </>
  );
}

export function AppNav() {
  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-inner">
        <Link className="logo" href="/">
          <span className="logo-mark liquid-glass-strong" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 14.5C5 9.8 8.8 6 13.5 6H19v5.5C19 16.2 15.2 20 10.5 20H5v-5.5Z"
                stroke="white"
                strokeWidth="1.6"
              />
              <path
                d="M8 16c3.9-.5 6.5-3.1 7.4-7"
                stroke="white"
                strokeLinecap="round"
                strokeWidth="1.6"
              />
            </svg>
          </span>
          <span>AdFrame</span>
        </Link>

        <div className="nav-pill liquid-glass">
          <Link href="/">Import</Link>
          <Link href="/analysis">Analysis</Link>
          <Link href="/editor">Editor</Link>
          <Link className="solid" href="/editor">
            Open studio <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <AmbientBackground />
      <AppNav />
      <div className="page-shell">{children}</div>
    </main>
  );
}
