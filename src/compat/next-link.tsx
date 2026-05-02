import React from 'react'
import Link from 'next/link'

type NextLinkProps = React.ComponentPropsWithoutRef<typeof Link>

const NextLink = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ children, ...props }, ref) => (
    <Link ref={ref} {...props}>
      {children}
    </Link>
  ),
)

NextLink.displayName = 'NextLink'

export default NextLink
