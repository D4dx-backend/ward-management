import { memo } from 'react';

const Badge = memo(({ 
  children, 
  variant = 'gray', 
  size = 'md',
  className = '',
  icon,
  ...props 
}) => {
  const variants = {
    gray: 'badge-gray',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    primary: 'bg-primary-100 text-primary-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const classes = [
    'badge',
    variants[variant],
    sizes[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;

// Status badge component
export const StatusBadge = memo(({ status, ...props }) => {
  const statusConfig = {
    active: { variant: 'success', text: 'Active' },
    inactive: { variant: 'gray', text: 'Inactive' },
    pending: { variant: 'warning', text: 'Pending' },
    completed: { variant: 'success', text: 'Completed' },
    failed: { variant: 'danger', text: 'Failed' },
    draft: { variant: 'gray', text: 'Draft' },
    published: { variant: 'success', text: 'Published' },
    archived: { variant: 'gray', text: 'Archived' },
  };

  const config = statusConfig[status] || { variant: 'gray', text: status };

  return (
    <Badge variant={config.variant} {...props}>
      {config.text}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Priority badge component
export const PriorityBadge = memo(({ priority, ...props }) => {
  const priorityConfig = {
    low: { variant: 'info', text: 'Low', icon: '⬇️' },
    medium: { variant: 'warning', text: 'Medium', icon: '➡️' },
    high: { variant: 'danger', text: 'High', icon: '⬆️' },
    urgent: { variant: 'danger', text: 'Urgent', icon: '🔥' },
  };

  const config = priorityConfig[priority] || { variant: 'gray', text: priority };

  return (
    <Badge variant={config.variant} icon={config.icon} {...props}>
      {config.text}
    </Badge>
  );
});

PriorityBadge.displayName = 'PriorityBadge';

// Count badge component
export const CountBadge = memo(({ count, max = 99, ...props }) => {
  const displayCount = count > max ? `${max}+` : count;

  if (!count || count === 0) return null;

  return (
    <Badge variant="danger" size="sm" {...props}>
      {displayCount}
    </Badge>
  );
});

CountBadge.displayName = 'CountBadge';