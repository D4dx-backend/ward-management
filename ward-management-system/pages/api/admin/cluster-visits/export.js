import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import connectToDatabase from '../../../../lib/mongodb';
import FormTemplate from '../../../../models/FormTemplate';
import Response from '../../../../models/Response';
import Cluster from '../../../../models/Cluster';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectToDatabase();

    const {
      all = 'true',
      district = 'all',
      coordinator = 'all',
      ward = 'all',
      status = 'all',
      dateRange = 'all',
      visitStatus = 'all',
    } = req.query;

    // Fetch state-admin created forms to derive week numbers and years
    const forms = await FormTemplate.find({
      createdBy: { $exists: true },
      isActive: { $ne: false },
    })
      .populate('createdBy', 'role')
      .sort({ createdAt: -1 })
      .catch(() => []);

    const stateAdminForms = forms.filter(
      (form) => form.createdBy && form.createdBy.role === 'stateAdmin'
    );

    const formWeeks = new Set();
    stateAdminForms.forEach((form) => {
      if (form.weekNumber && form.year) {
        formWeeks.add(`${form.year}-${form.weekNumber}`);
      }
    });

    const sortedFormWeeks = Array.from(formWeeks)
      .map((weekKey) => {
        const [year, weekNumber] = weekKey.split('-').map(Number);
        return { year, weekNumber };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      });

    const maxWeeks = all === 'true' ? 20 : 8;
    const weeksToProcess = sortedFormWeeks.slice(0, maxWeeks);

    const weeks = [];
    const currentDate = new Date();
    const currentWeekNumber = getWeekNumber(currentDate);
    const currentYear = currentDate.getFullYear();

    for (const { year, weekNumber } of weeksToProcess) {
      const weekStart = getDateFromWeekNumber(weekNumber, year);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const isCurrentWeek = year === currentYear && weekNumber === currentWeekNumber;

      const responses = await Response.find({ weekNumber, year })
        .populate('ward', 'name district')
        .populate('respondent', 'name role')
        .catch(() => []);

      const allClusters = await Cluster.find({ isActive: { $ne: false } })
        .populate('ward', 'name district')
        .catch(() => []);

      const wardIdToVisits = {};
      responses.forEach((response) => {
        if (response.ward) {
          const wardKey = response.ward._id.toString();
          if (!wardIdToVisits[wardKey]) {
            wardIdToVisits[wardKey] = [];
          }
          wardIdToVisits[wardKey].push(response);
        }
      });

      const clusters = allClusters.map((cluster) => {
        const wardKey = cluster.ward ? cluster.ward._id.toString() : null;
        const visits = wardKey ? wardIdToVisits[wardKey] || [] : [];
        const hasVisit = visits.length > 0;
        const firstVisit = hasVisit ? visits[0] : null;
        return {
          id: cluster._id.toString(),
          name: cluster.name,
          district: cluster.ward ? cluster.ward.district : 'Unknown',
          ward: cluster.ward ? cluster.ward.name : 'Unknown Ward',
          coordinator: firstVisit?.respondent?.name || '',
          visited: hasVisit,
          visitDate: hasVisit ? firstVisit.submittedAt : null,
          visitDetails: hasVisit
            ? {
                housesVisited: firstVisit.responses?.housesVisited || '',
                issuesFound: firstVisit.responses?.issuesFound || '',
              }
            : null,
        };
      });

      const visitedCount = clusters.filter((c) => c.visited).length;
      const totalClusters = clusters.length;
      const visitPercentage = totalClusters > 0 ? Math.round((visitedCount / totalClusters) * 100) : 0;
      const weekStatus =
        visitPercentage >= 80 ? 'excellent' : visitPercentage >= 60 ? 'good' : visitPercentage >= 40 ? 'average' : 'poor';

      weeks.push({
        weekNumber,
        year,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        isCurrentWeek,
        visitPercentage,
        status: weekStatus,
        clusters,
      });
    }

    // Apply filters similar to client-side logic
    const filteredWeeks = (weeks || [])
      .map((week) => {
        const filteredClusters = (week.clusters || []).filter((cluster) => {
          if (district !== 'all' && cluster.district !== district) return false;
          if (ward !== 'all') {
            const wardName = typeof cluster.ward === 'string' ? cluster.ward : cluster.ward?.name || '';
            if (wardName !== ward) return false;
          }
          if (coordinator !== 'all' && cluster.coordinator !== coordinator) return false;
          if (visitStatus !== 'all') {
            if (visitStatus === 'visited' && !cluster.visited) return false;
            if (visitStatus === 'not_visited' && cluster.visited) return false;
          }
          return true;
        });

        const visitedCount = filteredClusters.filter((c) => c.visited).length;
        const totalClusters = filteredClusters.length;
        const visitPercentage = totalClusters > 0 ? Math.round((visitedCount / totalClusters) * 100) : 0;
        const weekStatus =
          visitPercentage >= 80 ? 'excellent' : visitPercentage >= 60 ? 'good' : visitPercentage >= 40 ? 'average' : 'poor';

        return {
          ...week,
          clusters: filteredClusters,
          visitPercentage,
          status: weekStatus,
        };
      })
      .filter((week) => {
        if (status !== 'all' && week.status !== status) return false;
        if (dateRange !== 'all') {
          const weekDate = new Date(week.weekStart);
          const now = new Date();
          const daysDiff = Math.floor((now - weekDate) / (1000 * 60 * 60 * 24));
          if (dateRange === 'last_week' && daysDiff > 7) return false;
          if (dateRange === 'last_month' && daysDiff > 30) return false;
          if (dateRange === 'last_quarter' && daysDiff > 90) return false;
        }
        return week.clusters.length > 0;
      });

    // Build CSV
    const headers = [
      'Week',
      'Year',
      'Period',
      'District',
      'Ward',
      'Cluster',
      'Coordinator',
      'Visited',
      'Visit Date',
      'Houses Visited',
      'Issues Found',
    ];

    const rows = [];
    filteredWeeks.forEach((week) => {
      (week.clusters || []).forEach((cluster) => {
        rows.push([
          week.weekNumber,
          week.year,
          `${week.weekStart} to ${week.weekEnd}`,
          cluster.district,
          typeof cluster.ward === 'string' ? cluster.ward : cluster.ward,
          cluster.name,
          cluster.coordinator || '',
          cluster.visited ? 'Yes' : 'No',
          cluster.visitDate ? new Date(cluster.visitDate).toLocaleDateString() : 'N/A',
          cluster.visitDetails?.housesVisited || 'N/A',
          cluster.visitDetails?.issuesFound || 'N/A',
        ]);
      });
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => csvEscape(String(v))).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cluster-visits-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting cluster visits:', error);
    return res.status(500).json({ error: 'Failed to export cluster visits' });
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDateFromWeekNumber(weekNumber, year) {
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay() || 7; // Make Sunday = 7
  const firstMonday = new Date(year, 0, 1 + ((8 - jan1Day) % 7));
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  return targetDate;
}

function csvEscape(value) {
  const needsQuotes = /[",\n]/.test(value);
  let out = value.replace(/"/g, '""');
  return needsQuotes ? `"${out}"` : out;
}


