/**
 * 小日常 PWA - UI 渲染、交互与动画
 */

import { Storage } from './storage.js';
import { AppCore } from './app.js';

// 全局状态
let selectedDate = new Date(); // 当前选中的日期
let activeTab = 'today';       // 当前处于的 Tab 页: today, stats, habits, settings
let confettiParticles = [];    // 纸屑粒子缓存
let confettiAnimationId = null; // 纸屑动画 ID
let audioCtx = null;           // AudioContext 单例

export const UI = {
  init() {
    // 1. 初始化存储
    Storage.init();
    
    // 2. 绑定核心 DOM 事件
    this.bindTabEvents();
    this.bindHabitModalEvents();
    this.bindSettingsEvents();
    
    // 3. 初始页面渲染
    this.render();
    
    // 4. 监听系统主题变化
    this.applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.applyTheme();
    });

    // 5. 初始化粒子画布大小
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    }
  },

  /**
   * 触发重新渲染当前活动 Tab 的内容
   */
  render() {
    this.applyTheme();
    
    if (activeTab === 'today') {
      this.renderTodayTab();
    } else if (activeTab === 'stats') {
      this.renderStatsTab();
    } else if (activeTab === 'settings') {
      this.renderSettingsTab();
    }
  },

  /**
   * 主题管理
   */
  applyTheme() {
    const settings = Storage.getSettings();
    const htmlEl = document.documentElement;
    
    if (settings.theme === 'dark') {
      htmlEl.classList.add('dark');
    } else if (settings.theme === 'light') {
      htmlEl.classList.remove('dark');
    } else {
      // 自动模式
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        htmlEl.classList.add('dark');
      } else {
        htmlEl.classList.remove('dark');
      }
    }
  },

  /**
   * 绑定底部 Tab 栏事件
   */
  bindTabEvents() {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = tab.getAttribute('data-tab');
        if (targetTab === activeTab) return;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 切换可见面板
        document.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        document.getElementById(`panel-${targetTab}`).classList.add('active');

        activeTab = targetTab;
        this.render();
      });
    });
  },

  /**
   * 今日打卡页 - 渲染
   */
  renderTodayTab() {
    const panel = document.getElementById('panel-today');
    
    // 1. 渲染顶部周历
    this.renderWeekCalendar();

    // 2. 渲染打卡进度卡片
    const progress = AppCore.getTodayProgress();
    const progressText = panel.querySelector('.progress-text');
    const progressBar = panel.querySelector('.progress-bar-fill');
    
    if (progressText && progressBar) {
      if (progress.total === 0) {
        progressText.innerHTML = '今天没有需要打卡的习惯哦 ☕';
        progressBar.style.width = '0%';
      } else {
        progressText.innerHTML = `今日已达成 <strong>${progress.completed}</strong> / ${progress.total} (${progress.percent}%)`;
        progressBar.style.width = `${progress.percent}%`;
      }
    }

    // 3. 渲染习惯卡片列表
    const habitsContainer = panel.querySelector('.today-habits-list');
    if (!habitsContainer) return;

    const dateStr = AppCore.getLocalDateString(selectedDate);
    const activeHabits = AppCore.getHabitsForDate(selectedDate);

    if (activeHabits.length === 0) {
      habitsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏖️</div>
          <p>这一天没有安排习惯打卡~</p>
          <button class="btn btn-primary btn-sm" id="btn-empty-add-habit">添加新习惯</button>
        </div>
      `;
      const btnEmptyAdd = document.getElementById('btn-empty-add-habit');
      if (btnEmptyAdd) {
        btnEmptyAdd.addEventListener('click', () => {
          this.openHabitModal();
        });
      }
      return;
    }

    // 渲染卡片
    habitsContainer.innerHTML = '';
    activeHabits.forEach(habit => {
      const isDone = Storage.isCompleted(dateStr, habit.id);
      const stats = AppCore.getHabitStats(habit.id);
      const streak = stats ? stats.currentStreak : 0;

      const card = document.createElement('div');
      card.className = `habit-card ${isDone ? 'completed' : ''}`;
      card.style.setProperty('--theme-color', habit.color);
      card.style.setProperty('--theme-bg', habit.bgColor);

      card.innerHTML = `
        <div class="habit-card-left">
          <div class="habit-card-icon" style="background-color: ${habit.color}1E; color: ${habit.color}">
            ${habit.icon}
          </div>
          <div class="habit-card-info">
            <h3 class="habit-card-name">${habit.name}</h3>
            <p class="habit-card-slogan">${habit.slogan || '坚持就是胜利！'}</p>
            ${streak > 0 ? `<span class="habit-card-streak">🔥 连续 ${streak} 天</span>` : ''}
          </div>
        </div>
        <div class="habit-card-right">
          <button class="btn-checkin" aria-label="打卡按钮">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      `;

      // 绑定打卡点击事件
      const checkinBtn = card.querySelector('.btn-checkin');
      checkinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleCheckInToggle(habit, dateStr, card);
      });

      // 允许点击整个卡片进行打卡
      card.addEventListener('click', () => {
        this.handleCheckInToggle(habit, dateStr, card);
      });

      habitsContainer.appendChild(card);
    });
  },

  /**
   * 处理打卡状态切换
   */
  handleCheckInToggle(habit, dateStr, cardElement) {
    const isNowChecked = Storage.toggleCheckIn(dateStr, habit.id);
    
    if (isNowChecked) {
      cardElement.classList.add('completed');
      
      // 触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }

      // 播放打卡音效
      const settings = Storage.getSettings();
      if (settings.soundEnabled) {
        this.playSuccessSound();
      }

      // 粒子效果
      if (settings.checkinAnimation === 'confetti') {
        const rect = cardElement.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;
        this.createConfetti(originX, originY);
      }
    } else {
      cardElement.classList.remove('completed');
    }

    // 更新今日进度条
    const progress = AppCore.getTodayProgress();
    const panel = document.getElementById('panel-today');
    const progressText = panel.querySelector('.progress-text');
    const progressBar = panel.querySelector('.progress-bar-fill');
    if (progressText && progressBar) {
      progressText.innerHTML = `今日已达成 <strong>${progress.completed}</strong> / ${progress.total} (${progress.percent}%)`;
      progressBar.style.width = `${progress.percent}%`;
    }

    // 局部更新卡片内的 streak 数据
    const stats = AppCore.getHabitStats(habit.id);
    const streak = stats ? stats.currentStreak : 0;
    const streakEl = cardElement.querySelector('.habit-card-streak');
    if (streakEl) {
      if (streak > 0) {
        streakEl.textContent = `🔥 连续 ${streak} 天`;
      } else {
        streakEl.remove();
      }
    } else if (streak > 0) {
      const infoEl = cardElement.querySelector('.habit-card-info');
      const newStreakEl = document.createElement('span');
      newStreakEl.className = 'habit-card-streak';
      newStreakEl.textContent = `🔥 连续 ${streak} 天`;
      infoEl.appendChild(newStreakEl);
    }
  },

  /**
   * 播放打卡音效（使用 Web Audio API 合成可爱的泡泡声，无需加载音频文件，100% 离线支持）
   */
  playSuccessSound() {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioCtx = new AudioContext();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const ctx = audioCtx;
      
      // 第一个频率：低沉的波形
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(400, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.16);

      // 第二个频率：短而清脆的谐波
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
        
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        
        osc2.start();
        osc2.stop(ctx.currentTime + 0.13);
      }, 60);

    } catch (e) {
      console.warn('Audio Context not allowed or supported', e);
    }
  },

  /**
   * 渲染顶部 iOS 周历
   */
  renderWeekCalendar() {
    const calendarContainer = document.querySelector('.week-days-container');
    if (!calendarContainer) return;

    calendarContainer.innerHTML = '';
    
    // 我们渲染当前选中日期所在的周，或者前后几天。
    // 为了更好的 iOS 体验，我们渲染“今天”及前后各 3 天，共 7 天。
    const today = new Date();
    const daysToShow = 7;
    const startDay = new Date(selectedDate);
    startDay.setDate(startDay.getDate() - 3); // 往前数 3 天

    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

    for (let i = 0; i < daysToShow; i++) {
      const currentDay = new Date(startDay);
      currentDay.setDate(startDay.getDate() + i);

      const isSelected = AppCore.getLocalDateString(currentDay) === AppCore.getLocalDateString(selectedDate);
      const isRealToday = AppCore.getLocalDateString(currentDay) === AppCore.getLocalDateString(today);
      
      const dayEl = document.createElement('div');
      dayEl.className = `calendar-day ${isSelected ? 'selected' : ''} ${isRealToday ? 'is-today' : ''}`;
      
      dayEl.innerHTML = `
        <span class="day-name">${weekdayNames[currentDay.getDay()]}</span>
        <span class="day-number">${currentDay.getDate()}</span>
      `;

      dayEl.addEventListener('click', () => {
        selectedDate = currentDay;
        this.renderTodayTab();
      });

      calendarContainer.appendChild(dayEl);
    }
  },

  /**
   * 统计页 - 渲染
   */
  renderStatsTab() {
    const panel = document.getElementById('panel-stats');
    
    // 1. 渲染全局大盘卡片
    const globalStats = AppCore.getGlobalStats();
    panel.querySelector('#stat-total-habits').textContent = globalStats.totalHabits;
    panel.querySelector('#stat-total-checkins').textContent = globalStats.totalCheckins;
    panel.querySelector('#stat-max-streak').textContent = `${globalStats.maxStreak}天`;
    panel.querySelector('#stat-max-streak-habit').textContent = globalStats.maxStreakHabit;

    // 2. 渲染习惯下拉列表供查看详细统计
    const habits = Storage.getHabits();
    const selector = panel.querySelector('#stats-habit-select');
    if (selector) {
      const lastSelectedValue = selector.value;
      selector.innerHTML = '';
      
      if (habits.length === 0) {
        selector.innerHTML = '<option value="">请先添加习惯</option>';
        panel.querySelector('.habit-details-card').style.display = 'none';
      } else {
        panel.querySelector('.habit-details-card').style.display = 'block';
        habits.forEach(h => {
          const opt = document.createElement('option');
          opt.value = h.id;
          opt.textContent = `${h.icon} ${h.name}`;
          selector.appendChild(opt);
        });

        // 还原上一次选择，或者默认选择第一个
        if (lastSelectedValue && habits.some(h => h.id === lastSelectedValue)) {
          selector.value = lastSelectedValue;
        } else {
          selector.value = habits[0].id;
        }
      }
    }

    // 3. 渲染单个习惯的打卡统计与近期记录
    this.renderSelectedHabitStats();
  },

  /**
   * 渲染选定习惯的具体细节及日历图
   */
  renderSelectedHabitStats() {
    const panel = document.getElementById('panel-stats');
    const selector = panel.querySelector('#stats-habit-select');
    if (!selector || !selector.value) return;

    const habitId = selector.value;
    const habits = Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const stats = AppCore.getHabitStats(habitId);
    if (!stats) return;

    // 渲染卡片基础信息
    const detailCard = panel.querySelector('.habit-details-card');
    detailCard.style.setProperty('--theme-color', habit.color);
    detailCard.style.setProperty('--theme-bg', habit.bgColor);



    // 渲染近期打卡记录网格
    const calendarGrid = detailCard.querySelector('.calendar-month-grid');
    const calendarMonthTitle = detailCard.querySelector('.calendar-month-title');
    if (!calendarGrid) return;

    const rangeSelector = panel.querySelector('#stats-range-select');
    const range = rangeSelector ? parseInt(rangeSelector.value) : 30;

    // 动态计算列数以自适应紧凑的网格显示
    let columns = 7;
    if (range === 7) columns = 7;
    else if (range === 30) columns = 6;
    else if (range === 100) columns = 10;

    calendarGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    calendarGrid.innerHTML = '';
    calendarMonthTitle.textContent = `近期 ${range} 天打卡记录`;

    // 生成最近 range 天的日期数组 (从 range-1 天前到今天)
    const dates = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    // 渲染网格
    dates.forEach(d => {
      const dateStr = AppCore.getLocalDateString(d);
      const isDone = stats.history.includes(dateStr);
      const isActive = AppCore.isHabitActiveOnDate(habit, d);
      const isToday = dateStr === AppCore.getLocalDateString(new Date());

      const el = document.createElement('div');
      el.className = `calendar-grid-day ${isDone ? 'completed' : ''} ${isActive ? 'active' : 'inactive'} ${isToday ? 'is-today' : ''}`;
      
      const dayNum = d.getDate();
      const displayText = dayNum === 1 ? `${d.getMonth() + 1}/${dayNum}` : `${dayNum}`;

      if (isDone) {
        el.style.backgroundColor = habit.color;
        el.style.color = '#FFFFFF';
        el.innerHTML = '<span class="check-mark">✓</span>';
      } else {
        el.innerHTML = `<span>${displayText}</span>`;
      }
      
      el.title = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      calendarGrid.appendChild(el);
    });
  },


  /**
   * 习惯管理页 - 渲染
   */
  renderHabitsTab() {
    const panel = document.getElementById('panel-settings');
    const habitsList = panel.querySelector('.manage-habits-list');
    if (!habitsList) return;

    const habits = Storage.getHabits();
    
    if (habits.length === 0) {
      habitsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✍️</div>
          <p>还没有添加任何习惯，快点开始吧！</p>
        </div>
      `;
      return;
    }

    habitsList.innerHTML = '';
    habits.forEach(h => {
      const item = document.createElement('div');
      item.className = 'manage-habit-item';
      item.style.setProperty('--theme-color', h.color);
      
      // 频次文本解释
      let freqText = '每天';
      if (h.frequency === 'weekdays') freqText = '工作日';
      else if (h.frequency === 'weekends') freqText = '周末';
      else if (Array.isArray(h.frequency)) {
        const weekNames = { '1':'周一', '2':'周二', '3':'周三', '4':'周四', '5':'周五', '6':'周六', '7':'周日' };
        freqText = h.frequency.map(d => weekNames[d]).join('、');
      }

      item.innerHTML = `
        <div class="manage-habit-left">
          <div class="manage-habit-icon" style="background-color: ${h.color}18; color: ${h.color}">
            ${h.icon}
          </div>
          <div class="manage-habit-meta">
            <h4>${h.name}</h4>
            <p>📅 ${freqText} · ⏰ ${h.reminders && h.reminders.length > 0 ? h.reminders.join(', ') : '未设提醒'}</p>
          </div>
        </div>
        <div class="manage-habit-right">
          <button class="btn btn-secondary btn-icon btn-sm btn-edit-habit" data-id="${h.id}" aria-label="编辑">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
          </button>
          <button class="btn btn-danger btn-icon btn-sm btn-delete-habit" data-id="${h.id}" aria-label="删除">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // 绑定编辑事件
      item.querySelector('.btn-edit-habit').addEventListener('click', () => {
        this.openHabitModal(h.id);
      });

      // 绑定删除事件
      item.querySelector('.btn-delete-habit').addEventListener('click', () => {
        if (confirm(`确定要删除“${h.name}”习惯吗？这会同时删除该习惯的所有打卡记录且不可恢复！`)) {
          Storage.deleteHabit(h.id);
          this.render();
        }
      });

      habitsList.appendChild(item);
    });
  },

  /**
   * 设置页 - 渲染
   */
  renderSettingsTab() {
    const panel = document.getElementById('panel-settings');
    const settings = Storage.getSettings();

    // 恢复当前的设置状态到表单中
    const selectTheme = panel.querySelector('#settings-theme');
    if (selectTheme) selectTheme.value = settings.theme;

    const checkboxSound = panel.querySelector('#settings-sound');
    if (checkboxSound) checkboxSound.checked = settings.soundEnabled;

    const selectAnim = panel.querySelector('#settings-anim');
    if (selectAnim) selectAnim.value = settings.checkinAnimation;

    // 渲染嵌入在设置中的习惯管理列表
    this.renderHabitsTab();
  },

  /**
   * 习惯弹窗操作事件绑定 (新增/修改)
   */
  bindHabitModalEvents() {
    const modal = document.getElementById('modal-habit');
    const btnAddSettings = document.getElementById('btn-settings-add-habit');
    const btnAddHeader = document.getElementById('btn-add-habit');
    const btnClose = modal.querySelector('.modal-close');
    const btnCancel = modal.querySelector('#btn-habit-cancel');
    const form = modal.querySelector('#form-habit');

    const handleAddClick = (e) => {
      if (e) e.preventDefault();
      this.openHabitModal();
    };

    // 打开新建弹窗（绑定多个可能存在的按钮，保证高容错性）
    if (btnAddSettings) {
      btnAddSettings.addEventListener('click', handleAddClick);
    }
    if (btnAddHeader) {
      btnAddHeader.addEventListener('click', handleAddClick);
    }

    // 关闭弹窗
    const closeModalFn = () => {
      modal.classList.remove('active');
    };
    if (btnClose) btnClose.addEventListener('click', closeModalFn);
    if (btnCancel) btnCancel.addEventListener('click', closeModalFn);

    // 选中表情网格点击事件
    const emojiGrid = modal.querySelector('.modal-emoji-grid');
    if (emojiGrid) {
      emojiGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.emoji-item');
        if (item) {
          modal.querySelectorAll('.emoji-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
      });
    }

    // 颜色网格点击事件
    const colorGrid = modal.querySelector('.modal-color-grid');
    if (colorGrid) {
      colorGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.color-item');
        if (item) {
          modal.querySelectorAll('.color-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
      });
    }

    // 频次快速选择切换显示自定义星期选择器
    const selectFreq = modal.querySelector('#habit-frequency');
    const customFreqBox = modal.querySelector('.custom-freq-days');
    if (selectFreq && customFreqBox) {
      selectFreq.addEventListener('change', () => {
        if (selectFreq.value === 'custom') {
          customFreqBox.style.display = 'flex';
        } else {
          customFreqBox.style.display = 'none';
        }
      });
    }

    // 字数计数器实时更新
    const nameInput = modal.querySelector('#habit-name');
    const sloganInput = modal.querySelector('#habit-slogan');
    if (nameInput) {
      nameInput.addEventListener('input', () => this.updateCharCounts());
    }
    if (sloganInput) {
      sloganInput.addEventListener('input', () => this.updateCharCounts());
    }

    // 提交表单处理
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const habitId = modal.getAttribute('data-edit-id');
        const name = modal.querySelector('#habit-name').value.trim();
        const slogan = modal.querySelector('#habit-slogan').value.trim();
        const selectedEmojiEl = modal.querySelector('.emoji-item.selected');
        const selectedColorEl = modal.querySelector('.color-item.selected');
        const reminderTime = modal.querySelector('#habit-reminder').value;

        if (!name) {
          alert('请输入习惯名称');
          return;
        }

        const icon = selectedEmojiEl ? selectedEmojiEl.textContent : '📝';
        const color = selectedColorEl ? selectedColorEl.getAttribute('data-color') : '#FF8E94';
        const bgColor = selectedColorEl ? selectedColorEl.getAttribute('data-bg') : '#FFF0F1';

        // 解析频次
        let frequency = selectFreq.value;
        if (frequency === 'custom') {
          frequency = [];
          modal.querySelectorAll('.custom-freq-days input[type="checkbox"]:checked').forEach(cb => {
            frequency.push(cb.value);
          });
          if (frequency.length === 0) {
            alert('请至少选择一天来进行自定义打卡频次');
            return;
          }
        }

        // 解析提醒时间
        const reminders = reminderTime ? [reminderTime] : [];

        const habitData = {
          name,
          slogan,
          icon,
          color,
          bgColor,
          frequency,
          reminders
        };

        if (habitId) {
          // 修改
          Storage.updateHabit({ id: habitId, ...habitData });
        } else {
          // 新增
          Storage.addHabit(habitData);
        }

        modal.classList.remove('active');
        this.render();
      });
    }
  },

  /**
   * 更新字数计数器
   */
  updateCharCounts() {
    const modal = document.getElementById('modal-habit');
    const nameInput = modal.querySelector('#habit-name');
    const sloganInput = modal.querySelector('#habit-slogan');
    const nameCount = modal.querySelector('#habit-name + .char-count');
    const sloganCount = modal.querySelector('#habit-slogan + .char-count');

    if (nameInput && nameCount) {
      nameCount.textContent = `${nameInput.value.length}/10`;
    }
    if (sloganInput && sloganCount) {
      sloganCount.textContent = `${sloganInput.value.length}/25`;
    }
  },

  /**
   * 打开习惯编辑/新建弹窗
   */
  openHabitModal(habitId = null) {
    const modal = document.getElementById('modal-habit');
    const form = modal.querySelector('#form-habit');
    const modalTitle = modal.querySelector('.modal-title');
    const selectFreq = modal.querySelector('#habit-frequency');
    const customFreqBox = modal.querySelector('.custom-freq-days');

    modal.removeAttribute('data-edit-id');

    form.reset();
    this.updateCharCounts();

    // 预设高亮第一个表情和第一个颜色
    modal.querySelectorAll('.emoji-item').forEach(i => i.classList.remove('selected'));
    modal.querySelector('.emoji-item').classList.add('selected');

    modal.querySelectorAll('.color-item').forEach(i => i.classList.remove('selected'));
    modal.querySelector('.color-item').classList.add('selected');

    customFreqBox.style.display = 'none';

    if (habitId) {
      // 编辑模式
      modal.setAttribute('data-edit-id', habitId);
      modalTitle.textContent = '编辑习惯';
      
      const habits = Storage.getHabits();
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        modal.querySelector('#habit-name').value = habit.name;
        modal.querySelector('#habit-slogan').value = habit.slogan || '';
        
        // 匹配表情
        modal.querySelectorAll('.emoji-item').forEach(el => {
          if (el.textContent === habit.icon) {
            modal.querySelectorAll('.emoji-item').forEach(i => i.classList.remove('selected'));
            el.classList.add('selected');
          }
        });

        // 匹配颜色
        modal.querySelectorAll('.color-item').forEach(el => {
          if (el.getAttribute('data-color') === habit.color) {
            modal.querySelectorAll('.color-item').forEach(i => i.classList.remove('selected'));
            el.classList.add('selected');
          }
        });

        // 匹配频次
        if (Array.isArray(habit.frequency)) {
          selectFreq.value = 'custom';
          customFreqBox.style.display = 'flex';
          
          // 清除勾选，然后按数据重新勾选
          modal.querySelectorAll('.custom-freq-days input[type="checkbox"]').forEach(cb => {
            cb.checked = habit.frequency.includes(cb.value);
          });
        } else {
          selectFreq.value = habit.frequency || 'daily';
          customFreqBox.style.display = 'none';
        }

        // 匹配提醒时间
        if (habit.reminders && habit.reminders.length > 0) {
          modal.querySelector('#habit-reminder').value = habit.reminders[0];
        } else {
          modal.querySelector('#habit-reminder').value = '';
        }
      }

      this.updateCharCounts();
    } else {
      // 新建模式
      modalTitle.textContent = '新建习惯';
      selectFreq.value = 'daily';
      customFreqBox.style.display = 'none';
      modal.querySelectorAll('.custom-freq-days input[type="checkbox"]').forEach(cb => {
        cb.checked = true; // 默认自定义全选
      });
    }

    modal.classList.add('active');
  },

  /**
   * 设置页面的各种事件绑定
   */
  bindSettingsEvents() {
    const panel = document.getElementById('panel-settings');
    
    // 主题切换
    panel.querySelector('#settings-theme').addEventListener('change', (e) => {
      Storage.saveSettings({ theme: e.target.value });
      this.applyTheme();
    });

    // 声音切换
    panel.querySelector('#settings-sound').addEventListener('change', (e) => {
      Storage.saveSettings({ soundEnabled: e.target.checked });
    });

    // 动画切换
    panel.querySelector('#settings-anim').addEventListener('change', (e) => {
      Storage.saveSettings({ checkinAnimation: e.target.value });
    });

    // 数据导出
    panel.querySelector('#btn-data-export').addEventListener('click', () => {
      const dataStr = Storage.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `everyday_backup_${AppCore.getLocalDateString(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    // 数据导入
    panel.querySelector('#btn-data-import').addEventListener('click', () => {
      panel.querySelector('#file-import-input').click();
    });

    panel.querySelector('#file-import-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = Storage.importData(event.target.result);
        if (result.success) {
          alert('数据导入成功！页面即将刷新。');
          window.location.reload();
        } else {
          alert(`导入失败：${result.error}`);
        }
      };
      reader.readAsText(file);
    });

    // 数据清空
    panel.querySelector('#btn-data-clear').addEventListener('click', () => {
      if (confirm('警告：此操作将彻底删除所有习惯和历史打卡数据，恢复到初始默认状态！确认继续？')) {
        Storage.clearAll();
        alert('数据已重置。');
        window.location.reload();
      }
    });

    // 统计页面的习惯和时间范围切换监听
    const statsSelector = document.getElementById('stats-habit-select');
    if (statsSelector) {
      statsSelector.addEventListener('change', () => {
        this.renderSelectedHabitStats();
      });
    }

    const rangeSelector = document.getElementById('stats-range-select');
    if (rangeSelector) {
      rangeSelector.addEventListener('change', () => {
        this.renderSelectedHabitStats();
      });
    }
  },

  /**
   * 创建粒子纸屑动效
   */
  createConfetti(x, y) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FF8E94', '#5AC8FA', '#4CE1B6', '#AF52DE', '#FFCC00', '#FF9500'];
    
    // 每次打卡释放 60 个粒子
    for (let i = 0; i < 60; i++) {
      confettiParticles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4, // 向上喷射
        radius: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.01,
        gravity: 0.3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }

    // 启动动画循环（如果当前没在跑）
    if (!confettiAnimationId) {
      this.animateConfetti();
    }
  },

  /**
   * 粒子纸屑物理动画循环
   */
  animateConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      p.rotation += p.rotationSpeed;

      // 绘制粒子 (斜角矩形)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
      ctx.restore();

      // 清除透明粒子
      if (p.alpha <= 0 || p.y > canvas.height) {
        confettiParticles.splice(i, 1);
      }
    }

    if (confettiParticles.length > 0) {
      confettiAnimationId = requestAnimationFrame(() => this.animateConfetti());
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiAnimationId = null;
    }
  }
};
