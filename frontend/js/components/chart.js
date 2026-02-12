/**
 * Chart.js wrapper — helper functions with CRT phosphor theming.
 */

import { CHART_COLORS } from '../utils/constants.js';

// Get computed CSS variable value
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Common chart defaults
function getDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        labels: {
          color: getCSSVar('--text-secondary') || '#B8B6C8',
          font: { family: "'Inter', sans-serif", size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: getCSSVar('--bg-elevated') || '#232340',
        titleColor: getCSSVar('--text-primary') || '#E8E6F0',
        bodyColor: getCSSVar('--text-secondary') || '#B8B6C8',
        borderColor: getCSSVar('--color-static') || '#3D3D5C',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { family: "'Inter', sans-serif", weight: 600 },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 13 },
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(62, 62, 92, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: getCSSVar('--text-tertiary') || '#7A7890',
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
      y: {
        grid: {
          color: 'rgba(62, 62, 92, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: getCSSVar('--text-tertiary') || '#7A7890',
          font: { family: "'JetBrains Mono', monospace", size: 11 },
        },
      },
    },
  };
}

export function createLineChart(canvas, { labels, datasets, options = {} }) {
  const defaults = getDefaults();
  const chartDatasets = datasets.map((ds, i) => ({
    borderColor: ds.color || CHART_COLORS[i % CHART_COLORS.length],
    backgroundColor: (ds.color || CHART_COLORS[i % CHART_COLORS.length]) + '20',
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: ds.color || CHART_COLORS[i % CHART_COLORS.length],
    tension: 0.3,
    fill: ds.fill ?? false,
    ...ds,
  }));

  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: chartDatasets },
    options: {
      ...defaults,
      ...options,
      interaction: { mode: 'index', intersect: false },
    },
  });
}

export function createBarChart(canvas, { labels, datasets, options = {} }) {
  const defaults = getDefaults();
  const chartDatasets = datasets.map((ds, i) => ({
    backgroundColor: ds.color || CHART_COLORS[i % CHART_COLORS.length],
    borderRadius: 4,
    borderSkipped: false,
    ...ds,
  }));

  return new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: chartDatasets },
    options: { ...defaults, ...options },
  });
}

export function createDoughnutChart(canvas, { labels, data, colors, options = {} }) {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || CHART_COLORS.slice(0, data.length),
        borderWidth: 0,
        spacing: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: getDefaults().plugins.tooltip,
      },
      ...options,
    },
  });
}

export function createGauge(canvas, { value = 0, max = 100, color }) {
  const fillColor = color || (value >= 70 ? '#2AD40E' : value >= 40 ? '#FFB627' : '#E0392A');

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, max - value],
        backgroundColor: [fillColor, 'rgba(62, 62, 92, 0.3)'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      circumference: 180,
      rotation: 270,
      cutout: '80%',
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

export function createSparkline(canvas, { data, color, height = 40 }) {
  canvas.style.height = height + 'px';
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: color || CHART_COLORS[0],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    },
  });
}
