// StatCard · tarjeta de métrica (título, valor, subtítulo)
// conecta con: WalletKpiHeader
import React from 'react'
import './StatCard.css'

export interface StatCardProps {
    title: string
    value: string | number
    subtitle?: string
    trend?: {
        value: string
        positive?: boolean
    }
    badge?: {
        text: string
        variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate'
    }
    icon?: React.ReactNode
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    trend,
    badge,
    icon,
}) => {
    const badgeVariantClass = badge?.variant ? `stat-card-badge-${badge.variant}` : 'stat-card-badge-indigo'

    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <span className="stat-card-title">
                    {icon && <span>{icon}</span>}
                    {title}
                </span>
                {trend && (
                    <span className={`stat-card-trend ${trend.positive ? 'stat-card-trend-positive' : 'stat-card-trend-negative'}`}>
                        {trend.value}
                    </span>
                )}
                {badge && (
                    <span className={`stat-card-badge ${badgeVariantClass}`}>
                        {badge.text}
                    </span>
                )}
            </div>

            <div className="stat-card-body">
                <p className="stat-card-value">{value}</p>
                {subtitle && (
                    <p className="stat-card-subtitle">{subtitle}</p>
                )}
            </div>
        </div>
    )
}
