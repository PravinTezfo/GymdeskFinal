
'use client';

import { Building2, Users, ArrowUp, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: {
        color: 'hsl(var(--card-foreground))',
        boxWidth: 12,
        usePointStyle: true,
        pointStyle: 'rectRounded'
      },
    },
    title: {
      display: true,
      text: 'Platform Growth (Last 6 Months)',
      color: 'hsl(var(--card-foreground))',
      font: {
        size: 18,
      }
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      border: {
        display: true,
        color: 'hsl(var(--border))',
      },
      grid: {
        display: false,
      },
      ticks: {
        color: 'hsl(var(--card-foreground))',
        callback: (value) => Number.isInteger(value) ? value : null
      },
    },
    x: {
      border: {
        display: true,
        color: 'hsl(var(--border))'
      },
      grid: { display: false },
      ticks: {
        color: 'hsl(var(--card-foreground))',
      },
    }
  },
   elements: {
      line: {
        tension: 0.4
      }
    }
};

function Card({ children, className }) {
  return <div className={cn('bg-card rounded-lg shadow-md border border-border', className)}>{children}</div>;
}

function CardHeader({ title, children }) {
  return (
    <div className="p-4 px-6 flex items-center justify-between border-b border-border">
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      {children}
    </div>
  );
}

function CardContent({ children }) {
  return <div className="p-6">{children}</div>;
}

function StatCard({
  title,
  value,
  icon,
  change,
  changeType,
  isLoading,
}) {
  const ChangeIcon = changeType === 'increase' ? TrendingUp : TrendingDown;
  const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

  return (
    <Card>
      <CardHeader title={title}>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-9 w-16 bg-muted-foreground/20 animate-pulse rounded-md" />
        ) : (
          <div className="text-4xl font-bold text-card-foreground">{value}</div>
        )}
        {change && !isLoading && (
          <p
            className={cn(
              'text-sm flex items-center mt-1',
              changeColor
            )}
          >
            <ChangeIcon className="w-4 h-4 mr-1" />
            <span className="font-medium">{change}</span>
            <span className="ml-1 text-muted-foreground">vs last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SuperAdminDashboard() {
  const firestore = useFirestore();

  const gymsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'gyms') : null), [firestore]);
  const { data: gyms, isLoading: isLoadingGyms } = useCollection(gymsQuery);

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!firestore || !gyms) return;

      setIsLoadingData(true);

      try {
        
        const memberPromises = gyms.map(async (gym) => {
          const membersColRef = collection(firestore, 'gyms', gym.id, 'members');
          const membersSnapshot = await getDocs(membersColRef);
          return membersSnapshot.docs.length;
        });
        
        const memberCounts = await Promise.all(memberPromises);
        const totalMemberCount = memberCounts.reduce((sum, count) => sum + count, 0);

        // --- Stat Card & Chart Data Calculation ---
        const totalGymsCount = gyms.length;
        const activeGymsCount = gyms.filter((g) => g.active).length;
        const avgMembers = totalGymsCount > 0 ? (totalMemberCount / totalGymsCount).toFixed(1) : '0';

        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const newGymsThisMonthCount = gyms.filter(gym => {
          const createdAt = gym.createdAt?.toDate();
          return createdAt && createdAt >= thisMonthStart;
        }).length;

        const newGymsLastMonthCount = gyms.filter(gym => {
            const createdAt = gym.createdAt?.toDate();
            return createdAt && createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
        }).length;

        let growthPercentage = 0;
        if (newGymsLastMonthCount > 0) {
            growthPercentage = ((newGymsThisMonthCount - newGymsLastMonthCount) / newGymsLastMonthCount) * 100;
        } else if (newGymsThisMonthCount > 0) {
            growthPercentage = 100; // Infinite growth if last month was 0
        }
        const newGymsGrowth = `${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(0)}%`;

        const monthLabels = Array.from({ length: 6 }, (_, i) => {
            // subMonths clamps the day, so on the 29th-31st we never skip or repeat a month
            return subMonths(new Date(), 5 - i).toLocaleString('default', { month: 'short'});
        });
        
        const newGymsPerMonth = Array(6).fill(0);

        for (let i = 0; i < 6; i++) {
            const monthStart = startOfMonth(subMonths(now, 5-i));
            const monthEnd = endOfMonth(subMonths(now, 5-i));
            
            // Count new gyms in the month
            gyms.forEach(gym => {
                const createdAt = gym.createdAt?.toDate();
                if (createdAt && createdAt >= monthStart && createdAt < monthEnd) {
                    newGymsPerMonth[i]++;
                }
            });
        }
        
        const growthChartData = {
            labels: monthLabels,
            datasets: [
                {
                    label: 'New Gyms',
                    data: newGymsPerMonth,
                    borderColor: '#22C55E', // Green
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };

        setDashboardData({
          totalGyms: totalGymsCount,
          activeGyms: activeGymsCount,
          newGymsThisMonth: newGymsThisMonthCount,
          newGymsGrowth: newGymsGrowth,
          avgMembersPerGym: avgMembers,
          growthChart: growthChartData,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (gyms) {
      fetchDashboardData();
    } else if (!isLoadingGyms) {
      setIsLoadingData(false);
      setDashboardData({
        totalGyms: 0,
        activeGyms: 0,
        newGymsThisMonth: 0,
        newGymsGrowth: '+0%',
        avgMembersPerGym: '0',
        growthChart: { labels: [], datasets: [] },
      });
    }
  }, [gyms, firestore, isLoadingGyms]);

  const isLoading = isLoadingGyms || isLoadingData;
  
  return (
    <div className="p-4 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Gyms"
          value={dashboardData?.totalGyms ?? 0}
          icon={<Building2 className="w-6 h-6 text-card-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="New Gyms This Month"
          value={dashboardData?.newGymsThisMonth ?? 0}
          icon={<TrendingUp className="w-6 h-6 text-card-foreground" />}
          change={dashboardData?.newGymsGrowth}
          changeType={(dashboardData?.newGymsGrowth?.startsWith('+') || dashboardData?.newGymsGrowth === '0%') ? 'increase' : 'decrease'}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Gyms"
          value={dashboardData?.activeGyms ?? 0}
          icon={<Activity className="w-6 h-6 text-card-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Avg. Members / Gym"
          value={dashboardData?.avgMembersPerGym ?? '0'}
          icon={<Users className="w-6 h-6 text-card-foreground" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardContent>
                <div className="h-[400px]">
                    {isLoading || !dashboardData?.growthChart ? (
                        <div className="h-full w-full bg-muted-foreground/10 animate-pulse rounded-md" />
                    ) : (
                        <Line options={lineChartOptions} data={dashboardData.growthChart} />
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
