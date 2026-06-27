export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/20 mt-section-gap hidden md:block">
      <div className="flex flex-col md:flex-row justify-between items-center py-base px-margin-desktop max-w-container-max mx-auto">
        <span className="font-label-md text-label-md font-bold text-primary">
          &copy; 2024 HealthWise AI. Clinical use only.
        </span>
        <div className="flex gap-4">
          <a
            className="font-label-sm text-label-sm text-text-tertiary hover:text-primary transition-colors opacity-80 hover:opacity-100"
            href="#"
          >
            Clinical Disclaimers
          </a>
          <a
            className="font-label-sm text-label-sm text-text-tertiary hover:text-primary transition-colors opacity-80 hover:opacity-100"
            href="#"
          >
            System Status
          </a>
          <a
            className="font-label-sm text-label-sm text-text-tertiary hover:text-primary transition-colors opacity-80 hover:opacity-100"
            href="#"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
