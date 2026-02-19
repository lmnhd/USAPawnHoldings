"use client";

import { cn } from "@/lib/utils";
import React from "react";
import Link from "next/link";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  href,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
}) => {
  const baseClassName =
    "row-span-1 h-full rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault p-4 border border-vault-border bg-vault-surface-elevated justify-between flex flex-col space-y-4 hover:border-vault-red/40";

  const content = (
    <div
      className={cn(
        baseClassName,
        !href && className,
        href && "cursor-pointer"
      )}
    >
      {header}
      <div className="transition duration-200 group-hover/bento:translate-x-2">
        {icon}
        <div className="font-display font-bold text-vault-text-light mb-2 mt-2">
          {title}
        </div>
        <div className="font-body text-vault-text-muted text-xs">
          {description}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cn("block h-full", className)}>
        {content}
      </Link>
    );
  }
  return content;
};
