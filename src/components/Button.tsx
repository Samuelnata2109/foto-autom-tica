import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';

type Variant = 'primary' | 'secondary' | 'quiet';
type ButtonProps = ComponentProps<'button'> & { variant?: Variant };

function buttonClass(variant: Variant, className = '') {
  return ['button', 'button--' + variant, className].filter(Boolean).join(' ');
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} className={buttonClass(variant, className)} />;
}

export function ButtonLink({
  to,
  variant = 'primary',
  children,
}: {
  to: string;
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  ...props
}: Omit<ButtonProps, 'aria-label'> & {
  label: string;
}) {
  return (
    <Button
      {...props}
      variant="quiet"
      className={['icon-button', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
    />
  );
}
