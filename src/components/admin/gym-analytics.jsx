
'use client';

import { Users, TrendingUp, TrendingDown, IndianRupee, Scale } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, Timestamp, query, where, getDocs, doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth, format, isWithinInterval, add, parseISO } from 'date-fns';
import { isMembershipExpired } from '@/lib/membership';


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

function Card({ children, className }) {
  return <div className={cn('bg-card rounded-lg shadow-md border border-border', className)}>{children}</div>;
}

function CardContent({ children, className }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

function StatCard({ title, value, change, changeType, isLoading, isCurrency=false }) {
  const ChangeIcon = changeType === 'increase' ? TrendingUp : TrendingDown;
  const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

  return (
    <Card>
      <CardContent>
        <p className="text-sm text-card-foreground mb-2">{title}</p>
        {isLoading ? (
          <div className="h-9 w-24 bg-muted-foreground/20 animate-pulse rounded-md" />
        ) : (
          <p className="text-3xl font-bold text-card-foreground">
            {isCurrency && '₹'}{new Intl.NumberFormat('en-IN').format(value)}
          </p>
        )}
        {change !== null && change !== undefined && !isLoading && (
          <p className={cn('text-sm flex items-center mt-1', changeColor)}>
            <ChangeIcon className="w-4 h-4 mr-1" />
            <span>{change}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, data, isLoading, options }) {
    return (
        <Card>
            <CardContent>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">{title}</h3>
                <div className="h-[300px]">
                    {isLoading || !data ? (
                        <div className="h-full w-full bg-muted-foreground/10 animate-pulse rounded-md" />
                    ) : (
                        <Line options={options} data={data} />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export function GymAnalyticsDashboard({ gymId }) {
  const firestore = useFirestore();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartOptions, setChartOptions] = useState({});

  const gymDocRef = useMemoFirebase(() => {
    if (!firestore || !gymId) return null;
    return doc(firestore, 'gyms', gymId);
  }, [firestore, gymId]);
  const { data: gymData, isLoading: isGymLoading } = useDoc(gymDocRef);

  const membersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'gyms', gymId, 'members')) : null), [firestore, gymId]);
  const { data: members, isLoading: isLoadingMembers } = useCollection(membersQuery);
  
  const schemesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'gyms', gymId, 'schemes') : null), [firestore, gymId]);
  const { data: schemes, isLoading: isLoadingSchemes } = useCollection(schemesQuery);
  
  const logsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'gyms', gymId, 'members_log')) : null), [firestore, gymId]);
  const { data: logs, isLoading: isLoadingLogs } = useCollection(logsQuery);

  useEffect(() => {
    if (gymData) {
      const theme = gymData.theme || {};
      const cardForeground = theme.cardForeground || 'hsl(0, 0%, 94%)';
      const borderColor = theme.border || 'hsl(210, 9%, 34%)';

      setChartOptions({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: cardForeground,
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'rectRounded'
            },
          },
          title: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            border: {
              display: true,
              color: borderColor,
            },
            grid: {
              display: false,
            },
            ticks: {
              color: cardForeground,
              callback: (value) => `₹${value/1000}k`
            },
          },
          x: {
            border: {
              display: true,
              color: borderColor
            },
            grid: { display: false },
            ticks: {
              color: cardForeground,
            },
          }
        },
        elements: {
          line: {
            tension: 0.4
          }
        }
      });
    }
  }, [gymData]);

  useEffect(() => {
    const isDataLoading = isLoadingMembers || isLoadingSchemes || isLoadingLogs;
    if (isDataLoading) {
        setIsLoading(true);
        return;
    }
    
    if (!members || !schemes || !logs) {
        setIsLoading(false);
        return;
    }

    const calculateAnalytics = () => {
        const now = new Date();
        const num = (v) => Number(v) || 0;
        const logById = new Map(logs.map(l => [l.id, l]));

        // Members that were (soft-)deleted, or whose records no longer exist, must not feed any total.
        const liveMemberIds = new Set(
            members
                .filter(m => !(logById.get(m.activeLogId)?.isDeleted))
                .map(m => m.id)
        );
        const activeLogs = logs.filter(l => !l.isDeleted && liveMemberIds.has(l.memberId));

        // Index once instead of filtering all logs for every member / month.
        const logsByMember = new Map();
        activeLogs.forEach(l => {
            if (!logsByMember.has(l.memberId)) logsByMember.set(l.memberId, []);
            logsByMember.get(l.memberId).push(l);
        });
        logsByMember.forEach(list => list.sort((x, y) => (y.startDate || '').localeCompare(x.startDate || '')));

        // --- Member Status & Revenue Calculation ---
        let activeMembers = 0;
        let inactiveMembers = 0;
        let totalRevenueEarned = activeLogs.reduce((sum, l) => sum + num(l.amountPaid), 0);
        let totalPendingAmount = activeLogs.reduce((sum, l) => sum + num(l.balanceAmount), 0);

        members.forEach(member => {
            if (!liveMemberIds.has(member.id)) return;
            const log = logById.get(member.activeLogId);
            if (!log || !log.endDate || isMembershipExpired(log.endDate, now)) {
                inactiveMembers++;
            } else {
                activeMembers++;
            }
        });

        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        
        // Percentage change vs last month. With no baseline (last month = 0) there is nothing to divide by,
        // so growth is shown as +100% (never the raw amount, which used to render as e.g. "+12000%").
        const calculateChange = (current, previous) => {
            if (previous === 0) {
                return current === 0 ? '0%' : '+100%';
            }
            if (current === 0) {
                return '-100%';
            }
            const changePercent = ((current - previous) / previous) * 100;
            return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(0)}%`;
        };

        // A member is "new" in the month of their FIRST membership; renewals of old members don't count.
        const firstStartByMember = new Map();
        logsByMember.forEach((list, memberId) => {
            const starts = list.map(l => l.startDate).filter(Boolean).sort();
            if (starts.length) firstStartByMember.set(memberId, parseISO(starts[0]));
        });
        const countFirstStartsIn = (start, end) =>
            [...firstStartByMember.values()].filter(d => isWithinInterval(d, { start, end })).length;

        const membersAddedThisMonth = countFirstStartsIn(thisMonthStart, thisMonthEnd);
        const membersAddedLastMonth = countFirstStartsIn(lastMonthStart, lastMonthEnd);

        const memberChange = calculateChange(membersAddedThisMonth, membersAddedLastMonth);
        const memberChangeType = !memberChange.startsWith('-') ? 'increase' : 'decrease';

        const revenueThisMonth = activeLogs
          .filter(l => l.startDate && isWithinInterval(parseISO(l.startDate), { start: thisMonthStart, end: thisMonthEnd }))
          .reduce((sum, l) => sum + num(l.amountPaid), 0);
        
        const revenueLastMonth = activeLogs
          .filter(l => l.startDate && isWithinInterval(parseISO(l.startDate), { start: lastMonthStart, end: lastMonthEnd }))
          .reduce((sum, l) => sum + num(l.amountPaid), 0);

        const revenueChange = calculateChange(revenueThisMonth, revenueLastMonth);
        const revenueChangeType = !revenueChange.startsWith('-') ? 'increase' : 'decrease';

        // --- Chart Data ---
        const monthLabels = Array.from({ length: 6 }, (_, i) => {
            return format(subMonths(now, 5 - i), 'MMM');
        });
        
        const monthlyRevenue = Array(6).fill(0);
        const monthlyPending = Array(6).fill(0);
        const monthlyActiveMembers = Array(6).fill(0);
        const monthlyInactiveMembers = Array(6).fill(0);

        for (let i = 0; i < 6; i++) {
            const monthRef = subMonths(now, 5 - i);
            const monthStart = startOfMonth(monthRef);
            const monthEnd = endOfMonth(monthRef);

            let activeInMonth = 0;
            
            // Members whose first membership started by the end of this month
            const membersInSystemThisMonth = new Set();
            firstStartByMember.forEach((first, memberId) => {
                if (first <= monthEnd) membersInSystemThisMonth.add(memberId);
            });

            membersInSystemThisMonth.forEach(memberId => {
                // Latest log that started on/before the end of this month (list is sorted newest first).
                const latestLogForPeriod = (logsByMember.get(memberId) || [])
                    .find(log => log.startDate && parseISO(log.startDate) <= monthEnd);

                if (latestLogForPeriod && latestLogForPeriod.endDate) {
                    const logStartDate = parseISO(latestLogForPeriod.startDate);
                    const logEndDate = parseISO(latestLogForPeriod.endDate);

                    // Check if the membership period overlaps with the current month.
                    if (logStartDate <= monthEnd && logEndDate >= monthStart) {
                        activeInMonth++;
                    }
                }
            });

            monthlyActiveMembers[i] = activeInMonth;
            monthlyInactiveMembers[i] = membersInSystemThisMonth.size - activeInMonth;

            activeLogs.forEach(log => {
                const startDate = log.startDate ? parseISO(log.startDate) : null;
                if(startDate && isWithinInterval(startDate, {start: monthStart, end: monthEnd})) {
                    monthlyRevenue[i] += num(log.amountPaid);
                    monthlyPending[i] += num(log.balanceAmount);
                }
            });
        }
        
        const membersTrendData = {
          labels: monthLabels,
          datasets: [
            {
              label: 'Active Members',
              data: monthlyActiveMembers,
              borderColor: 'hsl(142.1 76.2% 36.3%)', // green-600
              backgroundColor: 'hsla(142.1 76.2% 36.3% / 0.2)',
              fill: true,
            },
             {
              label: 'Inactive Members',
              data: monthlyInactiveMembers,
              borderColor: 'hsl(0 84.2% 60.2%)', // destructive
              backgroundColor: 'hsla(0 84.2% 60.2% / 0.2)',
              fill: true,
            },
          ]
        };

        const revenueTrendData = {
            labels: monthLabels,
            datasets: [
                 {
                    label: 'Revenue Earned',
                    data: monthlyRevenue,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                },
                {
                    label: 'Pending Amount',
                    data: monthlyPending,
                    borderColor: '#FBBF24',
                    backgroundColor: 'rgba(251, 191, 36, 0.2)',
                    fill: true,
                }
            ]
        };


        setAnalyticsData({
            totalMembers: members.length,
            activeMembers,
            inactiveMembers,
            membersAddedThisMonth,
            memberChange,
            memberChangeType,
            totalRevenueEarned,
            totalPendingAmount,
            totalSchemes: schemes.length,
            revenueThisMonth,
            revenueChange,
            revenueChangeType,
            membersTrend: membersTrendData,
            revenueTrend: revenueTrendData
        });

        setIsLoading(false);
    }
    calculateAnalytics();

  }, [members, schemes, logs, isLoadingMembers, isLoadingSchemes, isLoadingLogs, firestore, gymData]);


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard title="Total Members" value={analyticsData?.totalMembers ?? 0} isLoading={isLoading || isGymLoading} />
        <StatCard title="Active Members" value={analyticsData?.activeMembers ?? 0} isLoading={isLoading || isGymLoading} />
        <StatCard title="Inactive Members" value={analyticsData?.inactiveMembers ?? 0} isLoading={isLoading || isGymLoading} />
        <StatCard 
            title="New Members (This Month)" 
            value={analyticsData?.membersAddedThisMonth ?? 0} 
            change={analyticsData?.memberChange}
            changeType={analyticsData?.memberChangeType}
            isLoading={isLoading || isGymLoading} 
        />
        <StatCard title="Total Revenue" value={analyticsData?.totalRevenueEarned ?? 0} isLoading={isLoading || isGymLoading} isCurrency />
        <StatCard title="Total Pending" value={analyticsData?.totalPendingAmount ?? 0} isLoading={isLoading || isGymLoading} isCurrency />
        <StatCard title="Total Schemes" value={analyticsData?.totalSchemes ?? 0} isLoading={isLoading || isGymLoading} />
        <StatCard 
            title="Revenue (This Month)" 
            value={analyticsData?.revenueThisMonth ?? 0} 
            change={analyticsData?.revenueChange}
            changeType={analyticsData?.revenueChangeType}
            isLoading={isLoading || isGymLoading}
            isCurrency 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Member Status Trend (Last 6 Months)" data={analyticsData?.membersTrend} isLoading={isLoading || isGymLoading} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales?.y, ticks: { ...chartOptions.scales?.y?.ticks, callback: (value) => value } } } }} />
        <ChartCard title="Revenue Trend (Last 6 Months)" data={analyticsData?.revenueTrend} isLoading={isLoading || isGymLoading} options={chartOptions} />
      </div>
    </div>
  );
}
