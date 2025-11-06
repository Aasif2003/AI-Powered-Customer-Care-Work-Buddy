import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  href?: string;
  linkOutside?: boolean;
  icon?: {
    left?: React.ReactNode;
    right?: React.ReactNode;
  };
}

export default function Button({
  children,
  className,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  href,
  linkOutside = false,
  ...props
}: ButtonProps) {
  const isLink = href !== undefined;
  const isDisabled = disabled || loading;

  const baseStyles =
    'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-black hover:bg-gray-200 focus:ring-gray-300',
    ghost: 'bg-transparent text-black hover:bg-gray-100 focus:ring-gray-300',
  };

  const classes = `${baseStyles} ${variantStyles[variant]} ${className || ''}`;

  const content = (
    <>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!loading && icon?.left && (
        <span className="mr-2 -mt-[1px]">{icon.left}</span>
      )}
      {children}
      {icon?.right && !loading && (
        <span className="ml-2 -mt-[1px]">{icon.right}</span>
      )}
    </>
  );

  if (isLink) {
    if (linkOutside) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          aria-disabled={isDisabled}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} aria-disabled={isDisabled}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {content}
    </button>
  );
}
