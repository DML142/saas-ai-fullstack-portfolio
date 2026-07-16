import Image from 'next/image';
import Link from 'next/link';

const REPO_URL = 'https://github.com/DML142/saas-ai-fullstack-portfolio';

export function Footer() {
  return (
    <footer className="border-border relative border-t bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:gap-8">
        <Link href="/" className="shrink-0">
          <Image src="/cosico.png" alt="COS Code" width={44} height={44} />
        </Link>

        <p className="max-w-2xl text-center text-xs leading-relaxed text-foreground/50 md:text-right">
          Project for portfolio-only purposes, nothing is commercial here and payment is preview
          only feature to show how backend works, in any case do not purchase this product,
          because you will get nothing of it. Source code of site can be found on{' '}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cosmic-light break-all underline decoration-cosmic-light/40 underline-offset-4 hover:text-ink hover:decoration-ink/60"
          >
            {REPO_URL}
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
