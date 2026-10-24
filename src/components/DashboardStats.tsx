import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';
import { COURSES_DATA } from '../data/coursesData';
import { getStoredApplications } from '../data/studentsData';

export interface CourseStatItem {
  courseCode: string;
  courseTitle: string;
  count: number;
  percentage: number;
  duration?: string;
  recentStudents: string[];
}

export interface DayAdmissionStat {
  date: string; // YYYY-MM-DD
  displayDate: string;
  count: number;
}

export interface DashboardStatsProps {
  className?: string;
  onCourseClick?: (courseCode: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ className = '', onCourseClick }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'cache' | 'offline'>('supabase');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'bars' | 'trend'>('bars');
  const [hoveredItem, setHoveredItem] = useState<CourseStatItem | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayAdmissionStat | null>(null);
  const [selectedCourseHighlight, setSelectedCourseHighlight] = useState<string | null>(null);

  // SVG Refs for D3
  const barChartRef = useRef<SVGSVGElement | null>(null);
  const trendChartRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Observe container width for responsive D3 rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch admissions from Supabase 'admissions' table for the last 30 days
  const fetchLast30DaysAdmissions = async () => {
    setLoading(true);
    setError(null);

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
    const thirtyDaysAgoDateStr = thirtyDaysAgoISO.split('T')[0];

    let admissionsData: any[] = [];
    let source: 'supabase' | 'cache' | 'offline' = 'offline';

    // 1. Authoritative fetch from Supabase
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        // Query public.admissions where created_at or admission_date is within last 30 days
        const { data, error: sbError } = await supabase
          .from('admissions')
          .select('id, enrollment_number, student_name, course, course_code, branch_name, branch_code, admission_date, created_at, registration_date, payment_status, application_status')
          .or(`created_at.gte.${thirtyDaysAgoISO},admission_date.gte.${thirtyDaysAgoDateStr},registration_date.gte.${thirtyDaysAgoISO}`)
          .order('created_at', { ascending: false });

        if (sbError) {
          console.warn('[DashboardStats] Supabase query notice:', sbError.message);
          // If table does not exist or permission issue, fallback gracefully
          throw sbError;
        }

        if (Array.isArray(data)) {
          admissionsData = data;
          source = 'supabase';
        }
      } catch (err: any) {
        console.warn('[DashboardStats] Falling back to local data source:', err);
        setError(err?.message || 'Notice: Reading from synchronized local cache while Supabase connects.');
      }
    }

    // 2. Graceful Fallback if Supabase was unconfigured or returned empty in development
    if (admissionsData.length === 0 && source !== 'supabase') {
      try {
        const localApps = getStoredApplications();
        const filtered = localApps.filter((a) => {
          const dt = a.admissionDate || a.createdAt;
          if (!dt) return false;
          const d = new Date(dt);
          return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
        });

        if (filtered.length > 0) {
          admissionsData = filtered.map((a) => ({
            id: a.id,
            enrollment_number: a.enrollmentId,
            student_name: a.studentName,
            course: a.course,
            course_code: a.course,
            branch_name: a.branchName,
            admission_date: a.admissionDate,
            created_at: a.createdAt,
            payment_status: a.payment_status || (a as any).paymentStatus || 'completed',
          }));
          source = 'cache';
        }
      } catch (e) {
        console.warn('[DashboardStats] Fallback cache read error:', e);
      }
    }

    setRawRecords(admissionsData);
    setDataSource(source);
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setLoading(false);
  };

  useEffect(() => {
    fetchLast30DaysAdmissions();
  }, []);

  // Aggregated Course Stats for the last 30 days
  const { courseStats, total30Days, topCourse, activeCoursesCount, dailyStats } = useMemo(() => {
    const courseMap: Record<string, { count: number; title: string; duration?: string; students: string[] }> = {};

    // Initialize all standard courses from COURSES_DATA so they appear on the graph
    COURSES_DATA.forEach((c) => {
      courseMap[c.code] = {
        count: 0,
        title: c.shortTitle || c.title,
        duration: c.duration,
        students: [],
      };
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(new Date().getDate() - 30);
    const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

    let total = 0;

    // Daily distribution map for last 30 days
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    rawRecords.forEach((record) => {
      // Date verification
      const recordDateStr = record.admission_date || record.created_at || record.registration_date;
      if (recordDateStr) {
        const rDate = new Date(recordDateStr);
        if (!isNaN(rDate.getTime()) && rDate.getTime() >= thirtyDaysAgoTime) {
          const dateKey = rDate.toISOString().split('T')[0];
          if (dayMap[dateKey] !== undefined) {
            dayMap[dateKey] += 1;
          }
        }
      }

      // Course normalization
      const rawCourse = (record.course || record.course_code || 'Other').trim();
      let matchedCode = rawCourse;

      // Try matching with known courses
      const foundCourse = COURSES_DATA.find(
        (c) =>
          c.code.toUpperCase() === rawCourse.toUpperCase() ||
          c.title.toLowerCase().includes(rawCourse.toLowerCase()) ||
          rawCourse.toLowerCase().includes(c.code.toLowerCase())
      );

      if (foundCourse) {
        matchedCode = foundCourse.code;
      }

      if (!courseMap[matchedCode]) {
        courseMap[matchedCode] = {
          count: 0,
          title: rawCourse,
          duration: 'Standard Program',
          students: [],
        };
      }

      courseMap[matchedCode].count += 1;
      total += 1;
      if (record.student_name && courseMap[matchedCode].students.length < 5) {
        courseMap[matchedCode].students.push(record.student_name);
      }
    });

    // Transform into sorted array
    const stats: CourseStatItem[] = Object.entries(courseMap)
      .map(([code, item]) => ({
        courseCode: code,
        courseTitle: item.title,
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
        duration: item.duration,
        recentStudents: item.students,
      }))
      .sort((a, b) => b.count - a.count || a.courseCode.localeCompare(b.courseCode));

    const top = stats.length > 0 && stats[0].count > 0 ? stats[0] : null;
    const activeCount = stats.filter((s) => s.count > 0).length;

    // Daily stats sorted chronologically
    const daily: DayAdmissionStat[] = Object.entries(dayMap).map(([dateStr, count]) => {
      const dt = new Date(dateStr);
      const displayDate = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: dateStr,
        displayDate,
        count,
      };
    });

    return {
      courseStats: stats,
      total30Days: total,
      topCourse: top,
      activeCoursesCount: activeCount,
      dailyStats: daily,
    };
  }, [rawRecords]);

  // =========================================================================
  // D3 BAR CHART RENDER (Admissions by Course)
  // =========================================================================
  useEffect(() => {
    if (!barChartRef.current || activeView !== 'bars') return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = Math.max(containerWidth, 340);
    const height = 300;
    const margin = { top: 35, right: 25, bottom: 60, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create defs for bar gradient
    const defs = svg.append('defs');

    // Primary bar gradient
    const primaryGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    primaryGrad.append('stop').attr('offset', '0%').attr('stop-color', '#316bf3');
    primaryGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0051d5');

    // Highlighted bar gradient
    const highlightGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-highlight-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    highlightGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ff9800');
    highlightGrad.append('stop').attr('offset', '100%').attr('stop-color', '#e65100');

    // Filter courses: show top courses or all if 10 or fewer
    const displayData = courseStats.slice(0, 10);

    // X Scale
    const x = d3
      .scaleBand()
      .domain(displayData.map((d) => d.courseCode))
      .range([0, innerWidth])
      .padding(0.32);

    // Y Scale (nice domain with min 5 for clear presentation)
    const maxVal = d3.max(displayData, (d) => d.count) || 0;
    const yMax = Math.max(maxVal + 2, 5);
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Subtle horizontal gridlines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(
        d3
          .axisLeft(y)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
          .ticks(5)
      )
      .call((gBox) => gBox.select('.domain').remove())
      .call((gBox) =>
        gBox.selectAll('.tick line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,3')
      );

    // X Axis
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call((gBox) => gBox.select('.domain').attr('stroke', '#cbd5e1'));

    xAxisGroup
      .selectAll('text')
      .attr('fill', '#1e293b')
      .attr('font-size', width < 500 ? '10px' : '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('transform', width < 480 ? 'rotate(-30)' : 'rotate(0)')
      .style('text-anchor', width < 480 ? 'end' : 'middle');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
      .call((gBox) => gBox.select('.domain').remove())
      .call((gBox) =>
        gBox
          .selectAll('text')
          .attr('fill', '#64748b')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
      );

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -32)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text('New Admissions');

    // Bars
    const bars = g
      .selectAll('.d3-bar')
      .data(displayData)
      .enter()
      .append('rect')
      .attr('class', 'd3-bar')
      .attr('x', (d) => x(d.courseCode) || 0)
      .attr('width', x.bandwidth())
      .attr('y', innerHeight) // Initial for animation
      .attr('height', 0)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => {
        if (selectedCourseHighlight === d.courseCode) return 'url(#d3-bar-highlight-gradient)';
        return d.count > 0 ? 'url(#d3-bar-gradient)' : '#e2e8f0';
      })
      .attr('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.85)
          .attr('stroke', '#00163d')
          .attr('stroke-width', 2);
        setHoveredItem(d);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke', 'none');
        setHoveredItem(null);
      })
      .on('click', (_, d) => {
        setSelectedCourseHighlight((prev) => (prev === d.courseCode ? null : d.courseCode));
        if (onCourseClick) onCourseClick(d.courseCode);
      });

    // Smooth Entrance Transition for Bars
    bars
      .transition()
      .duration(700)
      .delay((_, i) => i * 45)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => y(d.count))
      .attr('height', (d) => innerHeight - y(d.count));

    // Value Labels on top of bars
    g.selectAll('.d3-bar-label')
      .data(displayData)
      .enter()
      .append('text')
      .attr('class', 'd3-bar-label')
      .attr('x', (d) => (x(d.courseCode) || 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.count) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.count > 0 ? '#00163d' : '#94a3b8'))
      .attr('font-size', '11px')
      .attr('font-weight', '800')
      .attr('opacity', 0)
      .text((d) => (d.count > 0 ? d.count : '0'))
      .transition()
      .duration(700)
      .delay((_, i) => i * 45 + 300)
      .attr('opacity', 1);

  }, [courseStats, containerWidth, activeView, selectedCourseHighlight, onCourseClick]);

  // =========================================================================
  // D3 DAILY TREND CHART RENDER (30 Days Timeline Area)
  // =========================================================================
  useEffect(() => {
    if (!trendChartRef.current || activeView !== 'trend') return;

    const svg = d3.select(trendChartRef.current);
    svg.selectAll('*').remove();

    const width = Math.max(containerWidth, 340);
    const height = 300;
    const margin = { top: 35, right: 25, bottom: 50, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#316bf3').attr('stop-opacity', 0.45);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#316bf3').attr('stop-opacity', 0.0);

    const x = d3
      .scalePoint()
      .domain(dailyStats.map((d) => d.date))
      .range([0, innerWidth]);

    const maxCount = d3.max(dailyStats, (d) => d.count) || 0;
    const y = d3.scaleLinear().domain([0, Math.max(maxCount + 2, 4)]).nice().range([innerHeight, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(
        d3
          .axisLeft(y)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
          .ticks(5)
      )
      .call((gBox) => gBox.select('.domain').remove())
      .call((gBox) =>
        gBox.selectAll('.tick line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,3')
      );

    // Area Generator
    const area = d3
      .area<DayAdmissionStat>()
      .x((d) => x(d.date) || 0)
      .y0(innerHeight)
      .y1((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    // Line Generator
    const line = d3
      .line<DayAdmissionStat>()
      .x((d) => x(d.date) || 0)
      .y((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    // Draw Area
    g.append('path')
      .datum(dailyStats)
      .attr('fill', 'url(#d3-area-gradient)')
      .attr('d', area);

    // Draw Line
    const path = g
      .append('path')
      .datum(dailyStats)
      .attr('fill', 'none')
      .attr('stroke', '#0051d5')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Path stroke animation
    const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 1000;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Interactive Dots
    g.selectAll('.trend-dot')
      .data(dailyStats)
      .enter()
      .append('circle')
      .attr('class', 'trend-dot')
      .attr('cx', (d) => x(d.date) || 0)
      .attr('cy', (d) => y(d.count))
      .attr('r', (d) => (d.count > 0 ? 4 : 2))
      .attr('fill', (d) => (d.count > 0 ? '#00163d' : '#94a3b8'))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .on('mouseenter', function (_, d) {
        d3.select(this).transition().duration(150).attr('r', 7).attr('fill', '#ff9800');
        setHoveredDay(d);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d.count > 0 ? 4 : 2)
          .attr('fill', d.count > 0 ? '#00163d' : '#94a3b8');
        setHoveredDay(null);
      });

    // X Axis with subsampled ticks for clarity
    const tickStep = width < 500 ? 5 : 3;
    const tickValues = dailyStats
      .filter((_, idx) => idx % tickStep === 0 || idx === dailyStats.length - 1)
      .map((d) => d.date);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(tickValues)
          .tickFormat((d) => {
            const dt = new Date(d);
            return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          })
      )
      .call((gBox) => gBox.select('.domain').attr('stroke', '#cbd5e1'))
      .call((gBox) =>
        gBox
          .selectAll('text')
          .attr('fill', '#475569')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
      );

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
      .call((gBox) => gBox.select('.domain').remove())
      .call((gBox) =>
        gBox
          .selectAll('text')
          .attr('fill', '#64748b')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
      );

  }, [dailyStats, containerWidth, activeView]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl bg-white border border-[#dee8ff] shadow-sm p-4 sm:p-5 flex flex-col gap-4 ${className}`}
    >
      {/* Component Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00163d] to-[#0051d5] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[22px]">bar_chart</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline text-base sm:text-lg font-bold text-[#00163d]">
                Admissions by Course
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0051d5] border border-blue-200">
                Last 30 Days
              </span>
            </div>
            <p className="text-xs text-[#64748b]">
              Interactive D3 visualization querying <code className="font-mono text-[#0051d5] font-semibold">public.admissions</code> via Supabase
            </p>
          </div>
        </div>

        {/* Action Controls & Source Indicator */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Data Source Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              dataSource === 'supabase'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
            title={
              dataSource === 'supabase'
                ? 'Connected directly to Supabase central PostgreSQL database'
                : 'Cached or local fallback mode'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dataSource === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{dataSource === 'supabase' ? 'Supabase Live' : 'Local Synced'}</span>
          </span>

          {/* View Toggle */}
          <div className="inline-flex rounded-xl bg-[#f1f5f9] p-0.5 border border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setActiveView('bars')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeView === 'bars'
                  ? 'bg-white text-[#00163d] shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">equalizer</span>
              <span>Course Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('trend')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeView === 'trend'
                  ? 'bg-white text-[#00163d] shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">show_chart</span>
              <span>30-Day Trend</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchLast30DaysAdmissions}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#475569] hover:text-[#0051d5] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh 30-Day Admissions from Supabase"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                loading ? 'animate-spin text-[#0051d5]' : ''
              }`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
            30-Day Total
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#00163d] font-headline">{total30Days}</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
              Admissions
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
            Top Course
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-[#0051d5] truncate">
              {topCourse ? topCourse.courseCode : '—'}
            </span>
            <span className="text-[11px] text-[#475569] font-semibold">
              {topCourse ? `${topCourse.count} (${topCourse.percentage}%)` : '0%'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
            Active Courses
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#00163d] font-headline">
              {activeCoursesCount}
            </span>
            <span className="text-[10px] text-[#64748b]">
              of {courseStats.length} programs
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
            Daily Average
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#00163d] font-headline">
              {(total30Days / 30).toFixed(1)}
            </span>
            <span className="text-[10px] text-[#64748b]">students / day</span>
          </div>
        </div>
      </div>

      {/* Main D3 Chart Canvas */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#fafcff] to-white rounded-xl border border-[#e2e8f0] p-2">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-[#0051d5] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-[#00163d]">
                Querying Supabase admissions table...
              </span>
            </div>
          </div>
        )}

        {/* Bar Chart Container */}
        {activeView === 'bars' && (
          <div className="w-full">
            <svg
              ref={barChartRef}
              className="w-full h-[300px] select-none"
              style={{ overflow: 'visible' }}
            />
          </div>
        )}

        {/* 30-Day Trend Container */}
        {activeView === 'trend' && (
          <div className="w-full">
            <svg
              ref={trendChartRef}
              className="w-full h-[300px] select-none"
              style={{ overflow: 'visible' }}
            />
          </div>
        )}

        {/* Hover Tooltip Overlay (Bar View) */}
        {hoveredItem && activeView === 'bars' && (
          <div className="absolute top-3 right-3 pointer-events-none bg-[#00163d] text-white p-3 rounded-xl shadow-xl border border-[#316bf3]/30 text-xs flex flex-col gap-1 min-w-[200px] animate-in fade-in duration-150 z-10">
            <div className="flex items-center justify-between border-b border-white/15 pb-1">
              <strong className="font-bold text-white text-sm">{hoveredItem.courseCode}</strong>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                {hoveredItem.duration || '6 Months'}
              </span>
            </div>
            <p className="text-[11px] text-[#d8e3fb] truncate">{hoveredItem.courseTitle}</p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[#94a3b8]">New Admissions:</span>
              <span className="font-black text-amber-400 text-sm">{hoveredItem.count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94a3b8]">Share of 30-Day Total:</span>
              <span className="font-bold text-white">{hoveredItem.percentage}%</span>
            </div>
            {hoveredItem.recentStudents.length > 0 && (
              <div className="mt-1 pt-1 border-t border-white/10 text-[10px] text-[#cbd5e1]">
                <span className="block text-[#94a3b8] font-semibold mb-0.5">Recent Candidates:</span>
                <span className="truncate block font-medium">
                  {hoveredItem.recentStudents.slice(0, 3).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Hover Tooltip Overlay (Trend View) */}
        {hoveredDay && activeView === 'trend' && (
          <div className="absolute top-3 right-3 pointer-events-none bg-[#00163d] text-white p-2.5 rounded-xl shadow-xl border border-[#316bf3]/30 text-xs flex flex-col gap-1 min-w-[170px] animate-in fade-in duration-150 z-10">
            <span className="text-[11px] text-[#94a3b8] font-bold">{hoveredDay.displayDate}</span>
            <div className="flex items-center justify-between">
              <span className="text-[#d8e3fb]">New Admissions:</span>
              <strong className="text-amber-400 text-sm font-black">{hoveredDay.count}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Course Pills / Interactive Legend */}
      <div className="flex flex-col gap-2 pt-1 border-t border-[#f1f5f9]">
        <div className="flex items-center justify-between text-xs text-[#64748b]">
          <span className="font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#0051d5]">touch_app</span>
            <span>Click any course to highlight on chart:</span>
          </span>
          <span className="text-[11px]">Updated {lastUpdated || 'just now'}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {courseStats.slice(0, 8).map((item) => {
            const isSelected = selectedCourseHighlight === item.courseCode;
            return (
              <button
                key={item.courseCode}
                type="button"
                onClick={() => {
                  setSelectedCourseHighlight((prev) =>
                    prev === item.courseCode ? null : item.courseCode
                  );
                  if (onCourseClick) onCourseClick(item.courseCode);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#00163d] text-white border-[#00163d] shadow-xs'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:border-[#0051d5] hover:bg-[#f8fafc]'
                }`}
              >
                <span className="font-mono font-bold">{item.courseCode}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isSelected
                      ? 'bg-amber-400 text-[#00163d]'
                      : item.count > 0
                      ? 'bg-blue-100 text-[#0051d5]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
