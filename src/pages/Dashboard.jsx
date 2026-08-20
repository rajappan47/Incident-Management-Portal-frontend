import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Row, Col, Card, Statistic, Table, Tag, Typography,
  Spin, Space, Button, Tabs, Select, DatePicker, message, List, Empty, Segmented
} from 'antd';
import {
  AlertOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  CalendarOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  RiseOutlined,
  WarningOutlined,
  FieldTimeOutlined,
  TeamOutlined,
  UserOutlined,
  TagsOutlined,
  SwapOutlined,
  ReloadOutlined,
  BulbOutlined,
  BarChartOutlined,
  LineChartOutlined,
  ApartmentOutlined
} from '@ant-design/icons';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import AppLayout from '../components/common/AppLayout';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { PriorityBadge } from '../components/common/PriorityBadge';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const getPriorityRank = (priorityStr) => {
  if (!priorityStr) return 99;
  const p = String(priorityStr).trim().toLowerCase();
  switch (p) {
    case 'critical': return 1;
    case 'high':     return 2;
    case 'medium':   return 3;
    case 'low':      return 4;
    default:         return 99;
  }
};

const isClosedOrResolved = (statusStr) => {
  if (!statusStr) return false;
  const s = String(statusStr).trim().toLowerCase();
  return s === 'closed' || s === 'resolved';
};

const checkIsOverdue = (record) => {
  if (!record?.dueBy) return false;
  if (isClosedOrResolved(record.status)) return false;
  return new Date() > new Date(record.dueBy);
};

const isOnHold = (statusStr) => String(statusStr || '').trim().toLowerCase() === 'on hold';

const isDueToday = (record) => {
  if (!record?.dueBy) return false;
  if (isClosedOrResolved(record.status)) return false;
  const due = new Date(record.dueBy);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
};

const RANGE_OPTIONS = [
  { label: 'Last 24 Hours', value: '24h', hours: 24 },
  { label: 'Last 7 Days', value: '7d', hours: 24 * 7 },
  { label: 'Last 30 Days', value: '30d', hours: 24 * 30 },
  { label: 'Last 6 Months', value: '6m', hours: 24 * 30 * 6 },
  { label: 'Custom Range', value: 'custom' },
];

const filterByRange = (list, rangeValue, customRange) => {
  if (rangeValue === 'custom') {
    if (!customRange || !customRange[0] || !customRange[1]) return list;
    const start = customRange[0].startOf('day').toDate();
    const end = customRange[1].endOf('day').toDate();
    return list.filter((item) => {
      const created = item.createdAt ? new Date(item.createdAt) : null;
      return created && created >= start && created <= end;
    });
  }

  const rangeConfig = RANGE_OPTIONS.find((r) => r.value === rangeValue);
  if (!rangeConfig || !rangeConfig.hours) return list;
  const cutoff = new Date(Date.now() - rangeConfig.hours * 60 * 60 * 1000);
  return list.filter((item) => {
    const created = item.createdAt ? new Date(item.createdAt) : null;
    return created && created >= cutoff;
  });
};

// 🆕 V3 — FR3-15: same date-range selector as filterByRange above, but
// returns actual start/end Date objects instead of filtering a list — the
// Top Root Causes widget queries the server, so it needs real bounds to
// send as query params rather than a client-side predicate.
const getDateRangeBounds = (rangeValue, customRange) => {
  if (rangeValue === 'custom') {
    if (!customRange || !customRange[0] || !customRange[1]) return { start: null, end: null };
    return {
      start: customRange[0].startOf('day').toDate(),
      end: customRange[1].endOf('day').toDate(),
    };
  }
  const rangeConfig = RANGE_OPTIONS.find((r) => r.value === rangeValue);
  if (!rangeConfig || !rangeConfig.hours) return { start: null, end: null };
  return {
    start: new Date(Date.now() - rangeConfig.hours * 60 * 60 * 1000),
    end: new Date(),
  };
};

const buildTrendData = (list, rangeValue, customRange) => {
  let days = 7;
  if (rangeValue === 'custom' && customRange?.[0] && customRange?.[1]) {
    days = Math.max(1, Math.min(60, customRange[1].diff(customRange[0], 'day') + 1));
  } else {
    const rangeConfig = RANGE_OPTIONS.find((r) => r.value === rangeValue);
    days = rangeConfig?.hours ? Math.max(1, Math.min(30, Math.ceil(rangeConfig.hours / 24))) : 7;
  }

  const endDate = rangeValue === 'custom' && customRange?.[1] ? customRange[1].toDate() : new Date();

  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({ date: d, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), New: 0, Resolved: 0 });
  }

  list.forEach((item) => {
    const created = item.createdAt ? new Date(item.createdAt) : null;
    if (created) {
      created.setHours(0, 0, 0, 0);
      const bucket = buckets.find((b) => b.date.getTime() === created.getTime());
      if (bucket) bucket.New += 1;
    }
    if (isClosedOrResolved(item.status)) {
      const updated = item.updatedAt ? new Date(item.updatedAt) : null;
      if (updated) {
        updated.setHours(0, 0, 0, 0);
        const resolvedBucket = buckets.find((b) => b.date.getTime() === updated.getTime());
        if (resolvedBucket) resolvedBucket.Resolved += 1;
      }
    }
  });

  return buckets.map(({ label, New, Resolved }) => ({ label, New, Resolved }));
};

const isSLAViolated = (record) => {
  if (!record?.dueBy) return false;
  const due = new Date(record.dueBy);
  if (isClosedOrResolved(record.status)) {
    const resolvedAt = record.updatedAt ? new Date(record.updatedAt) : null;
    return resolvedAt ? resolvedAt > due : false;
  }
  return new Date() > due;
};

const getViolationMs = (record) => {
  if (!isSLAViolated(record)) return null;
  const due = new Date(record.dueBy);
  const endPoint = isClosedOrResolved(record.status) ? new Date(record.updatedAt) : new Date();
  return Math.max(0, endPoint - due);
};

const getResidualMs = (record) => {
  if (!record?.dueBy) return null;
  if (isClosedOrResolved(record.status)) return null;
  if (isSLAViolated(record)) return null;
  return Math.max(0, new Date(record.dueBy) - new Date());
};

const formatDuration = (ms) => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const buildSLATrendData = (list, rangeValue, customRange) => {
  let days = 7;
  if (rangeValue === 'custom' && customRange?.[0] && customRange?.[1]) {
    days = Math.max(1, Math.min(60, customRange[1].diff(customRange[0], 'day') + 1));
  } else {
    const rangeConfig = RANGE_OPTIONS.find((r) => r.value === rangeValue);
    days = rangeConfig?.hours ? Math.max(1, Math.min(30, Math.ceil(rangeConfig.hours / 24))) : 7;
  }

  const endDate = rangeValue === 'custom' && customRange?.[1] ? customRange[1].toDate() : new Date();

  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({ date: d, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), Violated: 0, 'Within SLA': 0 });
  }

  list.forEach((item) => {
    const created = item.createdAt ? new Date(item.createdAt) : null;
    if (!created) return;
    created.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.date.getTime() === created.getTime());
    if (!bucket) return;
    if (isSLAViolated(item)) bucket.Violated += 1;
    else bucket['Within SLA'] += 1;
  });

  return buckets.map(({ label, Violated, 'Within SLA': within }) => ({ label, Violated, 'Within SLA': within }));
};

const DASHBOARD_VIEW_OPTIONS = [
  { label: 'Overview Dashboard', value: 'overview' },
  { label: 'SLA Dashboard', value: 'sla' },
];

const PDF_COLORS = {
  brandDark: [15, 23, 42],
  brandBlue: [37, 99, 235],
  brandRed: [220, 38, 38],
  brandGreen: [22, 163, 74],
  brandAmber: [217, 119, 6],
  textMuted: [100, 116, 139],
  border: [226, 232, 240],
  bandLight: [248, 250, 252],
};

const drawPDFBanner = (pdf, { title, subtitle, pageWidth }) => {
  const bannerHeight = 26;
  pdf.setFillColor(...PDF_COLORS.brandDark);
  pdf.rect(0, 0, pageWidth, bannerHeight, 'F');

  pdf.setFont('times', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, 10, 13);

  pdf.setFont('times', 'normal');
  pdf.setFontSize(10.5);
  pdf.setTextColor(203, 213, 225);
  pdf.text(subtitle, 10, 20);

  pdf.setTextColor(0, 0, 0);
  return bannerHeight + 8;
};

const drawStatCardsPDF = (pdf, { cards, startY, margin, pageWidth, perRow = 4 }) => {
  const gap = 4;
  const cardWidth = (pageWidth - margin * 2 - gap * (perRow - 1)) / perRow;
  const cardHeight = 22;
  let x = margin;
  let y = startY;
  let col = 0;

  cards.forEach((card) => {
    pdf.setFillColor(...(card.color || PDF_COLORS.bandLight));
    pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
    pdf.setDrawColor(...PDF_COLORS.border);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

    pdf.setFont('times', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...PDF_COLORS.textMuted);
    const titleLines = pdf.splitTextToSize(card.title, cardWidth - 6);
    pdf.text(titleLines, x + 3, y + 7);

    pdf.setFont('times', 'bold');
    pdf.setFontSize(card.small ? 12 : 15);
    pdf.setTextColor(...(card.textColor || PDF_COLORS.brandDark));
    pdf.text(String(card.value), x + 3, y + cardHeight - 5);

    col += 1;
    if (col >= perRow) {
      col = 0;
      x = margin;
      y += cardHeight + gap;
    } else {
      x += cardWidth + gap;
    }
  });

  pdf.setTextColor(0, 0, 0);
  return y + (col > 0 ? cardHeight + gap : 0);
};

const addPDFFooters = (pdf, pageWidth, pageHeight) => {
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...PDF_COLORS.border);
    pdf.line(10, pageHeight - 14, pageWidth - 10, pageHeight - 14);
    pdf.setFont('times', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...PDF_COLORS.textMuted);
    pdf.text('Incident Management Portal — Confidential', 10, pageHeight - 9);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 10, pageHeight - 9, { align: 'right' });
  }
  pdf.setTextColor(0, 0, 0);
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingImage, setExportingImage] = useState(false); // 🆕 V3 — FR3-19
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingSLAPDF, setExportingSLAPDF] = useState(false);

  const [rawIncidents, setRawIncidents] = useState([]);
  const [dateRange, setDateRange] = useState('7d');
  const [customRange, setCustomRange] = useState(null);

  const [dashboardView, setDashboardView] = useState('overview');

  const [slaTeam, setSlaTeam] = useState('all');
  const [slaAgent, setSlaAgent] = useState('all');
  const [slaCategory, setSlaCategory] = useState('all');

  // 🆕 V3 — FR3-14: Trend chart filters + Line/Bar toggle
  const [trendCategory, setTrendCategory] = useState('all');
  const [trendPriority, setTrendPriority] = useState('all');
  const [trendChartType, setTrendChartType] = useState('line');

  // 🆕 V3 — FR3-15: Top Root Causes widget
  const [topRootCauses, setTopRootCauses] = useState([]);
  const [loadingTopCauses, setLoadingTopCauses] = useState(true);

  // 🆕 V3 — FR3-16: Major Incident Overview widget
  const [majorIncidentsOverview, setMajorIncidentsOverview] = useState([]);
  const [loadingMajorOverview, setLoadingMajorOverview] = useState(true);

  // 🆕 V3 — FR3-17: Agent/Team Performance widget
  const [performanceGroupBy, setPerformanceGroupBy] = useState('agent');
  const [performanceData, setPerformanceData] = useState([]);
  const [loadingPerformance, setLoadingPerformance] = useState(true);

  const captureRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 🆕 V3 — FR3-15: refetch whenever the date range changes, same trigger as
  // everything else on this page that respects dateRange/customRange.
  useEffect(() => {
    const fetchTopRootCauses = async () => {
      setLoadingTopCauses(true);
      try {
        const { start, end } = getDateRangeBounds(dateRange, customRange);
        const params = { limit: 5 };
        if (start) params.startDate = start.toISOString();
        if (end) params.endDate = end.toISOString();
        const res = await api.get('/dashboard/top-root-causes', { params });
        setTopRootCauses(res.data?.topCauses || []);
      } catch (err) {
        console.warn('Failed to load top root causes:', err.response?.data || err.message);
        setTopRootCauses([]);
      } finally {
        setLoadingTopCauses(false);
      }
    };
    fetchTopRootCauses();
  }, [dateRange, customRange]);

  // 🆕 V3 — FR3-16: Major Incident Overview — doesn't depend on date range,
  // since it's showing currently-active major incidents, not a historical slice.
  useEffect(() => {
    const fetchMajorOverview = async () => {
      setLoadingMajorOverview(true);
      try {
        const res = await api.get('/incidents/major-incidents-overview');
        setMajorIncidentsOverview(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.warn('Failed to load major incident overview:', err.response?.data || err.message);
        setMajorIncidentsOverview([]);
      } finally {
        setLoadingMajorOverview(false);
      }
    };
    fetchMajorOverview();
  }, []);

  // 🆕 V3 — FR3-17: Agent/Team Performance — respects date range + groupBy toggle
  useEffect(() => {
    const fetchPerformance = async () => {
      setLoadingPerformance(true);
      try {
        const { start, end } = getDateRangeBounds(dateRange, customRange);
        const params = { groupBy: performanceGroupBy };
        if (start) params.startDate = start.toISOString();
        if (end) params.endDate = end.toISOString();
        const res = await api.get('/dashboard/agent-performance', { params });
        setPerformanceData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.warn('Failed to load agent performance:', err.response?.data || err.message);
        setPerformanceData([]);
      } finally {
        setLoadingPerformance(false);
      }
    };
    fetchPerformance();
  }, [dateRange, customRange, performanceGroupBy]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/incidents');
      const totalList = Array.isArray(response?.data) ? response.data : [];
      setRawIncidents(totalList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const normalizedRole = user?.role?.trim();
  const isAdmin = normalizedRole === 'Admin';
  const isSupportAgent = normalizedRole === 'Support Agent' || normalizedRole === 'agent';
  const isEndUser = normalizedRole === 'End User' || normalizedRole === 'Customer';

  const filteredIncidents = useMemo(
    () => filterByRange(rawIncidents, dateRange, customRange),
    [rawIncidents, dateRange, customRange]
  );

  const { activeIncidents, closedIncidents, stats, trendData } = useMemo(() => {
    const activeList = filteredIncidents.filter((item) => !isClosedOrResolved(item.status));
    const closedList = filteredIncidents.filter((item) => isClosedOrResolved(item.status));

    activeList.sort((a, b) => {
      const rankA = getPriorityRank(a.priority);
      const rankB = getPriorityRank(b.priority);
      if (rankA === rankB) return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return rankA - rankB;
    });

    closedList.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    const openCount = filteredIncidents.filter((i) => String(i.status).toLowerCase() === 'new').length;
    const inProgressCount = filteredIncidents.filter((i) => String(i.status).toLowerCase() === 'in progress').length;
    const resolvedCount = closedList.length;
    const overdueCount = filteredIncidents.filter(checkIsOverdue).length;
    const onHoldCount = filteredIncidents.filter((i) => isOnHold(i.status)).length;
    const dueTodayCount = filteredIncidents.filter(isDueToday).length;

    return {
      activeIncidents: activeList,
      closedIncidents: closedList,
      stats: {
        total: filteredIncidents.length,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        overdue: overdueCount,
        onHold: onHoldCount,
        dueToday: dueTodayCount,
      },
      trendData: buildTrendData(filteredIncidents, dateRange, customRange),
    };
  }, [filteredIncidents, dateRange, customRange]);

  // 🆕 V3 — FR3-14: category/priority-filtered trend data, kept separate
  // from the block above so the original trendData computation is untouched.
  const trendFilteredIncidents = useMemo(() => {
    return filteredIncidents.filter((item) => {
      if (trendCategory !== 'all') {
        const catId = typeof item.category === 'object' ? (item.category?._id || item.category?.name) : item.category;
        if (catId !== trendCategory) return false;
      }
      if (trendPriority !== 'all' && item.priority !== trendPriority) return false;
      return true;
    });
  }, [filteredIncidents, trendCategory, trendPriority]);

  const filteredTrendData = useMemo(
    () => buildTrendData(trendFilteredIncidents, dateRange, customRange),
    [trendFilteredIncidents, dateRange, customRange]
  );

  const teamOptions = useMemo(() => {
    const teams = new Set();
    rawIncidents.forEach((i) => { if (i.assignedTo?.team) teams.add(i.assignedTo.team); });
    return Array.from(teams).sort();
  }, [rawIncidents]);

  const agentOptions = useMemo(() => {
    const map = new Map();
    rawIncidents.forEach((i) => {
      const id = i.assignedTo?._id || i.assignedTo?.id;
      if (id && i.assignedTo?.name) map.set(id, i.assignedTo.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawIncidents]);

  const categoryOptions = useMemo(() => {
    const map = new Map();
    rawIncidents.forEach((i) => {
      if (typeof i.category === 'object' && i.category?.name) {
        map.set(i.category._id || i.category.name, i.category.name);
      } else if (typeof i.category === 'string' && i.category) {
        map.set(i.category, i.category);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawIncidents]);

  const slaFilteredIncidents = useMemo(() => {
    return filteredIncidents.filter((item) => {
      if (slaTeam !== 'all' && item.assignedTo?.team !== slaTeam) return false;
      if (slaAgent !== 'all') {
        const agentId = item.assignedTo?._id || item.assignedTo?.id;
        if (agentId !== slaAgent) return false;
      }
      if (slaCategory !== 'all') {
        const catId = typeof item.category === 'object' ? (item.category?._id || item.category?.name) : item.category;
        if (catId !== slaCategory) return false;
      }
      return true;
    });
  }, [filteredIncidents, slaTeam, slaAgent, slaCategory]);

  const slaStats = useMemo(() => {
    const violatedList = slaFilteredIncidents.filter(isSLAViolated);
    const residualList = slaFilteredIncidents
      .map(getResidualMs)
      .filter((ms) => ms !== null);
    const violationMsList = violatedList
      .map(getViolationMs)
      .filter((ms) => ms !== null);

    const avgResidualMs = residualList.length
      ? residualList.reduce((sum, ms) => sum + ms, 0) / residualList.length
      : 0;
    const avgViolationMs = violationMsList.length
      ? violationMsList.reduce((sum, ms) => sum + ms, 0) / violationMsList.length
      : 0;

    return {
      violatedCount: violatedList.length,
      avgResidualMs,
      avgViolationMs,
      violatedList,
    };
  }, [slaFilteredIncidents]);

  const slaTrendData = useMemo(
    () => buildSLATrendData(slaFilteredIncidents, dateRange, customRange),
    [slaFilteredIncidents, dateRange, customRange]
  );

  const topViolatingAgents = useMemo(() => {
    const map = new Map();
    slaStats.violatedList.forEach((item) => {
      const name = item.assignedTo?.name || 'Unassigned';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [slaStats.violatedList]);

  const violationsByCategory = useMemo(() => {
    const map = new Map();
    slaStats.violatedList.forEach((item) => {
      const name = typeof item.category === 'object' ? (item.category?.name || 'Uncategorized') : (item.category || 'Uncategorized');
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [slaStats.violatedList]);

  const handleResetSLAFilters = () => {
    setSlaTeam('all');
    setSlaAgent('all');
    setSlaCategory('all');
    message.success('Filters reset');
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const rows = rawIncidents.map((item) => ({
        'Incident ID': item._id || '',
        'Title': item.title || '',
        'Category': typeof item.category === 'object' ? (item.category?.name || 'N/A') : (item.category || 'N/A'),
        'Priority': item.priority || '',
        'Status': item.status || '',
        'Reported By (Name)': item.reportedBy?.name || 'N/A',
        'Reported By (Email)': item.reportedBy?.email || 'N/A',
        'Assigned Agent': item.assignedTo?.name || 'Unassigned',
        'SLA Due Date': item.dueBy ? new Date(item.dueBy).toLocaleString() : 'N/A',
        'Created At': item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A',
      }));

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `all-incidents-${dayjs().format('YYYY-MM-DD_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('CSV exported successfully');
    } catch (err) {
      console.error('CSV export failed:', err);
      message.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  // 🆕 V3 — FR3-19: Dashboard Export as Image. Reuses the same captureRef +
  // html2canvas already wired up for the PDF export — this is the same
  // rendered snapshot, just downloaded directly as a PNG instead of being
  // embedded into a PDF page.
  const handleExportImage = async () => {
    if (!captureRef.current) return;
    setExportingImage(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `incident-dashboard-${dayjs().format('YYYY-MM-DD_HHmm')}.png`;
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      message.success('Dashboard image exported successfully');
    } catch (err) {
      console.error('Image export failed:', err);
      message.error('Failed to export dashboard image');
    } finally {
      setExportingImage(false);
    }
  };

  const handleExportPDF = async () => {
    if (!captureRef.current) return;
    setExportingPDF(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const rangeLabel = dateRange === 'custom' && customRange?.[0] && customRange?.[1]
        ? `${customRange[0].format('DD MMM YYYY')} – ${customRange[1].format('DD MMM YYYY')}`
        : RANGE_OPTIONS.find((r) => r.value === dateRange)?.label || dateRange;

      let y = drawPDFBanner(pdf, {
        title: 'Incident Dashboard Report',
        subtitle: `Range: ${rangeLabel}   •   Generated: ${new Date().toLocaleString()}   •   Prepared by: ${user?.name || 'Admin'}`,
        pageWidth,
      });

      y = drawStatCardsPDF(pdf, {
        startY: y,
        margin,
        pageWidth,
        perRow: 4,
        cards: [
          { title: 'Open Tickets', value: stats.open, color: [239, 246, 255], textColor: PDF_COLORS.brandBlue },
          { title: 'On Hold', value: stats.onHold, color: [255, 251, 235], textColor: PDF_COLORS.brandAmber },
          { title: 'Overdue Tickets', value: stats.overdue, color: [254, 242, 242], textColor: PDF_COLORS.brandRed },
          { title: 'Due Today', value: stats.dueToday, color: [245, 243, 255], textColor: [124, 58, 237] },
        ],
      });
      y += 6;

      pdf.setFont('times', 'bold');
      pdf.setFontSize(12.5);
      pdf.setTextColor(...PDF_COLORS.brandDark);
      pdf.text('Ticket Volume Trend', margin, y);
      y += 4;

      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxChartHeight = pageHeight - y - 20;
      const finalChartHeight = Math.min(imgHeight, maxChartHeight);
      const finalChartWidth = (finalChartHeight / imgHeight) * imgWidth;

      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.roundedRect(margin, y, finalChartWidth, finalChartHeight, 2, 2, 'S');
      pdf.addImage(imgData, 'PNG', margin + 1, y + 1, finalChartWidth - 2, finalChartHeight - 2);
      y += finalChartHeight + 8;

      pdf.setFont('times', 'bold');
      pdf.setFontSize(12.5);
      pdf.setTextColor(...PDF_COLORS.brandDark);
      pdf.text('Summary', margin, y);
      y += 5;

      pdf.setFont('times', 'normal');
      pdf.setFontSize(10.5);
      pdf.setTextColor(51, 65, 85);
      const summaryLine = `Total: ${stats.total}   |   In Progress: ${stats.inProgress}   |   Resolved/Closed: ${stats.resolved}`;
      pdf.text(summaryLine, margin, y);

      pdf.addPage();
      let bY = drawPDFBanner(pdf, {
        title: 'Incident Breakdown',
        subtitle: `Range: ${rangeLabel}   •   Sorted by Date (Ascending)   •   ${filteredIncidents.length} ticket(s)`,
        pageWidth,
      });

      const sortedTickets = [...filteredIncidents].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateA - dateB;
      });

      if (sortedTickets.length === 0) {
        pdf.setFont('times', 'italic');
        pdf.setFontSize(12);
        pdf.setTextColor(...PDF_COLORS.textMuted);
        pdf.text('No tickets found in the selected date range.', margin, bY + 4);
      } else {
        const tableRows = sortedTickets.map((t) => [
          t.createdAt ? dayjs(t.createdAt).format('DD MMM YYYY') : 'N/A',
          t.title || 'Untitled',
          t.priority || 'N/A',
          t.status || 'N/A',
          typeof t.category === 'object' ? (t.category?.name || 'N/A') : (t.category || 'N/A'),
          t.assignedTo?.name || 'Unassigned',
        ]);

        autoTable(pdf, {
          startY: bY,
          head: [['Date', 'Title', 'Priority', 'Status', 'Category', 'Assigned Agent']],
          body: tableRows,
          margin: { left: margin, right: margin, bottom: 18 },
          theme: 'striped',
          styles: {
            font: 'times',
            fontSize: 12,
            cellPadding: 4,
            textColor: [30, 41, 59],
            lineColor: PDF_COLORS.border,
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: PDF_COLORS.brandDark,
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'left',
          },
          alternateRowStyles: { fillColor: PDF_COLORS.bandLight },
          columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 42 },
            2: { cellWidth: 22 },
            3: { cellWidth: 24 },
            4: { cellWidth: 36 },
            5: { cellWidth: 40 },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const priority = String(data.cell.raw).toLowerCase();
              if (priority === 'critical' || priority === 'high') {
                data.cell.styles.textColor = PDF_COLORS.brandRed;
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });
      }

      addPDFFooters(pdf, pageWidth, pageHeight);
      pdf.save(`incident-dashboard-${dayjs().format('YYYY-MM-DD_HHmm')}.pdf`);
      message.success('Dashboard PDF exported successfully');
    } catch (err) {
      console.error('PDF export failed:', err);
      message.error('Failed to export PDF report');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportSLAPDF = () => {
    setExportingSLAPDF(true);
    try {
      const allViolated = rawIncidents.filter(isSLAViolated);
      const allResidualList = rawIncidents.map(getResidualMs).filter((ms) => ms !== null);
      const allViolationMsList = allViolated.map(getViolationMs).filter((ms) => ms !== null);

      const overallAvgResidual = allResidualList.length
        ? allResidualList.reduce((s, ms) => s + ms, 0) / allResidualList.length
        : 0;
      const overallAvgViolation = allViolationMsList.length
        ? allViolationMsList.reduce((s, ms) => s + ms, 0) / allViolationMsList.length
        : 0;

      const teamMap = new Map();
      rawIncidents.forEach((item) => {
        const teamName = item.assignedTo?.team || 'Unassigned Team';
        const categoryName = typeof item.category === 'object' ? (item.category?.name || 'Uncategorized') : (item.category || 'Uncategorized');
        const agentName = item.assignedTo?.name || 'Unassigned';

        if (!teamMap.has(teamName)) teamMap.set(teamName, new Map());
        const catMap = teamMap.get(teamName);
        if (!catMap.has(categoryName)) catMap.set(categoryName, new Map());
        const agentMap = catMap.get(categoryName);
        if (!agentMap.has(agentName)) agentMap.set(agentName, { total: 0, violated: 0, violationMsList: [] });

        const entry = agentMap.get(agentName);
        entry.total += 1;
        if (isSLAViolated(item)) {
          entry.violated += 1;
          const ms = getViolationMs(item);
          if (ms !== null) entry.violationMsList.push(ms);
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      let y = drawPDFBanner(pdf, {
        title: 'SLA Compliance Report',
        subtitle: `Full Dataset — All Teams, Agents & Categories   •   Generated: ${new Date().toLocaleString()}`,
        pageWidth,
      });

      y = drawStatCardsPDF(pdf, {
        startY: y,
        margin,
        pageWidth,
        perRow: 3,
        cards: [
          { title: 'SLA Violated Tickets', value: allViolated.length, color: [254, 242, 242], textColor: PDF_COLORS.brandRed },
          { title: 'Average Residual Time', value: formatDuration(overallAvgResidual), color: [236, 253, 245], textColor: PDF_COLORS.brandGreen, small: true },
          { title: 'Average Violation Time', value: formatDuration(overallAvgViolation), color: [254, 242, 242], textColor: PDF_COLORS.brandRed, small: true },
        ],
      });
      y += 8;

      const sortedTeams = Array.from(teamMap.keys()).sort();

      sortedTeams.forEach((teamName) => {
        const catMap = teamMap.get(teamName);
        let teamTotal = 0;
        let teamViolated = 0;
        catMap.forEach((agentMap) => {
          agentMap.forEach((entry) => {
            teamTotal += entry.total;
            teamViolated += entry.violated;
          });
        });

        if (y > pageHeight - 40) {
          pdf.addPage();
          y = 15;
        }

        pdf.setFillColor(...PDF_COLORS.brandDark);
        pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
        pdf.setFont('times', 'bold');
        pdf.setFontSize(11.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(
          `Team: ${teamName}   —   ${teamTotal} ticket(s), ${teamViolated} violated`,
          margin + 3,
          y + 5.5
        );
        pdf.setTextColor(0, 0, 0);
        y += 12;

        const sortedCategories = Array.from(catMap.keys()).sort();

        sortedCategories.forEach((categoryName) => {
          const agentMap = catMap.get(categoryName);

          if (y > pageHeight - 30) {
            pdf.addPage();
            y = 15;
          }

          pdf.setFont('times', 'bold');
          pdf.setFontSize(10.5);
          pdf.setTextColor(...PDF_COLORS.brandBlue);
          pdf.text(`Category: ${categoryName}`, margin + 4, y);
          pdf.setTextColor(0, 0, 0);
          y += 5;

          const rows = Array.from(agentMap.entries()).map(([agentName, entry]) => {
            const avgMs = entry.violationMsList.length
              ? entry.violationMsList.reduce((s, ms) => s + ms, 0) / entry.violationMsList.length
              : 0;
            const rate = entry.total ? Math.round((entry.violated / entry.total) * 100) : 0;
            return [agentName, String(entry.total), String(entry.violated), `${rate}%`, entry.violated ? formatDuration(avgMs) : '—'];
          });

          autoTable(pdf, {
            startY: y,
            head: [['Agent / Member', 'Total Tickets', 'Violated', 'Violation Rate', 'Avg Violation Time']],
            body: rows,
            margin: { left: margin + 4, right: margin, bottom: 18 },
            theme: 'grid',
            styles: { font: 'times', fontSize: 10, cellPadding: 2.5, textColor: [30, 41, 59], lineColor: PDF_COLORS.border, lineWidth: 0.15 },
            headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59], fontSize: 9.5, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 28 }, 2: { cellWidth: 24 }, 3: { cellWidth: 30 }, 4: { cellWidth: 35 } },
            didParseCell: (data) => {
              if (data.section === 'body' && data.column.index === 2 && Number(data.cell.raw) > 0) {
                data.cell.styles.textColor = PDF_COLORS.brandRed;
                data.cell.styles.fontStyle = 'bold';
              }
            },
          });

          y = pdf.lastAutoTable.finalY + 6;
        });

        y += 4;
      });

      addPDFFooters(pdf, pageWidth, pageHeight);
      pdf.save(`sla-compliance-report-${dayjs().format('YYYY-MM-DD_HHmm')}.pdf`);
      message.success('SLA report exported successfully');
    } catch (err) {
      console.error('SLA PDF export failed:', err);
      message.error('Failed to export SLA report');
    } finally {
      setExportingSLAPDF(false);
    }
  };

  const incidentColumns = [
    { title: 'Title', dataIndex: 'title', key: 'title', render: (text) => <Text strong>{text || 'Untitled'}</Text> },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', render: (p) => <PriorityBadge priority={p} /> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const status = String(s || '').toLowerCase();
        let color = 'default';
        if (status === 'new') color = 'blue';
        else if (status === 'in progress') color = 'warning';
        else if (status === 'on hold') color = 'default';
        else if (status === 'resolved' || status === 'closed') color = 'success';
        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/incidents/${record._id}`)}>View</Button>
      ),
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    { key: 'open', title: 'Open Tickets', value: stats.open, icon: <AlertOutlined />, accent: '#2563eb', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' },
    { key: 'onHold', title: 'On Hold', value: stats.onHold, icon: <PauseCircleOutlined />, accent: '#d97706', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' },
    { key: 'overdue', title: 'Overdue Tickets', value: stats.overdue, icon: <ClockCircleOutlined />, accent: '#dc2626', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' },
    { key: 'dueToday', title: 'Due Today', value: stats.dueToday, icon: <CalendarOutlined />, accent: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' },
  ];

  const slaStatCards = [
    { key: 'violatedTickets', title: 'SLA Violated Tickets', value: slaStats.violatedCount, icon: <WarningOutlined />, accent: '#dc2626', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', isDuration: false },
    { key: 'avgResidual', title: 'Average Residual Time', value: formatDuration(slaStats.avgResidualMs), icon: <FieldTimeOutlined />, accent: '#059669', bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', isDuration: true },
    { key: 'avgViolation', title: 'Average Violation Time', value: formatDuration(slaStats.avgViolationMs), icon: <ClockCircleOutlined />, accent: '#dc2626', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', isDuration: true },
  ];

  const isSLAView = isAdmin && dashboardView === 'sla';

  return (
    <AppLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space align="center" size={10}>
              <Text type="secondary" style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
                Dashboard
              </Text>
              {isAdmin && (
                <Select
                  value={dashboardView}
                  onChange={setDashboardView}
                  options={DASHBOARD_VIEW_OPTIONS}
                  suffixIcon={<SwapOutlined />}
                  size="small"
                  style={{ minWidth: 170 }}
                  variant="filled"
                />
              )}
            </Space>
            <Title level={2} style={{ margin: '2px 0 4px', fontWeight: 700 }}>
              {isSLAView ? 'SLA Compliance Overview' : `Welcome back, ${user?.name} 👋`}
            </Title>
            <Text type="secondary">
              Role: <Tag color="geekblue">{user?.role}</Tag>
              {isSLAView
                ? ' Track SLA breaches, residual time, and violation trends across teams.'
                : isEndUser
                  ? ' Overview of your submitted tickets.'
                  : ' Overview of operational incidents and service tickets.'}
            </Text>
          </Col>
          <Col xs={24} md={12}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }} size="middle">
              <Select
                value={dateRange}
                onChange={(val) => {
                  setDateRange(val);
                  if (val !== 'custom') setCustomRange(null);
                }}
                options={RANGE_OPTIONS.map(({ label, value }) => ({ label, value }))}
                style={{ minWidth: 160 }}
              />

              {dateRange === 'custom' && (
                <RangePicker value={customRange} onChange={(vals) => setCustomRange(vals)} format="DD MMM YYYY" allowClear />
              )}

              {isAdmin && dashboardView === 'overview' && (
                <Button icon={<FileExcelOutlined />} loading={exportingCSV} onClick={handleExportCSV}>Export CSV</Button>
              )}

              {isAdmin && dashboardView === 'overview' && (
                <Button icon={<FilePdfOutlined />} loading={exportingPDF} onClick={handleExportPDF}>Export PDF</Button>
              )}

              {/* 🆕 V3 — FR3-19 */}
              {isAdmin && dashboardView === 'overview' && (
                <Button icon={<FileImageOutlined />} loading={exportingImage} onClick={handleExportImage}>Export Image</Button>
              )}

              {isAdmin && dashboardView === 'sla' && (
                <Button icon={<FilePdfOutlined />} loading={exportingSLAPDF} onClick={handleExportSLAPDF}>
                  Export PDF (Full Report)
                </Button>
              )}

              {!isAdmin && (
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/incidents/new')}>
                  Raise New Incident
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {isSLAView && (
          <>
            <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <Space wrap size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space wrap size="middle">
                  <Select
                    value={slaTeam}
                    onChange={setSlaTeam}
                    style={{ minWidth: 170 }}
                    suffixIcon={<TeamOutlined />}
                    options={[
                      { label: 'All Teams', value: 'all' },
                      ...teamOptions.map((t) => ({ label: t, value: t })),
                    ]}
                  />
                  <Select
                    value={slaAgent}
                    onChange={setSlaAgent}
                    style={{ minWidth: 170 }}
                    suffixIcon={<UserOutlined />}
                    options={[
                      { label: 'All Agents', value: 'all' },
                      ...agentOptions.map((a) => ({ label: a.name, value: a.id })),
                    ]}
                  />
                  <Select
                    value={slaCategory}
                    onChange={setSlaCategory}
                    style={{ minWidth: 170 }}
                    suffixIcon={<TagsOutlined />}
                    options={[
                      { label: 'All Categories', value: 'all' },
                      ...categoryOptions.map((c) => ({ label: c.name, value: c.id })),
                    ]}
                  />
                </Space>
                <Button icon={<ReloadOutlined />} onClick={handleResetSLAFilters}>
                  Reset Filters
                </Button>
              </Space>
            </Card>

            <Row gutter={[16, 16]}>
              {slaStatCards.map((card) => (
                <Col key={card.key} xs={24} sm={8}>
                  <Card
                    hoverable
                    bordered={false}
                    style={{ background: card.bg, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                    styles={{ body: { padding: '18px 20px' } }}
                  >
                    <Text style={{ color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                      {card.icon && <span style={{ color: card.accent, marginRight: 6 }}>{card.icon}</span>}
                      {card.title}
                    </Text>
                    <Text style={{ color: card.accent, fontWeight: 700, fontSize: card.isDuration ? 22 : 30 }}>
                      {card.value}
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>

            <Card
              title={
                <Space>
                  <RiseOutlined style={{ color: '#dc2626' }} />
                  <Text strong style={{ fontSize: 16 }}>SLA Violation Trend</Text>
                </Space>
              }
              bordered={false}
              style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={slaTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Line type="monotone" dataKey="Violated" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Within SLA" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card
                  title={<Text strong style={{ fontSize: 15 }}>Top Violating Agents</Text>}
                  bordered={false}
                  style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '100%' }}
                >
                  {topViolatingAgents.length === 0 ? (
                    <Empty description="No SLA violations in this range" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <List
                      dataSource={topViolatingAgents}
                      renderItem={(item, idx) => (
                        <List.Item>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                              <Tag color={idx === 0 ? 'red' : 'default'}>{idx + 1}</Tag>
                              <Text strong>{item.name}</Text>
                            </Space>
                            <Tag color="error">{item.count} violation{item.count > 1 ? 's' : ''}</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  title={<Text strong style={{ fontSize: 15 }}>Violations by Category</Text>}
                  bordered={false}
                  style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '100%' }}
                >
                  {violationsByCategory.length === 0 ? (
                    <Empty description="No SLA violations in this range" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <List
                      dataSource={violationsByCategory}
                      renderItem={(item, idx) => (
                        <List.Item>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                              <Tag color={idx === 0 ? 'red' : 'default'}>{idx + 1}</Tag>
                              <Text strong>{item.name}</Text>
                            </Space>
                            <Tag color="error">{item.count} violation{item.count > 1 ? 's' : ''}</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}

        {!isSLAView && (
          <div ref={captureRef}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>

              <Row gutter={[16, 16]}>
                {statCards.map((card) => (
                  <Col key={card.key} xs={12} sm={12} md={6}>
                    <Card
                      hoverable
                      bordered={false}
                      style={{ background: card.bg, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                      styles={{ body: { padding: '18px 20px' } }}
                    >
                      <Text style={{ color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                        {card.icon && <span style={{ color: card.accent, marginRight: 6 }}>{card.icon}</span>}
                        {card.title}
                      </Text>
                      <Statistic
                        value={card.value}
                        valueStyle={{ color: card.accent, fontWeight: 700, fontSize: 30 }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>

              {(isAdmin || isSupportAgent) && (
                <Card
                  title={
                    <Space>
                      <RiseOutlined style={{ color: '#2563eb' }} />
                      <Text strong style={{ fontSize: 16 }}>Ticket Volume Trend</Text>
                    </Space>
                  }
                  extra={
                    // 🆕 V3 — FR3-14: filterable by category, priority, and chart type
                    // (date range already filters this card via the shared date picker above)
                    <Space wrap>
                      <Select
                        size="small"
                        value={trendCategory}
                        onChange={setTrendCategory}
                        style={{ minWidth: 140 }}
                        suffixIcon={<TagsOutlined />}
                        options={[
                          { label: 'All Categories', value: 'all' },
                          ...categoryOptions.map((c) => ({ label: c.name, value: c.id })),
                        ]}
                      />
                      <Select
                        size="small"
                        value={trendPriority}
                        onChange={setTrendPriority}
                        style={{ minWidth: 120 }}
                        options={[
                          { label: 'All Priorities', value: 'all' },
                          { label: 'Critical', value: 'Critical' },
                          { label: 'High', value: 'High' },
                          { label: 'Medium', value: 'Medium' },
                          { label: 'Low', value: 'Low' },
                        ]}
                      />
                      <Segmented
                        size="small"
                        value={trendChartType}
                        onChange={setTrendChartType}
                        options={[
                          { label: 'Line', value: 'line', icon: <LineChartOutlined /> },
                          { label: 'Bar', value: 'bar', icon: <BarChartOutlined /> },
                        ]}
                      />
                    </Space>
                  }
                  bordered={false}
                  style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {trendChartType === 'bar' ? (
                        <BarChart data={filteredTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                          <Legend wrapperStyle={{ fontSize: 13 }} />
                          <Bar dataKey="New" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Resolved" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <LineChart data={filteredTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                          <Legend wrapperStyle={{ fontSize: 13 }} />
                          <Line type="monotone" dataKey="New" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="Resolved" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* 🆕 V3 — FR3-15: Top Root Causes Widget (+ FR3-18 drill-down) */}
              {(isAdmin || isSupportAgent) && (
                <Card
                  title={
                    <Space>
                      <BulbOutlined style={{ color: '#d97706' }} />
                      <Text strong style={{ fontSize: 16 }}>Top Root Causes</Text>
                    </Space>
                  }
                  bordered={false}
                  style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  {loadingTopCauses ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Spin size="small" />
                    </div>
                  ) : topRootCauses.length === 0 ? (
                    <Empty
                      description="No Approved RCAs in this range yet"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <List
                      dataSource={topRootCauses}
                      renderItem={(item, idx) => (
                        <List.Item
                          // 🆕 FR3-18: click a row to see the incidents behind this root cause
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/incidents?rcaCategory=${encodeURIComponent(item.category)}`)}
                        >
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                              <Tag color={idx === 0 ? 'gold' : 'default'}>{idx + 1}</Tag>
                              <Text strong>{item.category}</Text>
                            </Space>
                            <Space size="small">
                              <Text type="secondary" style={{ fontSize: 12 }}>{item.percent}%</Text>
                              <Tag color="warning">
                                {item.count} incident{item.count > 1 ? 's' : ''}
                              </Tag>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              )}

              {/* 🆕 V3 — FR3-16: Correlation & Major Incident Overview Widget */}
              {(isAdmin || isSupportAgent) && (
                <Card
                  title={
                    <Space>
                      <ApartmentOutlined style={{ color: '#7c3aed' }} />
                      <Text strong style={{ fontSize: 16 }}>Active Major Incidents</Text>
                    </Space>
                  }
                  bordered={false}
                  style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  {loadingMajorOverview ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Spin size="small" />
                    </div>
                  ) : majorIncidentsOverview.length === 0 ? (
                    <Empty
                      description="No active major incidents right now"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <List
                      dataSource={majorIncidentsOverview}
                      renderItem={(row) => {
                        const majorId = row.incident._id || row.incident.id;
                        return (
                          <List.Item
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/incidents/${majorId}`)}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <PriorityBadge priority={row.incident.priority} />
                                  <Text strong>{row.incident.title}</Text>
                                </Space>
                              }
                              description={
                                <Space size="small">
                                  <Tag>{row.incident.status}</Tag>
                                  {row.openChildCount > 0 && (
                                    <Text type="warning" style={{ fontSize: 12 }}>
                                      {row.openChildCount} child{row.openChildCount !== 1 ? 'ren' : ''} still open
                                    </Text>
                                  )}
                                </Space>
                              }
                            />
                            <Space size="small">
                              <Tag color="purple">{row.childCount} child{row.childCount !== 1 ? 'ren' : ''}</Tag>
                              <Tag color="blue">{row.correlationLinkCount} linked</Tag>
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </Card>
              )}

              {/* 🆕 V3 — FR3-17: Agent/Team Performance Widget (+ FR3-18 drill-down) */}
              {(isAdmin || isSupportAgent) && (
                <Card
                  title={
                    <Space>
                      <TeamOutlined style={{ color: '#059669' }} />
                      <Text strong style={{ fontSize: 16 }}>
                        {performanceGroupBy === 'team' ? 'Team' : 'Agent'} Performance
                      </Text>
                    </Space>
                  }
                  extra={
                    <Segmented
                      size="small"
                      value={performanceGroupBy}
                      onChange={setPerformanceGroupBy}
                      options={[
                        { label: 'By Agent', value: 'agent' },
                        { label: 'By Team', value: 'team' },
                      ]}
                    />
                  }
                  bordered={false}
                  style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  {loadingPerformance ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Spin size="small" />
                    </div>
                  ) : performanceData.length === 0 ? (
                    <Empty
                      description="No resolved tickets in this range yet"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <Table
                      size="small"
                      pagination={false}
                      rowKey={(row) => row.id || row.team}
                      dataSource={performanceData}
                      onRow={(row) => ({
                        style: { cursor: 'pointer' },
                        // 🆕 FR3-18: click a row to see that agent's / team's resolved tickets
                        onClick: () =>
                          navigate(
                            performanceGroupBy === 'team'
                              ? `/incidents?team=${encodeURIComponent(row.team)}`
                              : `/incidents?assignedAgent=${row.id}`
                          ),
                      })}
                      columns={[
                        {
                          title: performanceGroupBy === 'team' ? 'Team' : 'Agent',
                          dataIndex: performanceGroupBy === 'team' ? 'team' : 'name',
                        },
                        { title: 'Resolved', dataIndex: 'ticketsResolved', width: 100 },
                        {
                          title: 'Avg Resolution Time',
                          dataIndex: 'avgResolutionMs',
                          render: (ms) => formatDuration(ms),
                        },
                        {
                          title: 'SLA Compliance',
                          dataIndex: 'slaCompliancePercent',
                          render: (pct) => (
                            <Tag color={pct >= 90 ? 'success' : pct >= 70 ? 'warning' : 'error'}>{pct}%</Tag>
                          ),
                        },
                      ]}
                    />
                  )}
                </Card>
              )}

              {(isAdmin || isSupportAgent) && (
                <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <Tabs
                    defaultActiveKey="active"
                    tabBarExtraContent={<Button type="link" onClick={() => navigate('/incidents')}>View All</Button>}
                    items={[
                      {
                        key: 'active',
                        label: `Active Queue (${activeIncidents.length})`,
                        children: (
                          <Table rowKey="_id" columns={incidentColumns} dataSource={activeIncidents.slice(0, 8)} pagination={false} size="small" scroll={{ x: 500 }} />
                        ),
                      },
                      {
                        key: 'closed',
                        label: `Closed / Resolved (${closedIncidents.length})`,
                        children: (
                          <Table rowKey="_id" columns={incidentColumns} dataSource={closedIncidents.slice(0, 8)} pagination={false} size="small" scroll={{ x: 500 }} />
                        ),
                      },
                    ]}
                  />
                </Card>
              )}

              {isEndUser && (
                <Card
                  title={<Text strong style={{ fontSize: 16 }}>My Tickets ({filteredIncidents.length})</Text>}
                  bordered={false}
                  style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  <Table rowKey="_id" columns={incidentColumns} dataSource={filteredIncidents.slice(0, 10)} pagination={false} size="small" scroll={{ x: 500 }} />
                </Card>
              )}

            </Space>
          </div>
        )}

      </Space>
    </AppLayout>
  );
};

export default Dashboard;