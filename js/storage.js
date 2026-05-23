/**
 * 小日常 PWA - LocalStorage 数据持久化层
 */

const STORAGE_KEYS = {
  HABITS: 'everyday_habits',
  RECORDS: 'everyday_records',
  SETTINGS: 'everyday_settings'
};

// 预设的默认习惯
const DEFAULT_HABITS = [
  {
    id: 'habit_default_1',
    name: '晨间起立',
    icon: '🌅',
    color: '#FF8E94', // 珊瑚粉
    bgColor: '#FFF0F1',
    slogan: '一日之计在于晨，今天也要元气满满！',
    frequency: 'daily',
    reminders: ['07:00'],
    createdAt: Date.now() - 3600 * 24 * 5 * 1000 // 5天前
  },
  {
    id: 'habit_default_2',
    name: '八杯开水',
    icon: '🥛',
    color: '#5AC8FA', // 天空蓝
    bgColor: '#E6F5FC',
    slogan: '水是生命之源，喝出健康好皮肤。',
    frequency: 'daily',
    reminders: ['10:00', '15:00', '20:00'],
    createdAt: Date.now() - 3600 * 24 * 5 * 1000
  },
  {
    id: 'habit_default_3',
    name: '静心阅读',
    icon: '📖',
    color: '#AF52DE', // 罗兰紫
    bgColor: '#F7EFFF',
    slogan: '读书是门槛最低的高贵举动。',
    frequency: 'daily',
    reminders: ['21:30'],
    createdAt: Date.now() - 3600 * 24 * 5 * 1000
  },
  {
    id: 'habit_default_4',
    name: '日落夜跑',
    icon: '🏃',
    color: '#4CE1B6', // 薄荷绿
    bgColor: '#EBF9F5',
    slogan: '奔跑的时候，风也是自由的。',
    frequency: 'daily',
    reminders: ['19:30'],
    createdAt: Date.now() - 3600 * 24 * 5 * 1000
  }
];

const DEFAULT_SETTINGS = {
  theme: 'auto', // auto, light, dark
  soundEnabled: true,
  checkinAnimation: 'confetti' // confetti, scale, none
};

// 辅助方法：深拷贝
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export const Storage = {
  /**
   * 初始化存储数据
   */
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.HABITS)) {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(DEFAULT_HABITS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
      // 预先生成一些默认打卡记录，让统计页面一开始就具有展示性
      const records = {};
      const today = new Date();
      
      // 为默认习惯随机生成一些过去的打卡数据 (前4天)
      for (let i = 1; i <= 4; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        records[dateStr] = [];
        
        // 随机让某些习惯在某些天打卡
        if (Math.random() > 0.3) records[dateStr].push('habit_default_1');
        if (Math.random() > 0.2) records[dateStr].push('habit_default_2');
        if (Math.random() > 0.4) records[dateStr].push('habit_default_3');
        if (Math.random() > 0.3) records[dateStr].push('habit_default_4');
      }
      
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
  },

  /**
   * 获取所有习惯
   */
  getHabits() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.HABITS)) || [];
    } catch (e) {
      console.error('Error parsing habits', e);
      return [];
    }
  },

  /**
   * 保存所有习惯
   */
  saveHabits(habits) {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
  },

  /**
   * 添加单个习惯
   */
  addHabit(habit) {
    const habits = this.getHabits();
    const newHabit = {
      id: 'habit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: Date.now(),
      ...habit
    };
    habits.push(newHabit);
    this.saveHabits(habits);
    return newHabit;
  },

  /**
   * 更新习惯
   */
  updateHabit(updatedHabit) {
    const habits = this.getHabits();
    const index = habits.findIndex(h => h.id === updatedHabit.id);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updatedHabit };
      this.saveHabits(habits);
      return true;
    }
    return false;
  },

  /**
   * 删除习惯，并清除它的所有打卡历史（或者保留历史，只在习惯列表中移除。这里采用直接彻底移除，并在打卡历史中清除）
   */
  deleteHabit(id) {
    let habits = this.getHabits();
    habits = habits.filter(h => h.id !== id);
    this.saveHabits(habits);

    // 清理打卡历史中的此 ID 占位
    const records = this.getRecords();
    let changed = false;
    for (const date in records) {
      if (records[date].includes(id)) {
        records[date] = records[date].filter(hid => hid !== id);
        changed = true;
      }
    }
    if (changed) {
      this.saveRecords(records);
    }
  },

  /**
   * 获取所有打卡记录
   */
  getRecords() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS)) || {};
    } catch (e) {
      console.error('Error parsing records', e);
      return {};
    }
  },

  /**
   * 保存打卡记录
   */
  saveRecords(records) {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  },

  /**
   * 切换某个日期对某个习惯的打卡状态
   * @param {string} dateStr "YYYY-MM-DD"
   * @param {string} habitId 
   */
  toggleCheckIn(dateStr, habitId) {
    const records = this.getRecords();
    if (!records[dateStr]) {
      records[dateStr] = [];
    }

    const index = records[dateStr].indexOf(habitId);
    let isChecked = false;
    if (index === -1) {
      records[dateStr].push(habitId);
      isChecked = true;
    } else {
      records[dateStr].splice(index, 1);
      isChecked = false;
    }

    // 如果该天没有记录，就删掉该日期的 Key
    if (records[dateStr].length === 0) {
      delete records[dateStr];
    }

    this.saveRecords(records);
    return isChecked;
  },

  /**
   * 查询某天是否已打卡
   */
  isCompleted(dateStr, habitId) {
    const records = this.getRecords();
    return !!(records[dateStr] && records[dateStr].includes(habitId));
  },

  /**
   * 获取设置项
   */
  getSettings() {
    this.init();
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * 保存设置项
   */
  saveSettings(settings) {
    const current = this.getSettings();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
  },

  /**
   * 导出全部数据为 JSON 字符串
   */
  exportData() {
    const data = {
      habits: this.getHabits(),
      records: this.getRecords(),
      settings: this.getSettings(),
      version: '1.0.0',
      exportTime: Date.now()
    };
    return JSON.stringify(data, null, 2);
  },

  /**
   * 从 JSON 字符串导入全部数据
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.habits) && typeof data.records === 'object') {
        localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(data.habits));
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(data.records));
        if (data.settings) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
        }
        return { success: true };
      }
      return { success: false, error: 'JSON 数据格式不正确' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * 清除全部数据恢复默认
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.HABITS);
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    this.init();
  }
};
