/**
 * 小日常 PWA - 核心业务逻辑及统计分析层
 */

import { Storage } from './storage.js';

export const AppCore = {
  /**
   * 判断某个日期是否是习惯的活跃日期
   * 习惯的频次设置：'daily' (每天), 'weekdays' (工作日), 'weekends' (周末), 或以逗号分隔的周几序号 ["1", "3", "5"]
   */
  isHabitActiveOnDate(habit, date) {
    const day = date.getDay(); // 0 = 周日, 1-6 = 周一到周六
    const dayStr = day === 0 ? '7' : day.toString(); // 转换为我们的星期表示：'1' - '7'
    
    // 如果日期早于习惯创建日期，则不活跃
    const habitDate = new Date(habit.createdAt);
    habitDate.setHours(0,0,0,0);
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);
    if (targetDate < habitDate) {
      return false;
    }

    if (!habit.frequency || habit.frequency === 'daily') {
      return true;
    }
    if (habit.frequency === 'weekdays') {
      return day >= 1 && day <= 5;
    }
    if (habit.frequency === 'weekends') {
      return day === 0 || day === 6;
    }
    if (Array.isArray(habit.frequency)) {
      return habit.frequency.includes(dayStr);
    }
    return true;
  },

  /**
   * 获取某天所有应该打卡的习惯列表
   */
  getHabitsForDate(date) {
    const habits = Storage.getHabits();
    return habits.filter(habit => this.isHabitActiveOnDate(habit, date));
  },

  /**
   * 计算指定习惯的打卡统计数据
   */
  getHabitStats(habitId) {
    const habits = Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return null;

    const records = Storage.getRecords();
    const checkinDates = []; // 这个习惯所有打卡的日期数组，已排序 ["2026-05-20", "2026-05-21"]

    // 收集所有打卡此习惯的日期
    for (const dateStr in records) {
      if (records[dateStr].includes(habitId)) {
        checkinDates.push(dateStr);
      }
    }
    
    // 按日期正序排列
    checkinDates.sort((a, b) => new Date(a) - new Date(b));

    const totalCheckins = checkinDates.length;
    
    // 计算当前连续打卡（Current Streak）和最长连续打卡（Max Streak）
    let currentStreak = 0;
    let maxStreak = 0;

    if (totalCheckins > 0) {
      const todayStr = this.getLocalDateString(new Date());
      const yesterdayStr = this.getLocalDateString(new Date(Date.now() - 3600 * 24 * 1000));
      
      // 判断今天或昨天是否打卡了。如果今天或昨天都没打卡，当前 Streak 归零。
      const hasCheckedToday = checkinDates.includes(todayStr);
      const hasCheckedYesterday = checkinDates.includes(yesterdayStr);

      if (hasCheckedToday || hasCheckedYesterday) {
        // 从打卡的最后一天往前倒推计算连续天数
        let checkDate = hasCheckedToday ? new Date() : new Date(Date.now() - 3600 * 24 * 1000);
        let activeStreak = 0;
        
        while (true) {
          const checkStr = this.getLocalDateString(checkDate);
          
          // 如果该天打卡了，继续往前推算
          if (checkinDates.includes(checkStr)) {
            activeStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            // 如果该天没打卡，但如果根据习惯频次，该天习惯本来就“不活跃”，那么连续打卡不应该中断！
            // 比如习惯是“工作日打卡”，周六周日没打，周一打，那么周一依然算连续！
            if (!this.isHabitActiveOnDate(habit, checkDate)) {
              // 不活跃的一天，不中断 streak，直接跳过到前一天
              checkDate.setDate(checkDate.getDate() - 1);
              
              // 安全保护，防止在习惯创建日期之前无限循环
              const habitStart = new Date(habit.createdAt);
              habitStart.setHours(0,0,0,0);
              if (checkDate < habitStart) {
                break;
              }
            } else {
              // 活跃但没打卡，中断！
              break;
            }
          }
        }
        currentStreak = activeStreak;
      }

      // 计算历史最长连续打卡 (忽略频次限制，计算物理上连续的最长 checkin 天数序列)
      let tempStreak = 0;
      let prevTime = null;

      for (let i = 0; i < checkinDates.length; i++) {
        const currDate = new Date(checkinDates[i]);
        currDate.setHours(0,0,0,0);

        if (prevTime === null) {
          tempStreak = 1;
        } else {
          const diffDays = Math.round((currDate - prevTime) / (3600 * 24 * 1000));
          
          if (diffDays === 1) {
            // 物理上连续的一天
            tempStreak++;
          } else if (diffDays > 1) {
            // 物理上不连续，我们要看这期间不连续的每一天是否都是“非活跃天”。
            // 如果都是非活跃天，依然算作连续！
            let isContinuous = true;
            let checkD = new Date(prevTime);
            checkD.setDate(checkD.getDate() + 1);

            while (checkD < currDate) {
              if (this.isHabitActiveOnDate(habit, checkD)) {
                isContinuous = false;
                break;
              }
              checkD.setDate(checkD.getDate() + 1);
            }

            if (isContinuous) {
              tempStreak++;
            } else {
              if (tempStreak > maxStreak) {
                maxStreak = tempStreak;
              }
              tempStreak = 1;
            }
          }
        }
        prevTime = currDate;
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }

    return {
      totalCheckins,
      currentStreak,
      maxStreak,
      history: checkinDates
    };
  },

  /**
   * 获取今日打卡概览进度（今日完成习惯数 / 今日总活跃习惯数）
   */
  getTodayProgress() {
    const today = new Date();
    const todayStr = this.getLocalDateString(today);
    const activeHabits = this.getHabitsForDate(today);
    const records = Storage.getRecords();
    const todayChecked = records[todayStr] || [];

    if (activeHabits.length === 0) return { percent: 100, completed: 0, total: 0 };

    let completedCount = 0;
    activeHabits.forEach(h => {
      if (todayChecked.includes(h.id)) {
        completedCount++;
      }
    });

    return {
      percent: Math.round((completedCount / activeHabits.length) * 100),
      completed: completedCount,
      total: activeHabits.length
    };
  },

  /**
   * 计算全局大盘统计
   */
  getGlobalStats() {
    const habits = Storage.getHabits();
    const records = Storage.getRecords();
    
    let totalCheckinsCount = 0;
    for (const date in records) {
      totalCheckinsCount += records[date].length;
    }

    // 计算最长连续打卡习惯
    let highestStreak = 0;
    let highestStreakHabit = null;
    habits.forEach(h => {
      const stats = this.getHabitStats(h.id);
      if (stats && stats.currentStreak > highestStreak) {
        highestStreak = stats.currentStreak;
        highestStreakHabit = h.name;
      }
    });

    return {
      totalHabits: habits.length,
      totalCheckins: totalCheckinsCount,
      maxStreak: highestStreak,
      maxStreakHabit: highestStreakHabit || '无'
    };
  },

  /**
   * 计算本周完成率：本周已打卡次数 / 本周应打卡次数
   */
  getWeeklyCompletion() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1-6=Mon-Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const habits = Storage.getHabits();
    const records = Storage.getRecords();

    let totalExpected = 0;
    let totalCompleted = 0;
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      if (date > end) break;

      const dateStr = this.getLocalDateString(date);
      const activeHabits = habits.filter(h => this.isHabitActiveOnDate(h, date));
      const checkedIn = records[dateStr] || [];

      totalExpected += activeHabits.length;
      for (const h of activeHabits) {
        if (checkedIn.includes(h.id)) totalCompleted++;
      }
    }

    return {
      completed: totalCompleted,
      total: totalExpected,
      percent: totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0
    };
  },

  /**
   * 获取所有成就徽章的状态
   */
  getBadges() {
    const habits = Storage.getHabits();
    const records = Storage.getRecords();
    const globalStats = this.getGlobalStats();

    // 定义所有的徽章及解锁条件
    const badges = [
      {
        id: 'first_step',
        name: '初露锋芒',
        desc: '任意习惯累计打卡 3 次',
        icon: '🌱',
        color: '#E0F2FE',
        textColor: '#0284C7',
        isUnlocked: false
      },
      {
        id: 'week_star',
        name: '自律新星',
        desc: '任意习惯连续打卡 7 天',
        icon: '⭐',
        color: '#FEF9C3',
        textColor: '#CA8A04',
        isUnlocked: false
      },
      {
        id: 'habit_21',
        name: '二十一天',
        desc: '任意习惯连续打卡达到 21 天',
        icon: '🏆',
        color: '#FEE2E2',
        textColor: '#DC2626',
        isUnlocked: false
      },
      {
        id: 'water_master',
        name: '水力全开',
        desc: '“八杯开水”累计打卡达 15 次',
        icon: '🐳',
        color: '#E0F2FE',
        textColor: '#0369A1',
        isUnlocked: false
      },
      {
        id: 'book_worm',
        name: '书香门第',
        desc: '“静心阅读”累计打卡达 15 次',
        icon: '📚',
        color: '#F3E8FF',
        textColor: '#7E22CE',
        isUnlocked: false
      },
      {
        id: 'marathon',
        name: '习惯达人',
        desc: '所有习惯历史总打卡达 100 次',
        icon: '👑',
        color: '#FFedd5',
        textColor: '#D97706',
        isUnlocked: false
      }
    ];

    // 检测解锁条件
    let anyHabitMaxStreak = 0;
    let anyHabitTotalCheckins = 0;
    let waterCheckins = 0;
    let bookCheckins = 0;

    habits.forEach(h => {
      const stats = this.getHabitStats(h.id);
      if (stats) {
        if (stats.maxStreak > anyHabitMaxStreak) {
          anyHabitMaxStreak = stats.maxStreak;
        }
        if (stats.totalCheckins > anyHabitTotalCheckins) {
          anyHabitTotalCheckins = stats.totalCheckins;
        }
        if (h.name.includes('水') || h.name.includes('喝水')) {
          waterCheckins += stats.totalCheckins;
        }
        if (h.name.includes('阅读') || h.name.includes('书') || h.name.includes('看书')) {
          bookCheckins += stats.totalCheckins;
        }
      }
    });

    badges.forEach(b => {
      if (b.id === 'first_step' && anyHabitTotalCheckins >= 3) b.isUnlocked = true;
      if (b.id === 'week_star' && anyHabitMaxStreak >= 7) b.isUnlocked = true;
      if (b.id === 'habit_21' && anyHabitMaxStreak >= 21) b.isUnlocked = true;
      if (b.id === 'water_master' && waterCheckins >= 15) b.isUnlocked = true;
      if (b.id === 'book_worm' && bookCheckins >= 15) b.isUnlocked = true;
      if (b.id === 'marathon' && globalStats.totalCheckins >= 100) b.isUnlocked = true;
    });

    return badges;
  },

  /**
   * 格式化 Date 为本地字符串 "YYYY-MM-DD"
   */
  getLocalDateString(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }
};
