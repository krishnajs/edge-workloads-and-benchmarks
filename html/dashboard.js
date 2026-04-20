// SPDX-FileCopyrightText: (C) 2024 - 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

/**
 * Edge Workloads and Benchmarks Dashboard JavaScript
 * Handles data loading, chart rendering, and table population
 */

class PipelineDashboard {
  constructor() {
    this.summary = [];
    this.rawData = [];
    this.profiles = [];
    this.systemInfo = null;
    this.bestConfigMode = 'performance'; // 'performance' or 'efficiency'
    this.activeProfileIndex = 0;
    this.charts = {
      throughput: null,
      theoretical: null,
      efficiency: null,
      power: null,
      profileLatency: null,
      profileThroughput: null
    };
    
    // Chart color configuration
    this.colors = {
      GREEN: '#22c55e', // GPU/GPU
      BLUE: '#3b82f6',  // GPU/NPU Split
      GOLD: '#a7a406ff',  // GPU/NPU Concurrent
      PURPLE: '#a855f7', // NPU/NPU
      ORANGE: '#f97316', // CPU configurations
      GRAY: '#666'
    };
    
    this.init();
  }

  async init() {
    try {
      await this.loadData();
      await this.loadSystemInfo();
      this.updateDashboardTitle();
      this.setupToggleListeners();
      if (this.summary.length > 0) {
        this.renderTable();
        this.renderCharts();
      }
      this.renderSystemInfo();
      this.renderRawData();
      if (this.profiles.length > 0) {
        this.renderProfiles();
      }
    } catch (error) {
      this.showError('Failed to initialize dashboard: ' + error.message);
    }
  }

  setupToggleListeners() {
    const performanceBtn = document.getElementById('togglePerformance');
    const efficiencyBtn = document.getElementById('toggleEfficiency');
    
    if (performanceBtn && efficiencyBtn) {
      performanceBtn.addEventListener('click', () => {
        this.bestConfigMode = 'performance';
        performanceBtn.classList.add('active');
        efficiencyBtn.classList.remove('active');
        this.updateBestConfigDisplay();
      });
      
      efficiencyBtn.addEventListener('click', () => {
        this.bestConfigMode = 'efficiency';
        efficiencyBtn.classList.add('active');
        performanceBtn.classList.remove('active');
        this.updateBestConfigDisplay();
      });
    }
  }

  async loadData() {
    try {
      // Try to load from data.json first, fallback to embedded data
      const response = await fetch('data.json');
      if (response.ok) {
        const data = await response.json();
        this.summary = data.summary || [];
        this.rawData = data.raw || [];
        this.profiles = data.profiles || [];
      } else {
        // Fallback to embedded data if available
        if (typeof SUMMARY !== 'undefined' && typeof RAW !== 'undefined') {
          this.summary = SUMMARY;
          this.rawData = RAW;
        } else {
          throw new Error('No data available');
        }
      }
      
      if (this.summary.length === 0 && this.profiles.length === 0) {
        throw new Error('No benchmark data found');
      }
    } catch (error) {
      throw new Error(`Data loading failed: ${error.message}`);
    }
  }

  async loadSystemInfo() {
    try {
      const response = await fetch('system_info.json');
      if (response.ok) {
        this.systemInfo = await response.json();
      } else {
        console.warn('system_info.json not found - system information will not be displayed');
      }
    } catch (error) {
      console.warn('Failed to load system info:', error.message);
    }
  }

  updateDashboardTitle() {
    const titleElement = document.getElementById('dashboardTitle');
    if (titleElement && this.systemInfo && this.systemInfo.system && this.systemInfo.system.name) {
      titleElement.textContent = `Edge Workloads and Benchmarks Pipeline Dashboard — ${this.systemInfo.system.name}`;
    }
  }

  showError(message) {
    const container = document.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
    container.insertBefore(errorDiv, container.firstChild);
  }

  renderTable() {
    const tbody = document.getElementById('summaryRows');
    if (!tbody) return;

    // Find best configuration for each type
    const bestConfigs = this.getBestConfigurations();

    const rows = this.summary.map(record => {
      const fps = record.avg_throughput 
        ? `<span class="status-success">${parseFloat(record.avg_throughput).toFixed(2)}</span>`
        : '<span class="status-error">Failed</span>';
      
      const streams = record.theoretical_streams 
        ? `<span class="status-success">${record.theoretical_streams}</span>`
        : '<span class="status-error">N/A</span>';
      
      const power = record.avg_power && record.avg_power !== 'NA'
        ? `${parseFloat(record.avg_power).toFixed(2)}`
        : 'N/A';
      
      const efficiency = record.efficiency && record.efficiency !== 'NA'
        ? `${parseFloat(record.efficiency).toFixed(2)}`
        : 'N/A';

      const configName = record.config.charAt(0).toUpperCase() + record.config.slice(1).toLowerCase();
      const isBest = bestConfigs[record.config] === record;
      const configCell = isBest 
        ? `<span class="pill best-config">${configName}</span>`
        : `<span class="pill">${configName}</span>`;

      // Use device_config if available, otherwise fall back to detect/classify
      const deviceConfig = record.device_config || `${record.detect}/${record.classify}`;

      return `
        <tr${isBest ? ' class="best-row"' : ''}>
          <td>${configCell}</td>
          <td>${deviceConfig}</td>
          <td>${record.batch}</td>
          <td>${record.runs}</td>
          <td>${fps}</td>
          <td>${streams}</td>
          <td>${power}</td>
          <td>${efficiency}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;
    this.renderBestConfigSummary(bestConfigs);
  }

  getBestConfigurations(mode = 'performance') {
    const configGroups = {
      light: [],
      medium: [],
      heavy: []
    };

    // Group records by config type
    this.summary.forEach(record => {
      if (configGroups[record.config]) {
        configGroups[record.config].push(record);
      }
    });

    // Find best performer in each group
    const bestConfigs = {};
    Object.keys(configGroups).forEach(configType => {
      const records = configGroups[configType];
      if (records.length > 0) {
        bestConfigs[configType] = records.reduce((best, current) => {
          if (mode === 'efficiency') {
            // Best efficiency (FPS/W)
            const bestEff = best.efficiency || 0;
            const currentEff = current.efficiency || 0;
            return currentEff > bestEff ? current : best;
          } else {
            // Best performance (FPS)
            const bestThroughput = best.avg_throughput || 0;
            const currentThroughput = current.avg_throughput || 0;
            return currentThroughput > bestThroughput ? current : best;
          }
        });
      }
    });

    return bestConfigs;
  }

  renderBestConfigSummary(bestConfigs) {
    const contentContainer = document.getElementById('bestConfigContent');
    if (!contentContainer) return;

    const mode = this.bestConfigMode;
    const summaryItems = Object.entries(bestConfigs).map(([configType, record]) => {
      const configName = configType.charAt(0).toUpperCase() + configType.slice(1).toLowerCase();
      const deviceConfig = record.device_config || `${record.detect}/${record.classify}`;
      
      if (mode === 'efficiency') {
        if (!record.efficiency || record.efficiency === 'NA') return '';
        return `
          <div class="best-config-item efficiency-mode">
            <div class="best-config-header">${configName} - Best Efficiency</div>
            <div class="best-config-details">
              ${deviceConfig} Batch ${record.batch}: 
              <strong>${parseFloat(record.efficiency).toFixed(2)} FPS/W</strong> 
              (${parseFloat(record.avg_throughput).toFixed(2)} FPS @ ${parseFloat(record.avg_power).toFixed(2)} W)
            </div>
          </div>
        `;
      } else {
        if (!record.avg_throughput) return '';
        return `
          <div class="best-config-item">
            <div class="best-config-header">${configName} - Best Performance</div>
            <div class="best-config-details">
              ${deviceConfig} Batch ${record.batch}: 
              <strong>${parseFloat(record.avg_throughput).toFixed(2)} FPS</strong> 
              (${record.theoretical_streams} streams)
            </div>
          </div>
        `;
      }
    }).filter(Boolean);

    if (summaryItems.length > 0) {
      contentContainer.innerHTML = summaryItems.join('');
      document.getElementById('bestConfigSummary').style.display = 'block';
    }
  }

  updateBestConfigDisplay() {
    const bestConfigs = this.getBestConfigurations(this.bestConfigMode);
    this.renderBestConfigSummary(bestConfigs);
  }

  computeGroups() {
    const groups = [];
    let current = null, start = 0;
    
    this.summary.forEach((record, i) => {
      if (record.config !== current) {
        if (current !== null) {
          groups.push({
            name: current,
            startIndex: start,
            endIndex: i - 1
          });
        }
        current = record.config;
        start = i;
      }
    });
    
    if (current !== null) {
      groups.push({
        name: current,
        startIndex: start,
        endIndex: this.summary.length - 1
      });
    }
    
    return groups;
  }

  computeGroupsForData(data) {
    const groups = [];
    let current = null, start = 0;
    
    data.forEach((record, i) => {
      if (record.config !== current) {
        if (current !== null) {
          groups.push({
            name: current,
            startIndex: start,
            endIndex: i - 1
          });
        }
        current = record.config;
        start = i;
      }
    });
    
    if (current !== null) {
      groups.push({
        name: current,
        startIndex: start,
        endIndex: data.length - 1
      });
    }
    
    return groups;
  }

  getColorForDevicePair(record) {
    // Use device_config for more precise color coding if available
    const deviceConfig = record.device_config || `${record.detect}-${record.classify}`;
    const batch = record.batch;
    const delta = batch === '1' ? 0.45 : batch === '8' ? -0.25 : 0;
    
    let baseColor;
    
    // Handle CPU configurations
    if (deviceConfig.includes('CPU')) {
      baseColor = this.colors.ORANGE;
    }
    // Handle GPU-Only configurations
    else if (deviceConfig.includes('GPU-Only') || deviceConfig === 'GPU-GPU') {
      baseColor = this.colors.GREEN;
    }
    // Handle NPU-Only configurations
    else if (deviceConfig.includes('NPU-Only') || deviceConfig === 'NPU-NPU') {
      baseColor = this.colors.PURPLE;
    }
    // Handle GPU-NPU combinations with mode differentiation
    else if (deviceConfig.includes('GPU-NPU') || deviceConfig.includes('NPU-GPU')) {
      if (deviceConfig.includes('Concurrent')) {
        baseColor = this.colors.GOLD;  // Golden yellow for concurrent
      } else {
        baseColor = this.colors.BLUE;  // Blue for split (default)
      }
    }
    // Fallback for any other configurations
    else {
      baseColor = this.colors.GRAY;
    }
    
    return this.shadeColor(baseColor, delta);
  }

  shadeColor(hex, delta) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    const adjust = (c) => {
      return Math.min(255, Math.max(0, Math.round(
        delta > 0 ? c + (255 - c) * delta : c * (1 + delta)
      )));
    };
    
    r = adjust(r);
    g = adjust(g);
    b = adjust(b);
    
    return '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  }

  createGroupLabelPlugin() {
    return {
      id: 'groupLabelPlugin',
      beforeDatasetsDraw: (chart, args, opts) => {
        const groups = opts.groups || [];
        if (!groups.length) return;
        
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;
        
        const ctx = chart.ctx;
        const area = chart.chartArea;
        ctx.save();
        
        groups.forEach((group, i) => {
          const slice = meta.data.slice(group.startIndex, group.endIndex + 1);
          if (!slice.length) return;
          
          const first = slice[0];
          const last = slice[slice.length - 1];
          const x1 = first.x - first.width / 2 - 4;
          const x2 = last.x + last.width / 2 + 4;
          
          ctx.fillStyle = i % 2 === 0 
            ? 'rgba(255,255,255,0.04)' 
            : 'rgba(255,255,255,0.02)';
          ctx.fillRect(x1, area.top, x2 - x1, area.bottom - area.top);
        });
        
        ctx.restore();
      },
      afterDatasetsDraw: (chart, args, opts) => {
        const groups = opts.groups || [];
        if (!groups.length) return;
        
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;
        
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ddd';
        ctx.font = '600 12px Inter, sans-serif';
        
        groups.forEach((group, i) => {
          const slice = meta.data.slice(group.startIndex, group.endIndex + 1);
          if (!slice.length) return;
          
          const first = slice[0];
          const last = slice[slice.length - 1];
          const xMid = (first.x + last.x) / 2;
          const topY = chart.chartArea.top - 14;
          
          ctx.fillText(group.name.charAt(0).toUpperCase() + group.name.slice(1).toLowerCase(), xMid, topY);
          
          // Underline
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(first.x - first.width / 2, chart.chartArea.top - 4);
          ctx.lineTo(last.x + last.width / 2, chart.chartArea.top - 4);
          ctx.stroke();
          
          // Right boundary separator
          if (i < groups.length - 1) {
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(last.x + last.width / 2 + 6, chart.chartArea.top);
            ctx.lineTo(last.x + last.width / 2 + 6, chart.chartArea.bottom);
            ctx.stroke();
          }
        });
        
        ctx.restore();
      }
    };
  }

  createValueLabelPlugin() {
    return {
      id: 'valueLabelPlugin',
      afterDatasetsDraw: (chart) => {
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;
        
        const dataset = chart.data.datasets[0];
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#eee';
        
        meta.data.forEach((bar, i) => {
          const value = dataset.data[i];
          if (value == null || isNaN(value)) return;
          const display = Math.round(value).toString();
          
          let y = bar.y - 4;
          if (y < chart.chartArea.top + 10) {
            y = chart.chartArea.top + 10;
          }
          
          ctx.fillText(display, bar.x, y);
        });
        
        ctx.restore();
      }
    };
  }

  renderCharts() {
    // Filter out failed tests (null/undefined throughput or theoretical_streams)
    const validData = this.summary.filter(r => 
      r.avg_throughput != null && r.theoretical_streams != null
    );
    
    // Store validData for tooltip access
    this.validData = validData;
    
    if (validData.length === 0) {
      console.warn('No valid data for charts');
      return;
    }
    
    // Create simplified labels - just show batch since legend and tooltips show device info
    const labels = validData.map(r => `B${r.batch}`);
    
    const throughputData = validData.map(r => r.avg_throughput);
    const theoreticalData = validData.map(r => r.theoretical_streams);
    const efficiencyData = validData.map(r => 
      r.efficiency && r.efficiency !== 'NA' ? parseFloat(r.efficiency) : null
    );
    const powerData = validData.map(r => 
      r.avg_power && r.avg_power !== 'NA' ? parseFloat(r.avg_power) : null
    );
    
    // Recompute groups based on valid data only
    const groups = this.computeGroupsForData(validData);

    const backgroundColors = validData.map(r => 
      this.getColorForDevicePair(r)
    );

    const baseOptions = {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              const record = this.validData[idx];
              const deviceConfig = record.device_config || `${record.detect}/${record.classify}`;
              
              // Parse the device config to extract components for tooltip
              let devicePart = deviceConfig;
              let modePart = '';
              
              if (deviceConfig.includes('-Concurrent')) {
                devicePart = deviceConfig.replace('-Concurrent', '');
                modePart = ' (Concurrent)';
              } else if (deviceConfig.includes('-Split')) {
                devicePart = deviceConfig.replace('-Split', '');
                modePart = ' (Split)';
              } else if (deviceConfig.includes('-Only')) {
                devicePart = deviceConfig.replace('-Only', '');
                modePart = ' (Only)';
              }
              
              return `${record.config.charAt(0).toUpperCase() + record.config.slice(1).toLowerCase()} | ${devicePart}${modePart} Batch ${record.batch}`;
            }
          }
        },
        groupLabelPlugin: { groups }
      },
      layout: { padding: { top: 42 } },
      scales: {
        x: {
          ticks: { 
            color: '#eee', 
            autoSkip: false, 
            font: { size: 10 },
            maxRotation: 0,
            minRotation: 0
          },
          grid: { color: '#222' },
          title: {
            display: true,
            text: 'Device Configuration | Batch Size | Pipeline Config',
            color: '#eee',
            font: { size: 11, weight: 'bold' },
            padding: { top: 10 }
          }
        },
        y: {
          ticks: { color: '#eee' },
          grid: { color: '#222' },
          beginAtZero: true,
          grace: '10%',
          title: {
            display: true,
            color: '#eee',
            font: { size: 12, weight: 'bold' }
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };

    // Destroy existing charts
    if (this.charts.throughput) this.charts.throughput.destroy();
    if (this.charts.theoretical) this.charts.theoretical.destroy();
    if (this.charts.efficiency) this.charts.efficiency.destroy();
    if (this.charts.power) this.charts.power.destroy();

    // Create throughput chart
    const thrCtx = document.getElementById('thrChart');
    if (thrCtx) {
      const throughputOptions = { ...baseOptions };
      throughputOptions.scales.y.title.text = 'Frames per Second (FPS)';
      
      this.charts.throughput = new Chart(thrCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Total FPS',
            data: throughputData,
            backgroundColor: backgroundColors,
            borderColor: '#000',
            borderWidth: 0
          }]
        },
        options: throughputOptions,
        plugins: [this.createGroupLabelPlugin(), this.createValueLabelPlugin()]
      });
    }

    // Create efficiency chart
    const effCtx = document.getElementById('effChart');
    if (effCtx && efficiencyData.some(v => v != null)) {
      const efficiencyOptions = { ...baseOptions };
      efficiencyOptions.scales.y.title.text = 'FPS per Watt';
      
      this.charts.efficiency = new Chart(effCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Efficiency',
            data: efficiencyData,
            backgroundColor: backgroundColors,
            borderColor: '#000',
            borderWidth: 0
          }]
        },
        options: efficiencyOptions,
        plugins: [this.createGroupLabelPlugin(), this.createValueLabelPlugin()]
      });
    }

    // Create theoretical chart
    const theoCtx = document.getElementById('theoChart');
    if (theoCtx) {
      const theoreticalOptions = { ...baseOptions };
      theoreticalOptions.scales.y.title.text = 'Number of Streams';
      
      this.charts.theoretical = new Chart(theoCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Theoretical Streams',
            data: theoreticalData,
            backgroundColor: backgroundColors,
            borderColor: '#000',
            borderWidth: 0
          }]
        },
        options: theoreticalOptions,
        plugins: [this.createGroupLabelPlugin(), this.createValueLabelPlugin()]
      });
    }

    // Create power chart
    const powerCtx = document.getElementById('powerChart');
    if (powerCtx && powerData.some(v => v != null)) {
      const powerOptions = { ...baseOptions };
      powerOptions.scales.y.title.text = 'Package Power (W)';
      
      this.charts.power = new Chart(powerCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Package Power',
            data: powerData,
            backgroundColor: backgroundColors,
            borderColor: '#000',
            borderWidth: 0
          }]
        },
        options: powerOptions,
        plugins: [this.createGroupLabelPlugin(), this.createValueLabelPlugin()]
      });
    }

    this.renderLegends();
  }

  renderLegends() {
    // Get all unique device configurations from the data
    const deviceConfigs = new Set();
    const batchSizes = new Set();
    
    this.summary.forEach(record => {
      const deviceConfig = record.device_config || `${record.detect}-${record.classify}`;
      deviceConfigs.add(deviceConfig);
      batchSizes.add(record.batch);
    });
    
    // Define all possible legend items (ordered to match bar chart ordering)
    const allLegendItems = [
      { 
        key: 'gpu-npu-concurrent',
        label: 'GPU/NPU Concurrent', 
        style: `background:${this.colors.GOLD}`,
        condition: (configs) => Array.from(configs).some(config => 
          (config.includes('GPU-NPU') || config.includes('NPU-GPU')) && 
          config.includes('Concurrent'))
      },
      { 
        key: 'gpu-npu-split',
        label: 'GPU/NPU Split', 
        style: `background:${this.colors.BLUE}`,
        condition: (configs) => Array.from(configs).some(config => 
          (config.includes('GPU-NPU') || config.includes('NPU-GPU')) && 
          !config.includes('Concurrent'))
      },
      { 
        key: 'gpu-only',
        label: 'GPU-Only', 
        style: `background:${this.colors.GREEN}`,
        condition: (configs) => Array.from(configs).some(config => 
          config.includes('GPU-Only') || config === 'GPU-GPU')
      },
      { 
        key: 'npu-only',
        label: 'NPU-Only', 
        style: `background:${this.colors.PURPLE}`,
        condition: (configs) => Array.from(configs).some(config => 
          config.includes('NPU-Only') || config === 'NPU-NPU')
      },
      { 
        key: 'cpu-only',
        label: 'CPU-Only', 
        style: `background:${this.colors.ORANGE}`,
        condition: (configs) => Array.from(configs).some(config => 
          config.includes('CPU'))
      }
    ];
    
    // Filter legend items to only include those present in the data
    const activeLegendItems = allLegendItems.filter(item => 
      item.condition(deviceConfigs)
    );
    
    // Add line break before batch indicators
    const deviceItems = [...activeLegendItems];
    const batchItems = [];
    
    // Add batch size indicators only if multiple batch sizes exist
    if (batchSizes.size > 1) {
      if (batchSizes.has('1')) {
        batchItems.push({
          key: 'batch-1',
          label: 'Batch 1 (lighter)', 
          style: 'background:rgba(255,255,255,0.28);border:1px solid #444'
        });
      }
      if (batchSizes.has('8')) {
        batchItems.push({
          key: 'batch-8',
          label: 'Batch 8 (darker)', 
          style: 'background:rgba(0,0,0,0.4);border:1px solid #444'
        });
      }
    }

    const createLegendHTML = (items, batchItems) => {
      let html = items.map(item => `
        <span class="legend-item">
          <span class="legend-color" style="${item.style}"></span>
          ${item.label}
        </span>
      `).join('');
      
      // Add line break if we have batch items
      if (batchItems.length > 0) {
        html += '<span class="legend-item legend-break"></span>';
        html += batchItems.map(item => `
          <span class="legend-item">
            <span class="legend-color" style="${item.style}"></span>
            ${item.label}
          </span>
        `).join('');
      }
      
      return html;
    };

    const throughputLegend = document.getElementById('legendThroughput');
    const efficiencyLegend = document.getElementById('legendEfficiency');
    const theoreticalLegend = document.getElementById('legendTheoretical');
    const powerLegend = document.getElementById('legendPower');

    const legendHTML = createLegendHTML(deviceItems, batchItems);
    if (throughputLegend) throughputLegend.innerHTML = legendHTML;
    if (efficiencyLegend) efficiencyLegend.innerHTML = legendHTML;
    if (theoreticalLegend) theoreticalLegend.innerHTML = legendHTML;
    if (powerLegend) powerLegend.innerHTML = legendHTML;
  }

  renderRawData() {
    const rawDump = document.getElementById('rawDump');
    if (rawDump && this.rawData.length > 0) {
      rawDump.textContent = JSON.stringify(this.rawData, null, 2);
    }
  }

  // ── Profile Benchmark Rendering ──────────────────────────────────────

  renderProfiles() {
    const section = document.getElementById('profileSection');
    if (!section) return;
    section.style.display = 'block';

    this.renderProfileSelector();
    this.renderActiveProfile();
  }

  renderProfileSelector() {
    const container = document.getElementById('profileSelector');
    if (!container) return;

    const buttons = this.profiles.map((p, i) => {
      const active = i === this.activeProfileIndex ? ' active' : '';
      return `<button class="profile-btn${active}" data-profile-index="${i}">${p.profile}</button>`;
    }).join('');
    container.innerHTML = buttons;

    container.querySelectorAll('.profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeProfileIndex = parseInt(btn.dataset.profileIndex, 10);
        container.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderActiveProfile();
      });
    });
  }

  renderActiveProfile() {
    const profile = this.profiles[this.activeProfileIndex];
    if (!profile) return;

    this.renderProfileStats(profile);
    this.renderProfileTable(profile);
    this.renderProfileCharts(profile);
  }

  renderProfileStats(profile) {
    const statsEl = document.getElementById('profileStats');
    const descEl = document.getElementById('profileDescription');
    if (!statsEl) return;

    const total = profile.total_benchmarks || 0;
    const passed = profile.passed || 0;
    const failed = profile.failed || 0;
    const devices = (profile.devices || []).join(', ') || 'N/A';

    statsEl.innerHTML = `
      <div class="profile-stat">
        <span class="profile-stat-value">${total}</span>
        <span class="profile-stat-label">Benchmarks</span>
      </div>
      <div class="profile-stat profile-stat-pass">
        <span class="profile-stat-value">${passed}</span>
        <span class="profile-stat-label">Passed</span>
      </div>
      <div class="profile-stat profile-stat-fail">
        <span class="profile-stat-value">${failed}</span>
        <span class="profile-stat-label">Failed</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat-value">${devices}</span>
        <span class="profile-stat-label">Device(s)</span>
      </div>
    `;

    if (descEl) {
      descEl.textContent = '';
    }
  }

  renderProfileTable(profile) {
    const tbody = document.getElementById('profileRows');
    if (!tbody) return;

    const rows = (profile.benchmarks || []).map(b => {
      const latency = b.latency_median_ms != null ? `${parseFloat(b.latency_median_ms).toFixed(2)}` : 'N/A';
      const targetLat = b.target_latency_ms != null ? `≤ ${b.target_latency_ms}` : '—';
      const fps = b.throughput_fps != null ? `${parseFloat(b.throughput_fps).toFixed(2)}` : 'N/A';
      const targetFps = b.target_fps != null ? `≥ ${b.target_fps}` : '—';

      const lp = b.latency_pass || '';
      const fp = b.throughput_pass || '';
      let result;
      if (lp === 'FAIL' || fp === 'FAIL') {
        result = '<span class="status-error">FAIL</span>';
      } else if (lp === 'PASS' || fp === 'PASS') {
        result = '<span class="status-success">PASS</span>';
      } else {
        result = '<span class="status-warning">—</span>';
      }

      const latClass = lp === 'PASS' ? 'status-success' : lp === 'FAIL' ? 'status-error' : '';
      const fpsClass = fp === 'PASS' ? 'status-success' : fp === 'FAIL' ? 'status-error' : '';

      return `<tr>
        <td>${b.benchmark || ''}</td>
        <td><code>${b.model || ''}</code></td>
        <td>${b.device || ''}</td>
        <td>${b.precision || ''}</td>
        <td class="${latClass}">${latency}</td>
        <td>${targetLat}</td>
        <td class="${fpsClass}">${fps}</td>
        <td>${targetFps}</td>
        <td>${result}</td>
        <td class="rationale-cell">${b.rationale || ''}</td>
      </tr>`;
    }).join('');

    tbody.innerHTML = rows;
  }

  renderProfileCharts(profile) {
    const benchmarks = (profile.benchmarks || []).filter(b => b.model);
    if (!benchmarks.length) return;

    const labels = benchmarks.map(b => b.benchmark || b.model);

    // ── Latency chart ──
    const latencyActual = benchmarks.map(b => b.latency_median_ms);
    const latencyTarget = benchmarks.map(b => b.target_latency_ms);

    if (this.charts.profileLatency) this.charts.profileLatency.destroy();
    const latCtx = document.getElementById('profileLatencyChart');
    if (latCtx) {
      this.charts.profileLatency = new Chart(latCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Median Latency (ms)',
              data: latencyActual,
              backgroundColor: benchmarks.map(b =>
                b.latency_pass === 'PASS' ? '#22c55e' : b.latency_pass === 'FAIL' ? '#ef4444' : '#6b7280'
              ),
              borderWidth: 0,
              order: 2
            },
            {
              label: 'Target Latency (ms)',
              data: latencyTarget,
              type: 'line',
              borderColor: '#fbbf24',
              borderDash: [6, 4],
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: '#fbbf24',
              fill: false,
              order: 1
            }
          ]
        },
        options: this.profileChartOptions('Latency (ms)')
      });
    }

    // ── Throughput chart ──
    const fpsActual = benchmarks.map(b => b.throughput_fps);
    const fpsTarget = benchmarks.map(b => b.target_fps);

    if (this.charts.profileThroughput) this.charts.profileThroughput.destroy();
    const fpsCtx = document.getElementById('profileThroughputChart');
    if (fpsCtx) {
      this.charts.profileThroughput = new Chart(fpsCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Throughput (FPS)',
              data: fpsActual,
              backgroundColor: benchmarks.map(b =>
                b.throughput_pass === 'PASS' ? '#22c55e' : b.throughput_pass === 'FAIL' ? '#ef4444' : '#6b7280'
              ),
              borderWidth: 0,
              order: 2
            },
            {
              label: 'Target FPS',
              data: fpsTarget,
              type: 'line',
              borderColor: '#fbbf24',
              borderDash: [6, 4],
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: '#fbbf24',
              fill: false,
              order: 1
            }
          ]
        },
        options: this.profileChartOptions('Throughput (FPS)')
      });
    }
  }

  profileChartOptions(yTitle) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#eee', font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(2) : 'N/A'}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#eee', font: { size: 10 }, maxRotation: 45, minRotation: 0 },
          grid: { color: '#222' }
        },
        y: {
          ticks: { color: '#eee' },
          grid: { color: '#222' },
          beginAtZero: true,
          grace: '10%',
          title: { display: true, text: yTitle, color: '#eee', font: { size: 12, weight: 'bold' } }
        }
      }
    };
  }

  renderSystemInfo() {
    const systemInfoDump = document.getElementById('systemInfoDump');
    if (systemInfoDump) {
      if (this.systemInfo) {
        systemInfoDump.textContent = JSON.stringify(this.systemInfo, null, 2);
      } else {
        systemInfoDump.textContent = 'System information not available. Run "make html-report" to generate.';
      }
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PipelineDashboard();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PipelineDashboard;
}
