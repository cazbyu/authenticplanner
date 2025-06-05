import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { WellnessDomain, DOMAIN_LABELS, WELLNESS_DOMAINS } from '../types';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface BalanceWheelProps {
  domainCounts: Record<WellnessDomain, number>;
  size?: 'sm' | 'md' | 'lg';
}

const BalanceWheel: React.FC<BalanceWheelProps> = ({ 
  domainCounts,
  size = 'md'
}) => {
  const domainColors = {
    physical: '#3B82F6',    // Blue
    emotional: '#EC4899',   // Pink
    intellectual: '#8B5CF6', // Purple
    spiritual: '#A78BFA',   // Lavender
    financial: '#10B981',   // Green
    social: '#F59E0B',      // Amber
    recreational: '#6366F1', // Indigo
    community: '#EF4444',   // Red
  };
  
  // Normalize data - ensure at least 1 for each domain for visualization
  const normalizedData = WELLNESS_DOMAINS.map(domain => 
    Math.max(domainCounts[domain], 1)
  );
  
  const data = {
    labels: WELLNESS_DOMAINS.map(domain => DOMAIN_LABELS[domain]),
    datasets: [
      {
        data: normalizedData,
        backgroundColor: WELLNESS_DOMAINS.map(domain => domainColors[domain]),
        borderColor: WELLNESS_DOMAINS.map(domain => domainColors[domain]),
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: size !== 'sm',
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value} activities`;
          },
        },
      },
    },
    cutout: '50%',
  };
  
  const containerSizes = {
    sm: 'h-40 w-40',
    md: 'h-64 w-full',
    lg: 'h-80 w-full',
  };

  return (
    <div className={containerSizes[size]}>
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default BalanceWheel;