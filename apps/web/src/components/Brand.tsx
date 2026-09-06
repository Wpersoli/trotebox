import Image from 'next/image';
import Link from 'next/link';

type BrandProps = {
  compact?: boolean;
  priority?: boolean;
  dark?: boolean;
};

export function Brand({ compact = false, priority = false, dark = false }: BrandProps) {
  return (
    <Link href="/" className={`brand ${compact ? 'brand-compact' : ''} ${dark ? 'brand-dark' : ''}`} aria-label="TroteBox — página inicial">
      <span className="brand-mark" aria-hidden="true">
        <Image src="/brand/icon-64.png" alt="" width={64} height={64} priority={priority} />
      </span>
      {!compact && (
        dark ? (
          <span className="brand-dark-lockup"><strong>Trote<span>Box</span></strong><small>Riso na linha · surpresa na caixa</small></span>
        ) : (
          <Image
            src="/brand/trotebox-wordmark.webp"
            alt="TroteBox"
            width={975}
            height={325}
            className="brand-wordmark"
            sizes="(max-width: 460px) 142px, (max-width: 700px) 178px, 220px"
            priority={priority}
          />
        )
      )}
    </Link>
  );
}
