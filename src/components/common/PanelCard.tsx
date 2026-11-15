import type { ReactNode } from "react";
import { Card } from "antd";

export interface PanelCardProps {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function PanelCard({ title, extra, children, className = "" }: PanelCardProps) {
  return (
    <Card title={title} extra={extra} size="small" className={`shadow-sm ${className}`}>
      {children}
    </Card>
  );
}
